import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { AdminService } from '../../../services/admin/admin';
import { MenuItemDTO } from '../../../models/menu-item';
import { filter, Subscription } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {

  private auth         = inject(AuthService);
  private adminService = inject(AdminService);
  private router       = inject(Router);

  activeUrl  = signal<string>('');
  expanded   = signal<string | null>(null);
  menuItems  = signal<MenuItemDTO[]>([]);
  isLoading  = signal<boolean>(true);

  private authSub?: Subscription;
  private routerSub?: Subscription;

  rootMenus = computed(() => this.menuItems().filter(m => !m.parentId));

  constructor() {
    this.activeUrl.set(this.router.url);
  }

  ngOnInit(): void {

    // Charger les menus quand l'utilisateur se connecte
    this.authSub = this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.loadMenus();
      } else {
        this.menuItems.set([]);
        this.expanded.set(null);
        this.isLoading.set(false);
      }
    });

    // Mise à jour de l'URL active
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.activeUrl.set(e.urlAfterRedirects);
      this.autoExpandActiveGroup();
    });

    // Si l'utilisateur est déjà connecté (refresh page)
    if (this.auth.currentUserValue) {
      this.loadMenus();
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  loadMenus(): void {
    this.isLoading.set(true);

    this.adminService.getAuthorizedMenus().subscribe({
      next: items => {
        this.menuItems.set(items || []);
        this.isLoading.set(false);
        this.autoExpandActiveGroup();
      },
      error: err => {
        console.error('Erreur chargement menus', err);
        this.menuItems.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private autoExpandActiveGroup(): void {
    const activeChild = this.menuItems().find(m =>
      m.link && this.isActive(m.link) && m.parentId != null
    );

    if (activeChild?.parentId) {
      const parent = this.menuItems().find(p => p.menuItemId === activeChild.parentId);
      if (parent?.label) this.expanded.set(parent.label);
    }
  }

  toggleExpand(label: string): void {
    this.expanded.update(c => c === label ? null : label);
  }

  isActive(link?: string): boolean {
    if (!link) return false;
    const url = this.activeUrl();
    return url === link || url.startsWith(link + '/');
  }

  isGroupActive(item: MenuItemDTO): boolean {
    if (item.link && this.isActive(item.link)) return true;
    return this.getChildren(item.menuItemId).some(c => this.isActive(c.link));
  }

  getChildren(parentId: number): MenuItemDTO[] {
    return this.menuItems().filter(m => m.parentId === parentId);
  }

  hasChildren(item: MenuItemDTO): boolean {
    return this.menuItems().some(m => m.parentId === item.menuItemId);
  }

  navigate(link: string): void {
    if (!link) return;

    const trimmed = link.trim();

    const url = trimmed.startsWith('/app')
      ? trimmed
      : '/app' + (trimmed.startsWith('/') ? trimmed : '/' + trimmed);

    this.router.navigateByUrl(url);
  }
}