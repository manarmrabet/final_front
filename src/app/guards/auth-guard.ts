import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth/auth';
import { AdminService } from '../services/admin/admin';
import { map, of, catchError } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const adminService = inject(AdminService);
  const user = auth.currentUserValue;

  // 1. Vérification de session : est-il connecté ?
  if (!user) {
    auth.clearStorage();
    router.navigate(['/login']);
    return of(false);
  }

  // Le Dashboard et la racine de l'app sont ouverts à tous les connectés
  if (state.url === '/app/dashboard' || state.url === '/app') {
    return of(true);
  }

  // 2. Vérification DYNAMIQUE basée sur vos permissions en base de données
  return adminService.getAuthorizedMenus().pipe(
    map(menus => {
      // On vérifie si l'URL actuelle (ex: /app/user-management)
      // correspond à un "link" autorisé dans la table de mapping
      const hasAccess = menus.some(menu =>
        menu.link && state.url.includes(menu.link)
      );

      if (hasAccess) {
        return true;
      }

      // 3. Si l'URL n'est pas dans la liste des menus autorisés -> Access Denied
      router.navigate(['/access-denied']);
      return false;
    }),
    catchError(() => {
      // En cas d'erreur API, on sécurise en bloquant l'accès
      router.navigate(['/access-denied']);
      return of(false);
    })
  );
};
