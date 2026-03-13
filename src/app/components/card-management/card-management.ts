import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin/admin';
import { CardConfigService, CardRoleConfig } from '../../services/card-config/card-config';
import { Role } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SVG_REGISTRY, inferIconForMenu } from '../dashboard/dashboard';

@Component({
  selector: 'app-card-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-management.html',
  styleUrls: ['./card-management.scss']
})
export class CardManagementComponent implements OnInit {
  private adminService  = inject(AdminService);
  private cardConfig    = inject(CardConfigService);
  private sanitizer     = inject(DomSanitizer);

  roles         = signal<Role[]>([]);
  allMenus      = signal<MenuItemDTO[]>([]);
  selectedRole  = signal<Role | null>(null);
  visibleIds    = signal<number[]>([]);
  isSaved       = signal(false);
  isLoading     = signal(true);

  // Menus filtrés : uniquement ceux avec un lien (= cards potentielles)
  cardMenus = computed(() =>
    this.allMenus().filter(m => m.menuItemId && !m.isTitle && !m.isLayout && m.link)
  );

  ngOnInit(): void {
    let rolesLoaded = false, menusLoaded = false;

    this.adminService.getRoles().subscribe({
      next: (roles: Role[]) => {
        this.roles.set(roles);
        rolesLoaded = true;
        if (rolesLoaded && menusLoaded) this.isLoading.set(false);
      },
      error: () => { rolesLoaded = true; if (rolesLoaded && menusLoaded) this.isLoading.set(false); }
    });

    this.adminService.getAuthorizedMenus().subscribe({
      next: (menus: MenuItemDTO[]) => {
        this.allMenus.set(menus);
        menusLoaded = true;
        if (rolesLoaded && menusLoaded) this.isLoading.set(false);
      },
      error: () => {
        // fallback : charger tous les menus
        this.adminService.getAllMenuItems().subscribe({
          next: (res: any) => {
            this.allMenus.set(res.data ?? []);
            menusLoaded = true;
            if (rolesLoaded && menusLoaded) this.isLoading.set(false);
          },
          error: () => { menusLoaded = true; if (rolesLoaded && menusLoaded) this.isLoading.set(false); }
        });
      }
    });
  }

  selectRole(role: Role): void {
    this.selectedRole.set(role);
    this.isSaved.set(false);
    const config = this.cardConfig.getConfig(role.roleId!);
    if (config) {
      this.visibleIds.set([...config.visibleIds]);
    } else {
      // Pas de config → toutes les cards visibles par défaut
      this.visibleIds.set(
        this.cardMenus().map(m => m.menuItemId!).filter(Boolean)
      );
    }
  }

  isVisible(menuItemId: number): boolean {
    return this.visibleIds().includes(menuItemId);
  }

  toggle(menuItemId: number): void {
    const current = this.visibleIds();
    this.visibleIds.set(
      current.includes(menuItemId)
        ? current.filter(id => id !== menuItemId)
        : [...current, menuItemId]
    );
    this.isSaved.set(false);
  }

  selectAll(): void {
    this.visibleIds.set(this.cardMenus().map(m => m.menuItemId!).filter(Boolean));
    this.isSaved.set(false);
  }

  deselectAll(): void {
    this.visibleIds.set([]);
    this.isSaved.set(false);
  }

  save(): void {
    const role = this.selectedRole();
    if (!role?.roleId) return;
    const config: CardRoleConfig = {
      roleId:     role.roleId,
      roleName:   role.roleName,
      visibleIds: this.visibleIds()
    };
    this.cardConfig.saveConfig(config);
    // Purger les dismissedIds perso pour les cards que l'admin vient de réactiver
    this.cardConfig.syncDismissedWithAdminConfig(role.roleId);
    this.isSaved.set(true);
    setTimeout(() => this.isSaved.set(false), 2500);
  }

  reset(): void {
    const role = this.selectedRole();
    if (!role?.roleId) return;
    this.cardConfig.resetConfig(role.roleId);
    this.visibleIds.set(this.cardMenus().map(m => m.menuItemId!).filter(Boolean));
    this.isSaved.set(false);
  }

  getSvgIcon(menu: MenuItemDTO): SafeHtml {
    const { icon, iconColor } = inferIconForMenu(menu);
    const paths = SVG_REGISTRY[icon] ?? SVG_REGISTRY['icon-layers'];
    const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getIconBg(menu: MenuItemDTO): string {
    return inferIconForMenu(menu).iconBg;
  }

  getIconColor(menu: MenuItemDTO): string {
    return inferIconForMenu(menu).iconColor;
  }

  visibleCount = computed(() => this.visibleIds().length);
  totalCount   = computed(() => this.cardMenus().length);
}
