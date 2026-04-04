import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { lockGuard } from './guards/lock-guard';
import { TransferManagementComponent } from './components/transfer/transfer';
import { StockConsultationComponent } from './components/stock-consultation/stock-consultation';
import { StockDashboardComponent } from './components/stock-dashboard/stock-dashboard';
export const routes: Routes = [


  {
    path: '',
    loadComponent: () => import('./components/home/home').then(m => m.HomeComponent),
    title: 'COFAT WMS — Accueil'
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./components/auth/signin/signin').then(m => m.SigninComponent)
  },

  {
    path: 'lock',
    canActivate: [authGuard],
    loadComponent: () => import('./components/lock-screen/lock-screen').then(m => m.LockScreenComponent),
  },

  {
    path: 'access-denied',
    loadComponent: () => import('./components/access-denied/access-denied').then(m => m.AccessDeniedComponent)
  },

  {
    path: 'app',
    canActivate: [authGuard, lockGuard],
    loadComponent: () => import('./components/layout/layout').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'user-management',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/user-management/user-management').then(m => m.UserManagementComponent)
      },
      {
        path: 'role-permissions',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/role-permissions/role-permissions').then(m => m.RolePermissionsComponent)
      },
      {
        path: 'menu-management',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/menu-management/menu-management').then(m => m.MenuManagementComponent)
      },
      {
        path: 'audit',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/audit/audit-list/audit-list').then(m => m.AuditListComponent)
      },
     { path: 'transfers',         component: TransferManagementComponent, canActivate: [authGuard, lockGuard],
         data: { roles: ['ROLE_ADMIN', 'ROLE_RESPONSABLE_MAGASIN', 'ROLE_MAGASINIER', 'ROLE_CONSULTATION'] } },
      {
        path: 'card-management',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/card-management/card-management').then(m => m.CardManagementComponent)
      },
      {
        path: 'inventory',
        canActivate: [authGuard, lockGuard],
        loadComponent: () => import('./components/inventory/inventory').then(m => m.InventoryComponent)
      },
      {
  path: 'transfers/archives',
  loadComponent: () =>
    import('./components/transfer-archives/transfer-archives')
      .then(m => m.TransferArchivesComponent)
},
      // ── Stock ERP — AVANT le wildcard ** ──────────────────────────
      {
        path: 'stock',
        canActivate: [authGuard, lockGuard],
        children: [
          { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard',    component: StockDashboardComponent,    title: 'Dashboard Stock' },
          { path: 'consultation', component: StockConsultationComponent, title: 'Consultation Stock' },
        ]
      },

      {
        path: '**',
        loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFoundComponent)
      }
    ]
  },

  {
    path: 'not-found',
    loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFoundComponent)
  },

  { path: '**', redirectTo: 'not-found' }
];
