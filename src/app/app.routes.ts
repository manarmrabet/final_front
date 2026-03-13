import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { lockGuard }  from './guards/lock-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/signin/signin').then(m => m.SigninComponent)
  },
  {
    path: 'lock',
    canActivate: [authGuard],          // must have a token
    loadComponent: () =>
      import('./components/lock-screen/lock-screen')
        .then(m => m.LockScreenComponent),
  },

  {
    path: 'app',
    canActivate: [authGuard, lockGuard],
    loadComponent: () =>
      import('./components/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'user-management',  canActivate: [authGuard], loadComponent: () => import('./components/user-management/user-management').then(m => m.UserManagementComponent) },
      { path: 'role-permissions', loadComponent: () => import('./components/role-permissions/role-permissions').then(m => m.RolePermissionsComponent) },
      { path: 'menu-management',  loadComponent: () => import('./components/menu-management/menu-management').then(m => m.MenuManagementComponent) },
      { path: 'audit',            canActivate: [authGuard], loadComponent: () => import('./components/audit/audit-list/audit-list').then(m => m.AuditListComponent) },

      // ← Ajouter cette ligne : toute route inconnue dans /app → not-found
      { path: '**', loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFoundComponent) }
    ]
  },

  // ← Route globale not-found pour les URLs hors /app
  {
    path: 'not-found',
    loadComponent: () =>
      import('./components/not-found/not-found').then(m => m.NotFoundComponent)
  },

  { path: '**', redirectTo: 'not-found' }  // ← redirige vers not-found au lieu de login
];
