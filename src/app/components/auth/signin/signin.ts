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

        // --- CORRECTION ICI ---
        // On récupère le message envoyé par le backend (AuthController)
        // Si err.error est une chaîne (ResponseEntity.body("...")), on l'affiche.
        // Sinon, on cherche une propriété .message ou on met un message par défaut.

        let message = 'Une erreur est survenue. Veuillez réessayer.';

        if (err.status === 401 || err.status === 403) {
            // Le backend renvoie soit une String brute, soit un objet avec un champ message
            message = (typeof err.error === 'string') ? err.error : (err.error?.message || 'Identifiants incorrects.');
        } else if (err.status === 0) {
            message = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
        }

        this.errorMsg.set(message);
        // -----------------------
      },
    });
  }
}
