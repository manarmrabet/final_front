import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  showUserMenu = signal(false);
  isDark       = signal(false);

  get user() { return this.auth.currentUserValue; }

  get initials(): string {
    const u = this.user;
    if (!u) return '?';
    const f = u.firstName?.[0] ?? '';
    const l = u.lastName?.[0]  ?? '';
    return (f + l).toUpperCase() || u.userName?.[0]?.toUpperCase() || '?';
  }

  get fullName(): string {
    const u = this.user;
    if (!u) return '';
    if (u.firstName || u.lastName) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return u.userName;
  }

  toggleDark(): void { this.isDark.update(v => !v); }
  toggleUserMenu(): void { this.showUserMenu.update(v => !v); }

  logout(): void { this.auth.logout(); }
}