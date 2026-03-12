import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item';
import { AdminService } from '../../services/admin/admin';
import { RoleMappingService } from '../../services/role-mapping/role-mapping';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-permissions.html',
  styleUrls: ['./role-permissions.scss']
})
export class RolePermissionsComponent implements OnInit {
  private roleService    = inject(AdminService);
  private mappingService = inject(RoleMappingService);

  roles          = signal<Role[]>([]);
  allMenus       = signal<MenuItemDTO[]>([]);
  selectedRoleId = signal<number | null>(null);
  selectedMenuIds = signal<number[]>([]);

  ngOnInit(): void {
    this.roleService.getRoles().subscribe((roles: Role[]) => this.roles.set(roles));
    this.mappingService.getAllMenus().subscribe({
      next: (menus: MenuItemDTO[]) => this.allMenus.set(menus),
      error: (err: any) => console.error('Erreur menus:', err)
    });
  }

  onRoleChange(roleId: number): void {
    if (!roleId) { this.selectedRoleId.set(null); return; }
    this.selectedRoleId.set(roleId);
    this.mappingService.getRoleMenuIds(roleId).subscribe({
      next: (ids: number[]) => this.selectedMenuIds.set(ids),
      error: (err: any) => console.error('Erreur IDs:', err)
    });
  }

  toggleMenu(menuId: number): void {
    const current = this.selectedMenuIds();
    this.selectedMenuIds.set(current.includes(menuId) ? current.filter(id => id!==menuId) : [...current, menuId]);
  }

  save(): void {
    if (!this.selectedRoleId()) return;
    this.mappingService.saveMapping(this.selectedRoleId()!, this.selectedMenuIds())
      .subscribe(() => alert('Permissions mises à jour !'));
  }
}