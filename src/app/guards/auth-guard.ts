import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth/auth';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const user   = auth.currentUserValue;

  if (!user?.authorities?.length) {
    auth.clearStorage();
    router.navigate(['/login']);
    return false;
  }

  const roles = route.data['roles'] as string[] | undefined;
  if (!roles?.length) return true;

  const hasAccess = roles.some((r: string) =>
    user.authorities.some((a: string) => a.toUpperCase() === r.toUpperCase())
  );

  if (hasAccess) return true;

  if (auth.hasRole('ROLE_ADMIN')) {
    if (state.url !== '/dashboard-v1') router.navigate(['/dashboard-v1']);
  } else if (user.authorities.length > 0) {
    if (state.url.includes('user-management')) router.navigate(['/dashboard-v1']);
  } else {
    auth.logout();
  }

  return false;
};