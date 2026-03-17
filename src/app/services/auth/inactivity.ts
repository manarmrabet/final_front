import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly zone   = inject(NgZone);

  private readonly TIMEOUT_MS = 20000000; // 30 minutes
  private timer?: ReturnType<typeof setTimeout>;
  private readonly EVENTS  = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  private readonly handler = () => this.reset();
  private started          = false;

  // authService passé en paramètre pour éviter l'injection circulaire
  private lockFn?: (url: string) => void;

  /**
   * Démarrer après login réussi :
   *   this.inactivity.start((url) => this.auth.lockSession(url))
   */
  start(lockSession: (url: string) => void): void {
    this.lockFn = lockSession;
    if (this.started) this.stop();
    this.started = true;
    this.zone.runOutsideAngular(() => {
      this.EVENTS.forEach(e => document.addEventListener(e, this.handler, { passive: true }));
      this.scheduleTimer();
    });
    console.log('[Inactivity] Démarré (30 min)');
  }

  stop(): void {
    clearTimeout(this.timer);
    this.EVENTS.forEach(e => document.removeEventListener(e, this.handler));
    this.started = false;
  }

  /** Réinitialiser manuellement le timer (ex: après unlock) */
  reset(): void {
    clearTimeout(this.timer);
    this.scheduleTimer();
  }

  private scheduleTimer(): void {
    this.timer = setTimeout(() => {
      this.zone.run(() => this.triggerLock());
    }, this.TIMEOUT_MS);
  }

  private triggerLock(): void {
    const url = this.router.url;
    if (url.startsWith('/lock') || url.startsWith('/login')) return;
    console.warn('[Inactivity] 30 min sans activité → lock screen');
    this.lockFn?.(url);
    this.router.navigate(['/lock']);
  }

  ngOnDestroy(): void { this.stop(); }
}
