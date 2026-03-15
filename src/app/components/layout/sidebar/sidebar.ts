import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { AdminService } from '../../../services/admin/admin';
import { MenuItemDTO } from '../../../models/menu-item';
import { filter, Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
  private pollingSub?: Subscription;

  // ── Ajuste selon tes besoins ────────────────────────────────────────
  private readonly POLLING_INTERVAL_MS = 1000; // 30 secondes

  rootMenus = computed(() => this.menuItems().filter(m => !m.parentId));

  constructor() {
    this.activeUrl.set(this.router.url);
  }

  ngOnInit(): void {
    // Suivi connexion / déconnexion
    this.authSub = this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.loadMenus();
        this.startPolling();
      } else {
        this.stopPolling();
        this.menuItems.set([]);
        this.isLoading.set(false);
        this.expanded.set(null);
      }
    });

    // Mise à jour URL active
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.activeUrl.set(e.urlAfterRedirects);
      this.autoExpandActiveGroup();
    });

    // Chargement initial si déjà connecté
    if (this.auth.currentUserValue) {
      this.loadMenus();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.stopPolling();
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollingSub = interval(this.POLLING_INTERVAL_MS).pipe(
      switchMap(() => this.adminService.getAuthorizedMenus())
    ).subscribe({
      next: (items) => {
        // On ne met à jour que si les IDs changent (évite flicker inutile)
        const currentIds = this.menuItems().map(m => m.menuItemId).sort((a,b)=>a!-b!);
        const newIds     = items.map(m => m.menuItemId).sort((a,b)=>a!-b!);

        if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
          console.log('[Sidebar Polling] Menus modifiés → mise à jour');
          this.menuItems.set(items || []);
          this.autoExpandActiveGroup();
        }
      },
      error: (err) => {
        console.warn('[Polling] Erreur silencieuse (ignorée)', err);
        // On ne vide pas les menus en cas d'erreur polling → on garde l’ancien état
      }
    });
  }

  private stopPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.adminService.getAuthorizedMenus().subscribe({
      next: items => {
        console.log('Menus chargés (initial ou polling) :', items);
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