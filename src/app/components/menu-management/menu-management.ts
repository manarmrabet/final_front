import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin/admin';
import { DashboardNotification } from '../../services/dashboard/dashboard-notification';
import { MenuItemDTO } from '../../models/menu-item';
import { ApiResponse } from '../../models/shared';
import { LucideAngularModule, icons as lucideIcons } from 'lucide-angular';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './menu-management.html',
  styleUrls: ['./menu-management.scss']
})
export class MenuManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private notifSvc     = inject(DashboardNotification);

  menus        = signal<MenuItemDTO[]>([]);
  displayModal = false;
  isEditMode   = false;
  isSubMenu    = false;

  newMenu: MenuItemDTO = {
    menuItemId: 0,
    label: '',
    icon: 'menu',           // valeur par défaut lucide
    link: '',
    isTitle: 0,
    isLayout: 0,
    parentId: null
  };

  // Liste des icônes (on en prend une sélection raisonnable – tu peux en ajouter)
  readonly popularIcons = [
    'home',
  'layout-dashboard',
  'grid',
  'list',
  'clipboard-list',
  'shield',
  'shield-check',
  'users',
  'user',
  'user-plus',
  'user-minus',
  'user-check',
  'settings',
  'sliders',
  'bar-chart',
  'pie-chart',
  'line-chart',
  'activity',
  'mail',
  'inbox',
  'send',
  'file-text',
  'folder',
  'folder-plus',
  'calendar',
  'clock',
  'bell',
  'shopping-cart',
  'credit-card',
  'dollar-sign',
  'percent',
  'truck',
  'package',
  'box',
  'columns',
  'table',
  'file-plus',
  'plus',
  'minus',
  'x',
  'check',
  'alert-circle',
  'info',
  'help-circle',
  'lock',
  'unlock',
  'log-out',
  'log-in',
  'menu',
  'circle'
  ];

  // Pour l’affichage dans la liste de sélection
  iconSearch = '';

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.adminService.getAllMenuItems().subscribe({
      next: (res: ApiResponse<MenuItemDTO[]>) => this.menus.set(res.data || []),
      error: (err) => console.error('Erreur chargement', err)
    });
  }

  openAddModal(): void {
    this.isEditMode   = false;
    this.isSubMenu    = false;
    this.resetForm();
    this.displayModal = true;
  }

  openEditModal(item: MenuItemDTO): void {
    this.isEditMode   = true;
    this.isSubMenu    = item.parentId != null;
    this.newMenu      = { ...item };
    // Si l’icône vient de feather, on peut tenter une conversion approximative
    if (this.newMenu.icon?.includes('feather icon-')) {
      this.newMenu.icon = this.newMenu.icon.replace('feather icon-', '');
    }
    this.displayModal = true;
  }

  onSubMenuToggle(): void {
    if (!this.isSubMenu) this.newMenu.parentId = null;
  }

  selectIcon(iconName: string): void {
    this.newMenu.icon = iconName;
  }

  deleteMenu(id: number): void {
    if (!confirm('Supprimer cet élément ?')) return;
    this.adminService.deleteMenuItem(id).subscribe({
      next:  () => {
        this.loadMenus();
        alert('Menu supprimé !');
      },
      error: (err) => console.error('Erreur suppression', err)
    });
  }

  submitMenu(): void {
    const payload = { ...this.newMenu };
    if (!this.isSubMenu) payload.parentId = null;

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

        alert(this.isEditMode ? 'Menu modifié !' : 'Menu ajouté !');
      },
      error: (err) => console.error('Erreur envoi', err)
    });
  }

  resetForm(): void {
    this.newMenu = {
      menuItemId: 0,
      label: '',
      icon: 'menu',
      link: '',
      isTitle: 0,
      isLayout: 0,
      parentId: null
    };
    this.isSubMenu = false;
    this.iconSearch = '';
  }

  get parentMenuOptions(): MenuItemDTO[] {
    return this.menus().filter(m => m.menuItemId !== this.newMenu.menuItemId && !m.parentId);
  }

  getParentLabel(parentId: number): string {
    return this.menus().find(m => m.menuItemId === parentId)?.label ?? `#${parentId}`;
  }

  get filteredIcons(): string[] {
    if (!this.iconSearch) return this.popularIcons;
    const term = this.iconSearch.toLowerCase();
    return this.popularIcons.filter(i => i.toLowerCase().includes(term));
  }
}