import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/signin/signin').then(m => m.SigninComponent)
  },

  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'user-management',  canActivate: [authGuard], loadComponent: () => import('./components/user-management/user-management').then(m => m.UserManagementComponent) },
      { path: 'role-permissions', loadComponent: () => import('./components/role-permissions/role-permissions').then(m => m.RolePermissionsComponent) },
      { path: 'menu-management',  loadComponent: () => import('./components/menu-management/menu-management').then(m => m.MenuManagementComponent) },
      { path: 'audit',            canActivate: [authGuard], loadComponent: () => import('./components/audit/audit-list/audit-list').then(m => m.AuditListComponent) }
    ]
  },

  { path: '**', redirectTo: 'login' }
];