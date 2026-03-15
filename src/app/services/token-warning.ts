import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenWarningService {
  /** true = afficher la warning banner */
  readonly isWarning   = signal(false);
  /** ms restantes avant expiration (mis à jour chaque seconde) */
  readonly remainingMs = signal(0);

  private tickerId?: ReturnType<typeof setInterval>;

  /** Démarrer le countdown (appelé par AuthService) */
  start(expiresAtMs: number): void {
    this.stop();
    this.isWarning.set(true);
    this.tick(expiresAtMs);
    this.tickerId = setInterval(() => this.tick(expiresAtMs), 1000);
  }

  private tick(expiresAtMs: number): void {
    const remaining = Math.max(0, expiresAtMs - Date.now());
    this.remainingMs.set(remaining);
    if (remaining <= 0) this.stop();
  }

  /** Masquer la bannière (après refresh réussi ou logout) */
  hide(): void {
    this.stop();
    this.isWarning.set(false);
    this.remainingMs.set(0);
  }

  stop(): void { clearInterval(this.tickerId); }
}