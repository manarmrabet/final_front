import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  roles?: string[];
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  activeUrl = signal('');
  expanded  = signal<string | null>(null);

  constructor() {
    this.activeUrl.set(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.activeUrl.set(e.urlAfterRedirects));
  }

  navItems: NavItem[] = [
    {
      label: 'Tableaux de bord', icon: 'icon-speedometer',
      children: [
        { label: 'Dashboard', icon: 'icon-pie-chart', path: '/app/dashboard' }
      ]
    },
    {
      label: 'Administration', icon: 'icon-settings',
      roles: ['ROLE_ADMIN'],
      children: [
        { label: 'Utilisateurs',  icon: 'icon-users',  path: '/app/user-management',  roles: ['ROLE_ADMIN'] },
        { label: 'Rôles & Menus',  icon: 'icon-shield', path: '/app/role-permissions', roles: ['ROLE_ADMIN'] },
        { label: 'Menus',          icon: 'icon-menu',   path: '/app/menu-management',  roles: ['ROLE_ADMIN'] },
      ]
    },
    {
      label: 'Audit', icon: 'icon-file-text', path: '/app/audit',
      roles: ['ROLE_ADMIN']
    }
  ];

  visibleItems = computed(() => {
    const user = this.auth.currentUserValue;
    return this.navItems.filter(item =>
      !item.roles || item.roles.some(r => user?.authorities?.includes(r))
    );
  });

  toggleExpand(label: string): void {
    this.expanded.set(this.expanded() === label ? null : label);
  }

  isActive(path?: string): boolean {
    if (!path) return false;
    return this.activeUrl().startsWith(path);
  }

  isGroupActive(item: NavItem): boolean {
    if (item.path) return this.isActive(item.path);
    return item.children?.some(c => this.isActive(c.path)) ?? false;
  }

  navigate(path: string): void { this.router.navigate([path]); }
}