import { Component, inject, signal, computed, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AdminService } from '../../../services/admin/admin';
import { MenuItemDTO } from '../../../models/menu-item';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent implements OnInit, AfterViewChecked {
  private router       = inject(Router);
  private adminService = inject(AdminService);

  activeUrl  = signal('');
  expanded   = signal<string | null>(null);
  menuItems  = signal<MenuItemDTO[]>([]);
  isLoading  = signal(true);
  private featherDirty = false;

  rootMenus = computed(() => this.menuItems().filter(m => !m.parentId));

  getChildren(parentId: number): MenuItemDTO[] {
    return this.menuItems().filter(m => m.parentId === parentId);
  }
  hasChildren(item: MenuItemDTO): boolean {
    return this.menuItems().some(m => m.parentId === item.menuItemId);
  }
  getFeatherName(iconClass: string): string {
    if (!iconClass) return 'menu';
    const match = iconClass.match(/icon-([a-z0-9-]+)/);
    return match ? match[1] : iconClass;
  }

  constructor() {
    this.activeUrl.set(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.activeUrl.set(e.urlAfterRedirects);
        this.featherDirty = true;
      });
  }

  ngOnInit(): void { this.loadMenus(); }

  ngAfterViewChecked(): void {
    if (this.featherDirty) {
      this.initFeather();
      this.featherDirty = false;
    }
  }

  private initFeather(): void {
    const feather = (window as any)['feather'];
    if (feather) feather.replace({ width: 18, height: 18, 'stroke-width': 1.5 });
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.adminService.getAuthorizedMenus().subscribe({
      next: (items) => {
        this.menuItems.set(items);
        this.isLoading.set(false);
        this.featherDirty = true;

        const active = items.find(m => m.parentId && this.activeUrl().includes(m.link || ''));
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
    this.featherDirty = true;
  }

  isActive(link?: string): boolean {
    if (!link) return false;
    return this.activeUrl().includes(link);
  }

  isGroupActive(item: MenuItemDTO): boolean {
    if (item.link && this.isActive(item.link)) return true;
    return this.getChildren(item.menuItemId).some(c => this.isActive(c.link));
  }

  navigate(link: string): void {
    this.router.navigate(['/app' + link]);
  }
}