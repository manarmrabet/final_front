import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth';

export const lockGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLocked()) {
    auth.lockSession(state.url);
    return router.createUrlTree(['/lock']);
  }
  return true;
};