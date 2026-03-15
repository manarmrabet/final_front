import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../services/admin/admin';
import { DataStoreService } from '../../services/dataStore/data-store';
import { UserDTO, Role, Site } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private dataStore    = inject(DataStoreService);  // ← service partagé

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

    // Charger depuis le DataStore si déjà chargé, sinon déclencher loadAll
    if (this.dataStore.users.length > 0) {
      this.users.set(this.dataStore.users);
      this.isPageLoading.set(false);
    }

    // S'abonner aux changements du store → mise à jour locale auto
    this.dataStore.users$.subscribe(u => {
      this.users.set(u);
      this.isPageLoading.set(false);
    });
    this.dataStore.roles$.subscribe(r => this.roles.set(r));
    this.dataStore.sites$.subscribe(s => this.sites.set(s));

    // Charger tout si pas encore fait
    if (!this.dataStore.users.length) this.dataStore.loadAll();
    else {
      this.dataStore.refreshRoles();
      this.dataStore.refreshSites();
    }
  }

  refreshUsers(): void {
    // Rafraîchit le store → tous les composants abonnés reçoivent les nouvelles données
    this.dataStore.refreshUsers();
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
    if (!this.isEmailValid(user.email))                                        { alert('E-mail invalide.');               return; }
    if (!this.isNameValid(user.firstName) || !this.isNameValid(user.lastName)) { alert('Nom/prénom invalide.');           return; }
    if (!user.userName || !user.roleName)                                      { alert('Username et rôle obligatoires.'); return; }

    const id = user.id ?? (user as any).userId;
    if (this.isEditMode() && !id) { alert("Impossible d'identifier l'utilisateur."); return; }

    this.isLoading.set(true);
    const obs = this.isEditMode()
      ? this.adminService.updateUser(id, user)
      : this.adminService.createUser(user);

    obs.subscribe({
      next: (saved) => {
        if (this.isEditMode()) {
          this.dataStore.updateUserLocally(user); // mise à jour optimiste immédiate
        } else {
          this.dataStore.addUserLocally(saved);   // ajout optimiste immédiat
        }
        this.dataStore.refreshUsers();            // sync avec le backend
        this.closeModal();
      },
      error: err => { this.isLoading.set(false); alert(err.error?.message ?? `Erreur (${err.status})`); }
    });
  }

  toggleStatus(user: UserDTO): void {
    const id = user.id ?? (user as any).userId;
    if (!id) return;
    const updated = { ...user, isActive: user.isActive === 1 ? 0 : 1 };
    this.adminService.updateUser(id, updated).subscribe({
      next: () => {
        this.dataStore.updateUserLocally(updated); // dashboard stats se mettent à jour immédiatement
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
      next: () => {
        this.dataStore.removeUserLocally(id); // suppression optimiste immédiate
        this.dataStore.refreshUsers();         // sync backend
        this.cancelDelete();
      },
      error: err => console.error('Erreur suppression:', err)
    });
  }

  updateSearch(e: Event): void { this.searchTerm.set((e.target as HTMLInputElement).value); }
}
