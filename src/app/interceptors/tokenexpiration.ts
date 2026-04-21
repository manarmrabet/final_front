import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService }                 from '../services/auth/auth';
import { SessionExpiryOverlayService } from '../services/session-expiry-overlay';
import { ActiveFormRegistryService }   from '../services/active-form-registry';

/**
 * Routes qui ne doivent JAMAIS déclencher le logout automatique.
 *
 * ✅ CORRIGÉ : ajout de '/api/auth/signin' et '/api/auth/logout'
 *
 * Pourquoi c'était buggué :
 *   PUBLIC_URLS ne contenait que '/auth/login' (route Angular frontend)
 *   mais pas '/api/auth/signin' (endpoint backend Spring).
 *   Résultat : un 403 "compte bloqué" depuis /api/auth/signin passait dans
 *   le bloc 403+isTokenExpiredLocally() → logout + overlay → boucle infinie.
 *
 * Règle : toute URL d'authentification backend doit figurer ici,
 * qu'elle retourne 401 ou 403, pour que SigninComponent gère seul ses erreurs.
 */
const PUBLIC_URLS = [
  '/auth/login',        // route Angular (inchangé)
  '/auth/register',     // route Angular (inchangé)
  '/auth/refresh',      // route Angular (inchangé)
  '/api/auth/signin',   // ✅ endpoint backend signin — 401/403 gérés par SigninComponent
  '/api/auth/logout',   // ✅ endpoint backend logout — erreurs non critiques
];

/**
 * Vérifie si le JWT local est réellement expiré (tolérance 10s).
 *
 * ✅ CORRIGÉ : retourne false si aucun token (évite un faux positif
 * qui déclenchait le logout alors que l'utilisateur n'était pas connecté).
 *
 * Cas sans token :
 *   - Ancienne version : return true  → 403 sans token = logout déclenché
 *   - Nouvelle version : return false → 403 sans token = on laisse passer
 *
 * C'est cohérent : si aucun token, il n'y a pas de session à invalider.
 */
function isTokenExpiredLocally(): boolean {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false; // ✅ CORRIGÉ : était "return true"
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp * 1000) - 10_000;
  } catch { return false; }
}

export const tokenExpirationInterceptor: HttpInterceptorFn = (req, next) => {
  const auth           = inject(AuthService);
  const overlayService = inject(SessionExpiryOverlayService);
  const formRegistry   = inject(ActiveFormRegistryService);

  // ── Attacher Bearer token à chaque requête ── inchangé ───────────────────
  const token   = localStorage.getItem('token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {

      // ✅ isPublic vérifie maintenant aussi les endpoints backend
      const isPublic = PUBLIC_URLS.some(u => req.url.includes(u));
      const isUnlock = req.url.includes('/api/auth/signin') && auth.isLocked();

      if (!isPublic && !isUnlock) {

        if (err.status === 401) {
          // 401 = token absent ou invalide → logout immédiat ── inchangé
          console.warn('[Interceptor] 401 → logout');
          formRegistry.saveAll();
          auth.forceLogout();
          overlayService.show();

        } else if (err.status === 403 && isTokenExpiredLocally()) {
          // 403 + token expiré localement → Spring a rejeté le token ── inchangé
          console.warn('[Interceptor] 403 + token expiré → logout');
          formRegistry.saveAll();
          auth.forceLogout();
          overlayService.show();

        } else if (err.status === 403) {
          // 403 métier (rôle insuffisant) → laisser le composant gérer ── inchangé
          console.warn('[Interceptor] 403 droits insuffisants sur', req.url);
        }
      }

      // Propager l'erreur dans tous les cas pour que les composants puissent réagir
      return throwError(() => err);
    })
  );
};
