import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService }                 from '../services/auth/auth';
import { SessionExpiryOverlayService } from '../services/session-expiry-overlay';
import { ActiveFormRegistryService }   from '../services/active-form-registry';

/** Routes qui ne doivent JAMAIS déclencher le logout automatique */
const PUBLIC_URLS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Vérifie si le JWT local est réellement expiré (tolérance 10s).
 * Permet de distinguer un 403 métier (droits insuffisants)
 * d'un 403 dû à un token expiré côté Spring Security.
 */
function isTokenExpiredLocally(): boolean {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;
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

  // Attacher Bearer token à chaque requête
  const token = localStorage.getItem('token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isPublic = PUBLIC_URLS.some(u => req.url.includes(u));
      const isUnlock = req.url.includes('/auth/login') && auth.isLocked();

      if (!isPublic && !isUnlock) {
        if (err.status === 401) {
          // 401 = token absent/invalide → logout immédiat
          console.warn('[Interceptor] 401 → logout');
          formRegistry.saveAll();
          auth.forceLogout();
          overlayService.show();

        } else if (err.status === 403 && isTokenExpiredLocally()) {
          // 403 + token expiré localement = Spring retourne 403 pour token expiré
          console.warn('[Interceptor] 403 + token expiré → logout');
          formRegistry.saveAll();
          auth.forceLogout();
          overlayService.show();

        } else if (err.status === 403) {
          // 403 métier (ROLE insuffisant) → laisser le composant gérer
          console.warn('[Interceptor] 403 droits insuffisants sur', req.url);
        }
      }

      return throwError(() => err);
    })
  );
};