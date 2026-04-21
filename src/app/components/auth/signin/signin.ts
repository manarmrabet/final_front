import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { InactivityService } from '../../../services/auth/inactivity';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signin.html',
  styleUrls: ['./signin.scss'],
})
export class SigninComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly inactivity = inject(InactivityService);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly fb         = inject(FormBuilder);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly loading    = signal(false);
  readonly errorMsg   = signal('');
  readonly sessionMsg = signal('');
  readonly showPwd    = signal(false);

  ngOnInit(): void {
    // Message si redirigé après expiration de session
    this.route.queryParams.subscribe(p => {
      if (p['reason'] === 'session_expired') {
        this.sessionMsg.set('Votre session a expiré. Veuillez vous reconnecter.');
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.value as { username: string; password: string };

    this.auth.login({ username, password }).subscribe({
      next: () => {
        this.loading.set(false);
        // Démarrer le timer d'inactivité après connexion réussie
        this.inactivity.start((url) => this.auth.lockSession(url));
        this.router.navigate(['/app/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
      this.loading.set(false);

      let message = 'Une erreur est survenue. Veuillez réessayer.';

      if (err.status === 401) {
        // Cas des identifiants incorrects + calcul tentatives restantes
        // Comme votre backend fait .body(errorMessage), err.error contient la String
        message = typeof err.error === 'string' ? err.error : 'Identifiants incorrects.';
      }
      else if (err.status === 403) {
        // Cas du compte bloqué (FORBIDDEN)
        message = typeof err.error === 'string' ? err.error : 'Ce compte est bloqué.';
      }
      else if (err.status === 0) {
        message = 'Serveur inaccessible. Vérifiez votre connexion.';
      }

      this.errorMsg.set(message);
          },
    });
  }
}
