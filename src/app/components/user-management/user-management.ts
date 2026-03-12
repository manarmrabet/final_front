import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin/admin';
import { UserDTO, Role, Site } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  users           = signal<UserDTO[]>([]);
  roles           = signal<Role[]>([]);
  sites           = signal<Site[]>([]);
  isLoading       = signal(false);
  isPageLoading   = signal(true);
  showModal       = signal(false);
  isEditMode      = signal(false);
  searchTerm      = signal('');
  showDeleteModal = signal(false);
  deleteForce     = signal(false);
  userToDelete    = signal<UserDTO | null>(null);
  newUser         = signal<UserDTO>(this.initUser());

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.users().filter(u =>
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term)  ||
      u.roleName?.toLowerCase().includes(term)  ||
      u.siteName?.toLowerCase().includes(term)  ||
      u.email?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void { this.loadInitialData(); }

  loadInitialData(): void {
    this.isPageLoading.set(true);
    this.refreshUsers();
    this.adminService.getRoles().subscribe({ next: r => this.roles.set(r), error: e => console.error(e) });
    this.adminService.getSites().subscribe({ next: r => this.sites.set(r), error: e => console.error(e) });
  }

  refreshUsers(): void {
    this.adminService.getUsers().subscribe({
      next: res => { this.users.set(res); this.isPageLoading.set(false); },
      error: ()  => this.isPageLoading.set(false)
    });
  }

  initUser(): UserDTO {
    return { userName:'', email:'', firstName:'', lastName:'', roleName:'', siteName:'', isActive:1, authorities:[] };
  }

  isEmailValid(email = ''): boolean { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); }
  isNameValid(name  = ''): boolean  { return /^[a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ\s\-]+$/.test(name); }

  openModal(user?: UserDTO): void {
    this.isEditMode.set(!!user);
    this.newUser.set(user ? { ...user } : this.initUser());
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.newUser.set(this.initUser()); this.isLoading.set(false); }

  saveUser(): void {
    const user = this.newUser();
    if (!this.isEmailValid(user.email))                                         { alert('E-mail invalide.');                 return; }
    if (!this.isNameValid(user.firstName) || !this.isNameValid(user.lastName))  { alert('Nom/prénom invalide.');             return; }
    if (!user.userName || !user.roleName)                                       { alert('Username et rôle obligatoires.');   return; }

    const id = user.id ?? (user as any).userId;
    if (this.isEditMode() && !id) { alert("Impossible d'identifier l'utilisateur."); return; }

    this.isLoading.set(true);
    const obs = this.isEditMode()
      ? this.adminService.updateUser(id, user)
      : this.adminService.createUser(user);

    obs.subscribe({
      next:  ()  => { this.refreshUsers(); this.closeModal(); },
      error: err => { this.isLoading.set(false); alert(err.error?.message ?? `Erreur (${err.status})`); }
    });
  }

  // ── Toggle statut directement en base ─────────────────
  toggleStatus(user: UserDTO): void {
    const id = user.id ?? (user as any).userId;
    if (!id) return;
    const updated = { ...user, isActive: user.isActive === 1 ? 0 : 1 };
    this.adminService.updateUser(id, updated).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(u => (u.id === id || (u as any).userId === id) ? updated : u)
        );
      },
      error: err => console.error('Erreur toggle statut:', err)
    });
  }

  openDeleteModal(user: UserDTO): void { this.userToDelete.set(user); this.deleteForce.set(false); this.showDeleteModal.set(true); }
  cancelDelete(): void                  { this.showDeleteModal.set(false); this.userToDelete.set(null); this.deleteForce.set(false); }

  confirmDelete(): void {
    const user = this.userToDelete();
    const id   = user?.id ?? (user as any)?.userId;
    if (!user || !id) return;
    const del$ = this.deleteForce()
      ? this.adminService.forceDeleteUser(id)
      : this.adminService.deleteUser(id);
    del$.subscribe({
      next:  () => { this.cancelDelete(); this.refreshUsers(); },
      error: err => console.error('Erreur suppression:', err)
    });
  }

  updateSearch(e: Event): void { this.searchTerm.set((e.target as HTMLInputElement).value); }
}