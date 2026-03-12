import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserDTO } from '../../models/user.model';
import { API } from '../../utils/api-endpoints';

interface JwtPayload {
  sub: string;
  authorities?: string[];
  roles?: string[];
  exp?: number;
}

interface LoginResponse { token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly router  = inject(Router);
  private readonly subject = new BehaviorSubject<UserDTO | null>(null);
  readonly currentUser$    = this.subject.asObservable();

  constructor() {
    const token = localStorage.getItem('token');
    if (token) {
      try { this.subject.next(this.decode(token)); }
      catch { this.clearStorage(); }
    }
  }

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, credentials).pipe(
      tap(res => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.subject.next(this.decode(res.token));
        }
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  private decode(token: string): UserDTO {
    try {
      const payload: JwtPayload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const raw   = payload.authorities || payload.roles || [];
      const roles = (Array.isArray(raw) ? raw : [raw]).map((r: string) => {
        const n = r.trim().toUpperCase().replace(/\s+/g, '_');
        return n.startsWith('ROLE_') ? n : `ROLE_${n}`;
      });
      return {
        userName:    payload.sub || '',
        authorities: roles,
        email:       '',
        firstName:   '',
        lastName:    '',
        roleName:    '',
      };
    } catch {
      return {
        userName:    '',
        authorities: [],
        email:       '',
        firstName:   '',
        lastName:    '',
        roleName:    '',
      };
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
    this.subject.next(null);
  }

  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      this.http.post(API.AUTH.LOGOUT, {}, { headers }).pipe(
        catchError(() => throwError(() => null))
      ).subscribe({
        next:  () => console.log('Logout enregistré'),
        error: () => console.warn('Backend logout inaccessible')
      });
    }
    this.clearStorage();
    this.router.navigate(['/login']);
  }
}