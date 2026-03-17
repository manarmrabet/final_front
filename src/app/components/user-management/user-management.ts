import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../services/admin/admin';
import { DataStoreService } from '../../services/dataStore/data-store';
import { UserDTO, Role, Site } from '../../models/user.model';

// Correction Erreur Locale "fr" (Image 3)
registerLocaleData(localeFr);

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private dataStore    = inject(DataStoreService);

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
  sendingMailId   = signal<number | null>(null);

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

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isPageLoading.set(true);

    // setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError (Image 3)
    setTimeout(() => {
      if (this.dataStore.users.length > 0) {
        this.users.set(this.dataStore.users);
        this.isPageLoading.set(false);
      }
    });

    this.dataStore.users$.subscribe(u => {
      this.users.set(u);
      this.isPageLoading.set(false);
    });
    this.dataStore.roles$.subscribe(r => this.roles.set(r));
    this.dataStore.sites$.subscribe(s => this.sites.set(s));

    if (!this.dataStore.users.length) {
      this.dataStore.loadAll();
    } else {
      this.dataStore.refreshRoles();
      this.dataStore.refreshSites();
    }
  }

  initUser(): UserDTO {
    return {
      userName: '',
      email: '',
      firstName: '',
      lastName: '',
      roleName: '',
      siteName: '',
      isActive: 1,
      authorities: [],
      mustChangePassword: true, // Correction TS2353 (Image 4)
      credentialsSent: false
    };
  }

  private getUserId(user: UserDTO | null): number | undefined {
    return user?.id ?? (user as any)?.Id;
  }

  openModal(user?: UserDTO): void {
    this.isEditMode.set(!!user);
    this.newUser.set(user ? { ...user } : this.initUser());
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.newUser.set(this.initUser());
    this.isLoading.set(false);
  }

  saveUser(): void {
    const user = this.newUser();
    if (!this.isEmailValid(user.email)) { alert('E-mail invalide.'); return; }
    if (!this.isNameValid(user.firstName) || !this.isNameValid(user.lastName)) { alert('Nom/prénom invalide.'); return; }

    const id = this.getUserId(user);
    if (this.isEditMode() && !id) {
      alert("Impossible d'identifier l'utilisateur.");
      return;
    }

    this.isLoading.set(true);
    const obs = this.isEditMode()
      ? this.adminService.updateUser(id!, user)
      : this.adminService.createUser(user);

    obs.subscribe({
      next: (saved) => {
        this.isEditMode() ? this.dataStore.updateUserLocally(user) : this.dataStore.addUserLocally(saved);
        this.dataStore.refreshUsers();
        this.closeModal();
      },
      error: err => {
        this.isLoading.set(false);
        alert(err.error?.message ?? `Erreur (${err.status})`);
      }
    });
  }

  toggleStatus(user: UserDTO): void {
    const id = this.getUserId(user);
    if (!id) return;
    const updated = { ...user, isActive: user.isActive === 1 ? 0 : 1 };
    this.adminService.updateUser(id, updated).subscribe({
      next: () => this.dataStore.updateUserLocally(updated),
      error: err => console.error('Erreur toggle statut:', err)
    });
  }

  sendCredentials(user: UserDTO): void {
    const id = this.getUserId(user);
    if (!id) return;
    this.sendingMailId.set(id);
    this.adminService.sendCredentials(id).subscribe({
      next: () => {
        this.dataStore.updateUserLocally({ ...user, credentialsSent: true });
        this.sendingMailId.set(null);
        alert(`Email envoyé à ${user.email}`);
      },
      error: () => this.sendingMailId.set(null)
    });
  }

  openDeleteModal(user: UserDTO): void {
    this.userToDelete.set(user);
    this.deleteForce.set(false);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  confirmDelete(): void {
    const user = this.userToDelete();
    const id = this.getUserId(user!);
    if (!user || !id) return;

    const del$ = this.deleteForce() ? this.adminService.forceDeleteUser(id) : this.adminService.deleteUser(id);
    del$.subscribe({
      next: () => {
        this.dataStore.removeUserLocally(id);
        this.dataStore.refreshUsers();
        this.cancelDelete();
      }
    });
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  isEmailValid(email = ''): boolean { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); }
  isNameValid(name = ''): boolean { return /^[a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ\s\-]+$/.test(name); }
}
