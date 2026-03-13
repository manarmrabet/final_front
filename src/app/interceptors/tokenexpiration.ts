import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router }  from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth';

/**
 * Intercepte tous les 401 HTTP.
 *
 * Cas 1 — token expiré pendant navigation normale  → clearStorage + /login
 * Cas 2 — 401 sur /lock (unlock avec mauvais mdp)  → laisser passer (géré par le composant)
 */
export const tokenExpirationInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Attacher le token à chaque requête (Bearer)
  const token = localStorage.getItem('token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        const isUnlockAttempt = req.url.includes('/auth/login') && auth.isLocked();

        if (!isUnlockAttempt) {
          // Token vraiment expiré → déconnexion complète
          auth.clearStorage();
          auth.forceLogout();          // nouveau helper (voir auth.service.ts)
          router.navigate(['/login'], {
            queryParams: { reason: 'session_expired' }
          });
        }
        // Si c'est un unlock raté → throwError pour que le composant gère l'erreur
      }
      return throwError(() => err);
    })
  );
};