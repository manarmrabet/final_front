import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item';
import { AdminService } from '../../services/admin/admin';
import { RoleMappingService } from '../../services/role-mapping/role-mapping';
import { LucideAngularModule } from 'lucide-angular';

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

  ngOnInit(): void {
    this.roleService.getRoles().subscribe((roles: Role[]) => this.roles.set(roles));
    this.mappingService.getAllMenus().subscribe({
      next:  (menus: MenuItemDTO[]) => this.allMenus.set(menus),
      error: (err: any) => console.error('Erreur menus:', err)
    });
  }

  onRoleChange(roleId: number | undefined): void {
    if (!roleId) { this.selectedRoleId.set(null); return; }
    this.selectedRoleId.set(roleId);
    this.mappingService.getRoleMenuIds(roleId).subscribe({
      next:  (ids: number[]) => this.selectedMenuIds.set(ids),
      error: (err: any) => console.error('Erreur IDs:', err)
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
    this.mappingService.saveMapping(roleId, this.selectedMenuIds())
      .subscribe(() => alert('Permissions mises à jour !'));
  }

  selectAll(): void {
    this.selectedMenuIds.set(
      this.allMenus()
        .map(m => m.menuItemId)
        .filter((id): id is number => id !== undefined)
    );
  }

  deselectAll(): void {
    this.selectedMenuIds.set([]);
  }
}
