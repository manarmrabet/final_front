import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { Role } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item';
import { AdminService } from '../../services/admin/admin';
import { RoleMappingService } from '../../services/role-mapping/role-mapping';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './role-permissions.html',
  styleUrls: ['./role-permissions.scss']
})
export class RolePermissionsComponent implements OnInit {

  private roleService = inject(AdminService);
  private mappingService = inject(RoleMappingService);

  roles = signal<Role[]>([]);
  allMenus = signal<MenuItemDTO[]>([]);
  selectedRoleId = signal<number | null>(null);
  selectedMenuIds = signal<number[]>([]);

  // Modal création
  showCreateModal = signal<boolean>(false);
  newRoleName = signal<string>('');
  newRoleDescription = signal<string>('');

  // Modal suppression
  showDeleteModal = signal<boolean>(false);
  roleToDelete = signal<Role | null>(null);

  roleMenusMap = signal<Map<number, MenuItemDTO[]>>(new Map());

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loadAllRoleMenus(roles);
      },
      error: (err: any) => console.error('Erreur chargement rôles:', err)
    });

    this.mappingService.getAllMenus().subscribe({
      next: (menus) => this.allMenus.set(menus),
      error: (err: any) => console.error('Erreur chargement menus:', err)
    });
  }

  private loadAllRoleMenus(roles: Role[]): void {
    roles.forEach(role => {
      if (!role.roleId) return;
      this.mappingService.getRoleMenuIds(role.roleId).subscribe({
        next: (ids) => {
          const menus = this.allMenus().filter(m => m.menuItemId && ids.includes(m.menuItemId));
          const map = new Map(this.roleMenusMap());
          map.set(role.roleId!, menus);
          this.roleMenusMap.set(map);
        },
        error: () => { }
      });
    });
  }

  onRoleChange(roleId: number | null | undefined): void {
    if (!roleId) {
      this.selectedRoleId.set(null);
      this.selectedMenuIds.set([]);
      return;
    }
    this.selectedRoleId.set(roleId);
    this.mappingService.getRoleMenuIds(roleId).subscribe({
      next: (ids) => this.selectedMenuIds.set(ids),
      error: (err: any) => console.error('Erreur chargement permissions:', err)
    });
  }

  // ====================== SUPPRESSION ======================
  openDeleteModal(role: Role): void {
    this.roleToDelete.set(role);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.roleToDelete.set(null);
  }

  confirmDeleteRole(): void {
    const role = this.roleToDelete();
    if (!role || !role.roleId) return;

    this.roleService.deleteRole(role.roleId).subscribe({
      next: () => {
        this.loadData();
        if (this.selectedRoleId() === role.roleId) {
          this.selectedRoleId.set(null);
          this.selectedMenuIds.set([]);
        }
        this.closeDeleteModal();
        alert(`✅ Rôle "${role.roleName}" supprimé avec succès !`);
      },
      error: (err: any) => {
        console.error(err);
        this.closeDeleteModal();
        alert('❌ Impossible de supprimer ce rôle.\nIl est probablement assigné à un ou plusieurs utilisateurs.');
      }
    });
  }

  getSelectedRoleName(): string {
    const roleId = this.selectedRoleId();
    if (!roleId) return '';
    const role = this.roles().find(r => r.roleId === roleId);
    return role?.roleName || '';
  }

  toggleMenu(menuId: number | undefined): void {
    if (!menuId) return;
    const current = this.selectedMenuIds();
    this.selectedMenuIds.set(
      current.includes(menuId)
        ? current.filter(id => id !== menuId)
        : [...current, menuId]
    );
  }

  save(): void {
    const roleId = this.selectedRoleId();
    if (!roleId) return;

    this.mappingService.saveMapping(roleId, this.selectedMenuIds()).subscribe({
      next: () => {
        this.loadAllRoleMenus(this.roles());
        alert('✅ Permissions mises à jour avec succès !');
      },
      error: (err: any) => {
        console.error(err);
        alert('❌ Erreur lors de la sauvegarde');
      }
    });
  }

  openCreateRoleModal(): void {
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.showCreateModal.set(true);
  }

  closeCreateRoleModal(): void {
    this.showCreateModal.set(false);
  }

  createRole(): void {
    const roleName = this.newRoleName().trim();
    if (!roleName) {
      alert('Le nom du rôle est obligatoire');
      return;
    }

    const request = {
      roleName: roleName,
      description: this.newRoleDescription().trim() || null
    };

    this.roleService.createRole(request).subscribe({
      next: (newRole: Role) => {
        this.loadData();
        this.closeCreateRoleModal();
        alert(`✅ Rôle "${newRole.roleName}" créé avec succès !`);
      },
      error: (err: any) => {
        console.error(err);
        alert('❌ Erreur lors de la création du rôle');
      }
    });
  }

  selectAll(): void {
    const ids = this.allMenus()
      .map(m => m.menuItemId)
      .filter((id): id is number => id != null);
    this.selectedMenuIds.set(ids);
  }

  deselectAll(): void {
    this.selectedMenuIds.set([]);
  }
}