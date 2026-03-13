import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService }       from '../../services/auth/auth';
import { InactivityService } from '../../services/auth/inactivity';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lock-screen.html',
  styleUrls:  ['./lock-screen.scss'],
})
export class LockScreenComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly inactivity = inject(InactivityService);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly fb         = inject(FormBuilder);

  readonly form = this.fb.group({ password: ['', Validators.required] });

  readonly loading         = signal(false);
  readonly errorMessage    = signal('');
  readonly showPassword    = signal(false);
  readonly isTokenExpiring = signal(false);   // lock déclenché par pré-expiration

  userName     = '';
  userInitials = '';

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    if (!user) { this.router.navigate(['/login']); return; }

    this.userName     = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}` : user.userName;
    this.userInitials = this.buildInitials(this.userName);

    this.route.queryParams.subscribe(p =>
      this.isTokenExpiring.set(p['reason'] === 'token_expiring')
    );
  }

  togglePassword(): void { this.showPassword.update(v => !v); }

  onUnlock(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.unlock(this.form.value.password ?? '').subscribe({
      next: () => {
        this.loading.set(false);
        this.inactivity.start();
        this.router.navigateByUrl(this.auth.getRedirectUrl());
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 && this.auth.isTokenExpired(localStorage.getItem('token') ?? '')) {
          // Token expiré entre le lock et la saisie → login complet
          this.auth.forceLogout();
          this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
        } else {
          this.errorMessage.set('Mot de passe incorrect. Veuillez réessayer.');
        }
      },
    });
  }

  goToLogin(): void { this.auth.logout(); }

  private buildInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
}