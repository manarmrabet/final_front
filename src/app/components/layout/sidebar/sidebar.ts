import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { AdminService } from '../../../services/admin/admin';
import { MenuItemDTO } from '../../../models/menu-item';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent implements OnInit {
  private auth         = inject(AuthService);
  private router       = inject(Router);
  private adminService = inject(AdminService);

  activeUrl  = signal('');
  expanded   = signal<string | null>(null);
  menuItems  = signal<MenuItemDTO[]>([]);
  isLoading  = signal(true);

  rootMenus = computed(() =>
    this.menuItems().filter(m => !m.parentId)
  );

  getChildren(parentId: number): MenuItemDTO[] {
    return this.menuItems().filter(m => m.parentId === parentId);
  }

  hasChildren(item: MenuItemDTO): boolean {
    return this.menuItems().some(m => m.parentId === item.menuItemId);
  }

  constructor() {
    this.activeUrl.set(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.activeUrl.set(e.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.adminService.getAuthorizedMenus().subscribe({
      next: (items) => {
        this.menuItems.set(items);
        this.isLoading.set(false);

        const active = items.find(m =>
          m.parentId && this.activeUrl().includes(m.link || '')
        );
        if (active?.parentId) {
          const parent = items.find(m => m.menuItemId === active.parentId);
          if (parent) this.expanded.set(parent.label);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  toggleExpand(label: string): void {
    this.expanded.set(this.expanded() === label ? null : label);
  }

  isActive(link?: string): boolean {
    if (!link) return false;
    return this.activeUrl() === link || this.activeUrl().startsWith(link + '/');
  }

  isGroupActive(item: MenuItemDTO): boolean {
    if (item.link && this.isActive(item.link)) return true;
    return this.getChildren(item.menuItemId).some(c => this.isActive(c.link));
  }

  navigate(link: string): void {
    if (!link) return;
    const link2 = link.trim();
    // Liens en DB sans /app/ → on préfixe uniquement si pas déjà présent
    const url = link2.startsWith('/app') ? link2 : '/app' + (link2.startsWith('/') ? link2 : '/' + link2);
    this.router.navigateByUrl(url);
  }
}
