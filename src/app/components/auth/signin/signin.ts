import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { InactivityService } from '../../../services/auth/inactivity';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signin.html',
  styleUrls: ['./signin.scss'],
  host: { ngSkipHydration: 'true' }
})
export class SigninComponent {
  private cd     = inject(ChangeDetectorRef);
  private router = inject(Router);
  private auth   = inject(AuthService);
  private readonly inactivity = inject(InactivityService);
  private readonly route = inject(ActivatedRoute);

  error        = signal('');
  showPassword = signal(false);
  isLoading    = signal(false);
  attemptsLeft = signal(3);
  isBlocked    = signal(false);
  loginModal   = signal({ username: '', password: '' });

  onSubmit(event: Event): void {
    event.preventDefault();

    if (this.isBlocked()) {
      this.error.set('Compte temporairement bloqué.');
      return;
    }

    const { username, password } = this.loginModal();

    if (!username.trim() || !password.trim()) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }

    this.error.set('');
    this.isLoading.set(true);
    this.cd.detectChanges();

    this.auth.login({ username, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.attemptsLeft.set(3);
        this.cd.detectChanges();
        this.inactivity.start();
        this.router.navigate(['/app/dashboard']); 
        
      },
      error: (err: any) => {
        this.isLoading.set(false);

        if (err.status === 401) {
          this.attemptsLeft.update(v => v - 1);
          if (this.attemptsLeft() <= 0) {
            this.isBlocked.set(true);
            this.error.set('Accès bloqué : 3 tentatives échouées.');
          } else {
            this.error.set(`Identifiants incorrects. Il vous reste ${this.attemptsLeft()} tentative(s).`);
          }
        } else if (err.status === 403) {
          this.isBlocked.set(true);
          this.error.set('Compte bloqué. Contactez l\'administrateur.');
        } else {
          this.error.set('Utilisateur non enregistré ou erreur serveur.');
        }

        this.cd.detectChanges();
      }
    });
  }
  

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }
  readonly sessionMessage = signal('');
 
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['reason'] === 'session_expired') {
        this.sessionMessage.set('Votre session a expiré. Veuillez vous reconnecter.');
      }
    });
  }

}
