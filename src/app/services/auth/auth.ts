import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDTO } from '../../models/user.model';
import { API } from '../../utils/api-endpoints';
import { TokenWarningService }         from '../token-warning';
import { SessionExpiryOverlayService } from '../session-expiry-overlay';

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

/**
 * 5 minutes avant expiration :
 *  - si session active  → afficher la WARNING BANNER (refresh possible sans quitter la page)
 *  - si session lockée → overlay 5s → /login directement
 */
const WARN_BEFORE_MS = 4000000;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly http    = inject(HttpClient);
  private readonly router  = inject(Router);
  private readonly warning = inject(TokenWarningService);
  private readonly overlay = inject(SessionExpiryOverlayService);

  private readonly subject = new BehaviorSubject<UserDTO | null>(null);
  readonly currentUser$    = this.subject.asObservable();

  /** true quand la session est verrouillée par inactivité (30 min sans mouvement) */
  readonly isLocked = signal<boolean>(false);

  private redirectUrl   = '/app/dashboard';
  private expiryTimer?: ReturnType<typeof setTimeout>;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  constructor() {
    const token = localStorage.getItem('token');
    if (token) {
      if (this.isTokenExpired(token)) {
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
    if (sessionStorage.getItem('isLocked') === 'true') this.isLocked.set(true);
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, credentials).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.subject.next(this.decode(res.token));
          this.isLocked.set(false);
          this.warning.hide();
          sessionStorage.removeItem('isLocked');
          sessionStorage.removeItem('lockReturnUrl');
          this.scheduleExpiryActions(res.token);
        }
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Unlock (depuis lock screen OU mini-modale warning banner) ─────────────
  unlock(password: string): Observable<LoginResponse> {
    const username = this.currentUserValue?.userName ?? '';
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, { username, password }).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.subject.next(this.decode(res.token));
          this.isLocked.set(false);
          this.warning.hide();
          sessionStorage.removeItem('isLocked');
          sessionStorage.removeItem('lockReturnUrl');
          this.scheduleExpiryActions(res.token);
        }
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Lock ──────────────────────────────────────────────────────────────────
  lockSession(returnUrl: string = '/app/dashboard'): void {
    this.redirectUrl = returnUrl;
    this.isLocked.set(true);
    sessionStorage.setItem('isLocked', 'true');
    sessionStorage.setItem('lockReturnUrl', returnUrl);
  }

  getRedirectUrl(): string {
    return sessionStorage.getItem('lockReturnUrl') ?? this.redirectUrl;
  }

  /** Appelé par l'intercepteur HTTP sur 401/403-expiré */
  forceLogout(): void {
    this.clearStorage();
    clearTimeout(this.expiryTimer);
    this.warning.hide();
  }

  // ── Logout manuel ─────────────────────────────────────────────────────────
  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      this.http.post(API.AUTH.LOGOUT, {}, { headers }).pipe(
        catchError(() => throwError(() => null))
      ).subscribe({ error: () => console.warn('Backend logout inaccessible') });
    }
    this.forceLogout();
    this.router.navigate(['/login']);
  }

  // ── Planification expiration ───────────────────────────────────────────────
  /**
   * LOGIQUE COMPLÈTE :
   *
   * T1 = exp - 5min
   *   Cas A — session ACTIVE (pas lockée) :
   *     → Afficher la WARNING BANNER avec compte à rebours + bouton "Rafraîchir"
   *     → Si l'user clique Rafraîchir : mini-modale mdp → nouveau token → continue
   *     → Si l'user ne fait rien : T2 se déclenche
   *
   *   Cas B — session LOCKÉE (inactivité déjà déclenchée) :
   *     → Lock + expiry simultanés → overlay 5s → /login directement (pas de lock screen)
   *
   * T2 = exp exacte (si pas de refresh depuis T1)
   *     → forceLogout + overlay 5s → /login
   *
   * INACTIVITÉ (géré par InactivityService, indépendant) :
   *     → après 30 min sans mouvement → lockSession() + navigate('/lock')
   *     → sur /lock : si user tape mdp → unlock() → retour à la page précédente
   *     → sur /lock : si token expire PENDANT l'attente → T2 ci-dessus → /login direct
   */
  scheduleExpiryActions(token: string): void {
    clearTimeout(this.expiryTimer);
    this.warning.stop();

    try {
      const { exp } = this.parsePayload(token);
      if (!exp) return;

      const expiresAtMs = exp * 1000;
      const expiresInMs = expiresAtMs - Date.now();
      const warnInMs    = expiresInMs - WARN_BEFORE_MS;

      console.log(`[Auth] Token expire dans ${Math.round(expiresInMs / 1000)}s | bannière dans ${Math.round(Math.max(0, warnInMs) / 1000)}s`);

      if (expiresInMs <= 0) {
        this.forceLogout();
        this.overlay.show();
        return;
      }

      const triggerWarn = () => {
        // Cas B : lockée + expiry → logout direct sans lock screen
        if (this.isLocked()) {
          console.warn('[Auth] Session lockée + token expiré → /login direct');
          this.forceLogout();
          this.overlay.show();
          return;
        }

        // Cas A : session active → bannière warning
        console.log('[Auth] Affichage warning banner');
        this.warning.start(expiresAtMs);

        // T2 : si toujours pas refreshé à expiry exacte
        const remaining = expiresAtMs - Date.now();
        this.expiryTimer = setTimeout(() => {
          this.warning.hide();
          console.warn('[Auth] Token expiré sans refresh → overlay → /login');
          this.forceLogout();
          this.overlay.show();
        }, remaining);
      };

      if (warnInMs > 0) {
        this.expiryTimer = setTimeout(triggerWarn, warnInMs);
      } else {
        // Déjà dans les 5 dernières minutes
        triggerWarn();
      }

    } catch (e) {
      console.error('[Auth] Erreur scheduleExpiryActions:', e);
      this.forceLogout();
    }
  }

  // ── Helpers token ─────────────────────────────────────────────────────────
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

  // ── Decode JWT ────────────────────────────────────────────────────────────
  private parsePayload(token: string): JwtPayload {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  }

  private decode(token: string): UserDTO {
    try {
      const p   = this.parsePayload(token);
      const raw = p.authorities || p.roles || [];
      const roles = (Array.isArray(raw) ? raw : [raw]).map((r: string) => {
        const n = r.trim().toUpperCase().replace(/\s+/g, '_');
        return n.startsWith('ROLE_') ? n : `ROLE_${n}`;
      });
      return {
        userName:    p.sub         || '',
        firstName:   p.firstName   || '',
        lastName:    p.lastName    || '',
        email:       p.email       || '',
        roleName:    roles[0]      || '',
        authorities: roles,
      };
    } catch {
      return { userName: '', authorities: [], email: '', firstName: '', lastName: '', roleName: '' };
    }
  }

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