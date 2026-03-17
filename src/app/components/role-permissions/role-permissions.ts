import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item';
import { AdminService } from '../../services/admin/admin';
import { RoleMappingService } from '../../services/role-mapping/role-mapping';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './role-permissions.html',
  styleUrls: ['./role-permissions.scss']
})
export class RolePermissionsComponent implements OnInit {
  private roleService    = inject(AdminService);
  private mappingService = inject(RoleMappingService);

  roles           = signal<Role[]>([]);
  allMenus        = signal<MenuItemDTO[]>([]);
  selectedRoleId  = signal<number | null>(null);
  selectedMenuIds = signal<number[]>([]);

  // Map roleId → liste des menus assignés (pour la vue liste)
  roleMenusMap    = signal<Map<number, MenuItemDTO[]>>(new Map());

  ngOnInit(): void {
    this.roleService.getRoles().subscribe(roles => {
      this.roles.set(roles);
      this.loadAllRoleMenus(roles);
    });

    this.mappingService.getAllMenus().subscribe({
      next:  menus => this.allMenus.set(menus),
      error: err   => console.error('Erreur menus:', err)
    });
  }

  // Charge les menus de chaque rôle pour la vue cards
  private loadAllRoleMenus(roles: Role[]): void {
    const allMenus = this.allMenus();

    roles.forEach(role => {
      if (!role.roleId) return;
      this.mappingService.getRoleMenuIds(role.roleId).subscribe({
        next: ids => {
          const menus = this.allMenus().filter(m => m.menuItemId && ids.includes(m.menuItemId));
          const map   = new Map(this.roleMenusMap());
          map.set(role.roleId!, menus);
          this.roleMenusMap.set(map);
        },
        error: () => {}
      });
    });
  }

  // Retourne les menus assignés à un rôle
  getMenusForRole(roleId: number | undefined): MenuItemDTO[] {
    if (!roleId) return [];
    return this.roleMenusMap().get(roleId) ?? [];
  }

  // Retourne le nombre de menus assignés à un rôle
  getMenuCount(roleId: number | undefined): number {
    return this.getMenusForRole(roleId).length;
  }

  onRoleChange(roleId: number | undefined): void {
    if (!roleId) {
      this.selectedRoleId.set(null);
      this.selectedMenuIds.set([]);
      return;
    }
    this.selectedRoleId.set(roleId);
    this.mappingService.getRoleMenuIds(roleId).subscribe({
      next:  ids => this.selectedMenuIds.set(ids),
      error: err => console.error('Erreur IDs:', err)
    });
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
        alert(`✅ Permissions mises à jour !`);
      },
      error: err => {
        console.error(err);
        alert('❌ Erreur lors de la sauvegarde');
      }
    });
  }

  selectAll(): void {
    this.selectedMenuIds.set(this.allMenus().map(m => m.menuItemId!).filter(Boolean));
  }

  deselectAll(): void {
    this.selectedMenuIds.set([]);
  }
}
