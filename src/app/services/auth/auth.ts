import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDTO } from '../../models/user.model';
import { API } from '../../utils/api-endpoints';

interface JwtPayload {
  sub: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  authorities?: string[];
  roles?: string[];
  exp?: number;
  iat?: number;
}

interface LoginResponse { token: string; }

/** Combien de ms avant expiration on verrouille l'écran pour forcer re-auth */
const LOCK_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly subject = new BehaviorSubject<UserDTO | null>(null);
  readonly currentUser$    = this.subject.asObservable();

  /** Signal: session verrouillée par inactivité ou pré-expiration */
  readonly isLocked = signal<boolean>(false);

  private redirectUrl  = '/dashboard';
  private expiryTimer?: ReturnType<typeof setTimeout>;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  constructor() {
    const token = localStorage.getItem('token');
    if (token) {
      if (this.isTokenExpired(token)) {
        // Token déjà expiré au chargement → login obligatoire
        this.clearStorage();
      } else {
        try {
          this.subject.next(this.decode(token));
          this.scheduleExpiryActions(token);
        } catch {
          this.clearStorage();
        }
      }
    }
    const locked = sessionStorage.getItem('isLocked') === 'true';
    if (locked) this.isLocked.set(true);
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, credentials).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.subject.next(this.decode(res.token));
          this.isLocked.set(false);
          sessionStorage.removeItem('isLocked');
          sessionStorage.removeItem('lockReturnUrl');
          this.scheduleExpiryActions(res.token);
        }
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Unlock (lock screen) ──────────────────────────────────────────────────
  unlock(password: string): Observable<LoginResponse> {
    const username = this.currentUserValue?.userName ?? '';
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, { username, password }).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.subject.next(this.decode(res.token));
          this.isLocked.set(false);
          sessionStorage.removeItem('isLocked');
          sessionStorage.removeItem('lockReturnUrl');
          this.scheduleExpiryActions(res.token);  // repart le timer avec le nouveau token
        }
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Lock / Unlock helpers ─────────────────────────────────────────────────
  lockSession(returnUrl: string = '/dashboard'): void {
    this.redirectUrl = returnUrl;
    this.isLocked.set(true);
    sessionStorage.setItem('isLocked', 'true');
    sessionStorage.setItem('lockReturnUrl', returnUrl);
  }

  getRedirectUrl(): string {
    return sessionStorage.getItem('lockReturnUrl') ?? this.redirectUrl;
  }

  /**
   * Appelé par l'intercepteur HTTP sur 401 (token expiré côté serveur).
   * La navigation est faite par l'intercepteur lui-même.
   */
  forceLogout(): void {
    this.clearStorage();
    clearTimeout(this.expiryTimer);
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      this.http.post(API.AUTH.LOGOUT, {}, { headers }).pipe(
        catchError(() => throwError(() => null))
      ).subscribe({ error: () => console.warn('Backend logout inaccessible') });
    }
    this.clearStorage();
    clearTimeout(this.expiryTimer);
    this.router.navigate(['/login']);
  }

  // ── Token expiry ──────────────────────────────────────────────────────────

  isTokenExpired(token: string): boolean {
    try {
      const { exp } = this.parsePayload(token);
      if (!exp) return false;
      return Date.now() >= exp * 1000;
    } catch { return true; }
  }

  getTokenRemainingMs(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;
    try {
      const { exp } = this.parsePayload(token);
      if (!exp) return 0;
      return Math.max(0, exp * 1000 - Date.now());
    } catch { return 0; }
  }

  /**
   * Planifie deux timeouts :
   *
   *  T1 = expiry - 5min → verrouille l'écran (lock screen) pour forcer
   *       l'utilisateur à saisir son mdp → génère un nouveau token (30min de plus)
   *
   *  T2 = expiry exacte → si toujours sur lock screen sans avoir unlock,
   *       on efface la session et on redirige vers /login
   *       (l'endpoint /login ne nécessite pas de token → ça marche)
   */
  private scheduleExpiryActions(token: string): void {
    clearTimeout(this.expiryTimer);

    try {
      const { exp } = this.parsePayload(token);
      if (!exp) return;

      const expiresInMs = exp * 1000 - Date.now();
      const lockInMs    = expiresInMs - LOCK_BEFORE_EXPIRY_MS;

      if (expiresInMs <= 0) {
        // Déjà expiré
        this.forceLogout();
        this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
        return;
      }

      if (lockInMs > 0) {
        // Cas normal : on a plus de 5 min → verrouiller dans lockInMs
        this.expiryTimer = setTimeout(() => {
          const url = this.router.url;
          if (!url.startsWith('/lock') && !url.startsWith('/login')) {
            this.lockSession(url);
            this.router.navigate(['/lock'], { queryParams: { reason: 'token_expiring' } });
          }
          // Planifier le logout complet si toujours pas unlock dans 5 min
          this.expiryTimer = setTimeout(() => {
            if (this.isLocked()) {
              // Toujours verrouillé → token vraiment expiré → login complet
              this.forceLogout();
              this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
            }
          }, LOCK_BEFORE_EXPIRY_MS);
        }, lockInMs);

      } else {
        // Moins de 5 min restantes → verrouiller maintenant
        const url = this.router.url;
        if (!url.startsWith('/lock') && !url.startsWith('/login')) {
          this.lockSession(url);
          this.router.navigate(['/lock'], { queryParams: { reason: 'token_expiring' } });
        }
        // Logout dans le temps restant
        this.expiryTimer = setTimeout(() => {
          if (this.isLocked()) {
            this.forceLogout();
            this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
          }
        }, expiresInMs);
      }
    } catch {
      this.forceLogout();
    }
  }

  // ── Decode ────────────────────────────────────────────────────────────────
  private parsePayload(token: string): JwtPayload {
    return JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
  }

  private decode(token: string): UserDTO {
    try {
      const payload = this.parsePayload(token);
      const raw     = payload.authorities || payload.roles || [];
      const roles   = (Array.isArray(raw) ? raw : [raw]).map((r: string) => {
        const n = r.trim().toUpperCase().replace(/\s+/g, '_');
        return n.startsWith('ROLE_') ? n : `ROLE_${n}`;
      });
      return {
        userName:    payload.sub       || '',
        firstName:   payload.firstName || '',
        lastName:    payload.lastName  || '',
        email:       payload.email     || '',
        roleName:    roles[0]          || '',
        authorities: roles,
      };
    } catch {
      return { userName: '', authorities: [], email: '', firstName: '', lastName: '', roleName: '' };
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────
  get currentUserValue(): UserDTO | null { return this.subject.value; }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    if (!user?.authorities) return false;
    const r = role.trim().toUpperCase();
    return user.authorities.includes(r.startsWith('ROLE_') ? r : `ROLE_${r}`);
  }

  clearStorage(): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('isLocked');
    sessionStorage.removeItem('lockReturnUrl');
    this.subject.next(null);
  }

  ngOnDestroy(): void { clearTimeout(this.expiryTimer); }
}