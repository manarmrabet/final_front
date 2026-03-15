import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { UserDTO, Role, Site } from '../../models/user.model';
import { AdminService } from '../admin/admin';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private adminService = inject(AdminService);

  // ── Sources de données réactives ─────────────────────────────────────────
  private _users  = new BehaviorSubject<UserDTO[]>([]);
  private _roles  = new BehaviorSubject<Role[]>([]);
  private _sites  = new BehaviorSubject<Site[]>([]);
  private _loaded = new BehaviorSubject<boolean>(false);

  // ── Observables publics ──────────────────────────────────────────────────
  users$  = this._users.asObservable();
  roles$  = this._roles.asObservable();
  sites$  = this._sites.asObservable();
  loaded$ = this._loaded.asObservable();

  // ── Getters synchrones ───────────────────────────────────────────────────
  get users(): UserDTO[] { return this._users.getValue(); }
  get roles(): Role[]    { return this._roles.getValue(); }
  get sites(): Site[]    { return this._sites.getValue(); }

  // ── Chargement initial ou refresh complet ────────────────────────────────
  loadAll(): void {
    forkJoin({
      users: this.adminService.getUsers(),
      roles: this.adminService.getRoles(),
      sites: this.adminService.getSites()
    }).subscribe({
      next: ({ users, roles, sites }) => {
        this._users.next(users);
        this._roles.next(roles);
        this._sites.next(sites);
        this._loaded.next(true);
      },
      error: (err) => console.error('DataStore loadAll error:', err)
    });
  }

  // ── Refresh ciblés (appelés après chaque opération CRUD) ─────────────────
  refreshUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => this._users.next(users),
      error: (err)  => console.error('DataStore refreshUsers error:', err)
    });
  }

  refreshRoles(): void {
    this.adminService.getRoles().subscribe({
      next: (roles) => this._roles.next(roles),
      error: (err)  => console.error('DataStore refreshRoles error:', err)
    });
  }

  refreshSites(): void {
    this.adminService.getSites().subscribe({
      next: (sites) => this._sites.next(sites),
      error: (err)  => console.error('DataStore refreshSites error:', err)
    });
  }

  // ── Mise à jour optimiste (sans appel HTTP) ───────────────────────────────
  updateUserLocally(updated: UserDTO): void {
    const id = updated.id ?? (updated as any).userId;
    this._users.next(
      this._users.getValue().map(u =>
        (u.id === id || (u as any).userId === id) ? updated : u
      )
    );
  }

  removeUserLocally(id: number): void {
    this._users.next(this._users.getValue().filter(u => u.id !== id && (u as any).userId !== id));
  }

  addUserLocally(user: UserDTO): void {
    this._users.next([...this._users.getValue(), user]);
  }
}
