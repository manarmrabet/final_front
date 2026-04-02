import {
  ChangeDetectionStrategy,   // ✅ PERF : OnPush
  ChangeDetectorRef,         // ✅ PERF : détection manuelle si besoin
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin/admin';
import { DashboardNotification } from '../../services/dashboard/dashboard-notification';
import { MenuItemDTO } from '../../models/menu-item';
import { ApiResponse } from '../../models/shared';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconPipe } from '../../pipes/lucide-icon.pipe';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LucideIconPipe],
  templateUrl: './menu-management.html',
  styleUrls: ['./menu-management.scss'],

  // ✅ PERF CLEF : OnPush = Angular ne re-rend CE composant que si :
  //   - un @Input() change de référence
  //   - un signal() émet une nouvelle valeur
  //   - un event DOM est déclenché dans le template
  //   → Élimine les re-renders inutiles à chaque cycle global
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuManagementComponent implements OnInit {

  private adminService = inject(AdminService);
  private notifSvc     = inject(DashboardNotification);
  private cdr          = inject(ChangeDetectorRef); // ✅ PERF : pour forcer au besoin

  // ✅ signal() est compatible OnPush : Angular détecte automatiquement les changements
  menus        = signal<MenuItemDTO[]>([]);
  displayModal = false;
  isEditMode   = false;
  isSubMenu    = false;

  showDeleteConfirm = false;
  menuToDelete: MenuItemDTO | null = null;

  newMenu: MenuItemDTO = {
    menuItemId: 0,
    label:      '',
    icon:       'menu',
    link:       '',
    parentId:   null
  };

  iconMode: 'grid' | 'custom' = 'grid';
  customIconInput = '';
  iconSearch      = '';

  // ── Catalogue icônes ─────────────────────────────────────────────────────
  // readonly = référence stable → pas de re-render inutile
  readonly iconCategories: { label: string; icons: string[] }[] = [
    {
      label: 'Navigation',
      icons: ['home', 'layout-dashboard', 'grid', 'list', 'menu',
              'sidebar', 'panel-left', 'compass', 'map', 'navigation']
    },
    {
      label: 'Utilisateurs',
      icons: ['user', 'users', 'user-plus', 'user-minus', 'user-check',
              'user-x', 'user-cog', 'contact', 'badge', 'shield-check']
    },
    {
      label: 'Sécurité',
      icons: ['shield', 'shield-check', 'shield-alert', 'shield-off',
              'lock', 'unlock', 'key', 'eye', 'eye-off', 'fingerprint']
    },
    {
      label: 'Données & Fichiers',
      icons: ['file-text', 'file-plus', 'file-minus', 'folder', 'folder-plus',
              'folder-open', 'clipboard-list', 'clipboard-check', 'database', 'server']
    },
    {
      label: 'Finance',
      icons: ['dollar-sign', 'credit-card', 'percent', 'trending-up',
              'trending-down', 'wallet', 'receipt', 'coins', 'piggy-bank', 'store']
    },
    {
      label: 'Graphiques',
      icons: ['bar-chart', 'bar-chart-2', 'pie-chart', 'line-chart',
              'activity', 'gauge', 'sigma', 'calculator', 'sliders', 'sliders-horizontal']
    },
    {
      label: 'Communication',
      icons: ['mail', 'inbox', 'send', 'bell', 'bell-ring',
              'message-square', 'message-circle', 'phone', 'at-sign', 'share']
    },
    {
      label: 'Logistique',
      icons: ['truck', 'package', 'box', 'shopping-cart', 'warehouse',
              'ship', 'container', 'store', 'tag', 'layers']
    },
    {
      label: 'Paramètres',
      icons: ['settings', 'settings-2', 'wrench', 'tool', 'cpu',
              'toggle-left', 'switch-camera', 'sliders', 'monitor', 'more-horizontal']
    },
    {
      label: 'Actions',
      icons: ['plus', 'minus', 'x', 'check', 'edit',
              'trash-2', 'download', 'upload', 'refresh-cw', 'save']
    },
    {
      label: 'Calendrier & Temps',
      icons: ['calendar', 'calendar-check', 'calendar-plus', 'clock',
              'timer', 'hourglass', 'watch', 'sunrise', 'sunset', 'alarm-clock']
    },
    {
      label: 'Divers',
      icons: ['alert-circle', 'info', 'help-circle', 'star', 'heart',
              'flag', 'bookmark', 'zap', 'circle', 'more-horizontal']
    }
  ];

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.adminService.getAllMenuItems().subscribe({
      next: (res: ApiResponse<MenuItemDTO[]>) => {
        this.menus.set(res.data || []);
        // ✅ PERF : avec OnPush, on notifie Angular du changement
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement', err)
    });
  }

  // ✅ PERF : trackBy pour @for — évite de re-créer les lignes existantes du tableau
  // Angular réutilise les éléments DOM dont le trackId n'a pas changé
  trackByMenuId(_index: number, item: MenuItemDTO): number {
    return item.menuItemId ?? _index;
  }

  // ✅ PERF : trackBy pour les catégories d'icônes
  trackByCatLabel(_index: number, cat: { label: string }): string {
    return cat.label;
  }

  // ✅ PERF : trackBy pour les icônes dans une catégorie
  trackByIcon(_index: number, icon: string): string {
    return icon;
  }

  openAddModal(): void {
    this.isEditMode   = false;
    this.isSubMenu    = false;
    this.resetForm();
    this.displayModal = true;
    this.cdr.markForCheck();
  }

  openEditModal(item: MenuItemDTO): void {
    this.isEditMode = true;
    this.isSubMenu  = item.parentId != null;
    this.newMenu    = { ...item };

    if (this.newMenu.icon?.includes('feather icon-')) {
      this.newMenu.icon = this.newMenu.icon.replace('feather icon-', '');
    }

    const allGridIcons = this.iconCategories.flatMap(c => c.icons);
    if (this.newMenu.icon && !allGridIcons.includes(this.newMenu.icon)) {
      this.iconMode        = 'custom';
      this.customIconInput = this.newMenu.icon;
    } else {
      this.iconMode        = 'grid';
      this.customIconInput = '';
    }

    this.displayModal = true;
    this.cdr.markForCheck();
  }

  onSubMenuToggle(): void {
    if (!this.isSubMenu) this.newMenu.parentId = null;
  }

  selectIcon(iconName: string): void {
    this.newMenu.icon    = iconName;
    this.iconMode        = 'grid';
    this.customIconInput = '';
    this.cdr.markForCheck();
  }

  switchIconMode(mode: 'grid' | 'custom'): void {
    this.iconMode = mode;
    if (mode === 'grid') {
      this.customIconInput = '';
    } else {
      this.customIconInput = this.newMenu.icon || '';
    }
    this.cdr.markForCheck();
  }

  onCustomIconChange(): void {
    const trimmed = this.customIconInput.trim();
    if (trimmed) {
      this.newMenu.icon = trimmed;
      this.cdr.markForCheck();
    }
  }

  // ✅ Détecte si l'icône est une classe CSS (Feather, MDI…) ou un nom Lucide
  isCustomCssClass(icon: string): boolean {
    if (!icon?.trim()) return false;
    const trimmed     = icon.trim().toLowerCase();
    const cssPatterns = ['feather', 'mdi', 'fa ', 'fas ', 'far ', 'fab ', 'bi ', 'ti '];
    return trimmed.includes(' ') || cssPatterns.some(p => trimmed.startsWith(p));
  }

  openDeleteConfirm(item: MenuItemDTO): void {
    this.menuToDelete      = item;
    this.showDeleteConfirm = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.menuToDelete      = null;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.menuToDelete) return;
    const id = this.menuToDelete.menuItemId!;
    this.showDeleteConfirm = false;
    this.menuToDelete      = null;

    this.adminService.deleteMenuItem(id).subscribe({
      next: () => {
        this.loadMenus();
        this.cdr.markForCheck();
        alert('Menu supprimé !');
      },
      error: (err) => console.error('Erreur suppression', err)
    });
  }

  submitMenu(): void {
    const payload: MenuItemDTO = {
      menuItemId: this.newMenu.menuItemId,
      label:      this.newMenu.label,
      icon:       this.newMenu.icon,
      link:       this.newMenu.link,
      parentId:   this.isSubMenu ? this.newMenu.parentId : null
    };

    const req = this.isEditMode
      ? this.adminService.updateMenuItem(payload.menuItemId!, payload)
      : this.adminService.createMenuItem(payload);

    req.subscribe({
      next: (res: ApiResponse<MenuItemDTO>) => {
        this.displayModal = false;
        this.loadMenus();
        this.resetForm();
        if (!this.isEditMode && res.data) {
          this.notifSvc.proposeDashboardCard(res.data);
        }
        this.cdr.markForCheck();
        alert(this.isEditMode ? 'Menu modifié !' : 'Menu ajouté !');
      },
      error: (err) => console.error('Erreur envoi', err)
    });
  }

  resetForm(): void {
    this.newMenu = {
      menuItemId: 0,
      label:      '',
      icon:       'menu',
      link:       '',
      parentId:   null
    };
    this.isSubMenu       = false;
    this.iconSearch      = '';
    this.iconMode        = 'grid';
    this.customIconInput = '';
  }

  get parentMenuOptions(): MenuItemDTO[] {
    return this.menus().filter(
      m => m.menuItemId !== this.newMenu.menuItemId && !m.parentId
    );
  }

  getParentLabel(parentId: number): string {
    return this.menus().find(m => m.menuItemId === parentId)?.label ?? `#${parentId}`;
  }

  // ✅ PERF : getter pur — Angular le recalcule uniquement quand iconSearch change
  get filteredCategories(): { label: string; icons: string[] }[] {
    if (!this.iconSearch.trim()) return this.iconCategories;
    const term = this.iconSearch.toLowerCase();
    return this.iconCategories
      .map(cat => ({
        label: cat.label,
        icons: cat.icons.filter(i => i.toLowerCase().includes(term))
      }))
      .filter(cat => cat.icons.length > 0);
  }
}
