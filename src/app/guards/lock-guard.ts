import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth';

/**
 * LockGuard — blocks navigation to any route (except /lock and /login)
 * when the session is locked.
 *
 * Add it to ALL protected routes in app.routes.ts:
 *   { path: 'dashboard', canActivate: [authGuard, lockGuard], ... }
 */
export const lockGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLocked()) {
    // Persist the attempted URL so unlock can redirect back
    auth.lockSession(state.url);
    return router.createUrlTree(['/lock']);
  }
  return true;
};