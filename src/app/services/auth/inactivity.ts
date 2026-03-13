import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private readonly router    = inject(Router);
  private readonly auth      = inject(AuthService);
  private readonly zone      = inject(NgZone);

  private readonly TIMEOUT_MS = 20 * 10000; 
  private timer!: ReturnType<typeof setTimeout>;
  private readonly events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  private readonly handler = () => this.reset();

  
  start(): void {
    this.stop();
    this.zone.runOutsideAngular(() => {
      this.events.forEach(e => document.addEventListener(e, this.handler, { passive: true }));
      this.scheduleTimer();
    });
  }

  stop(): void {
    clearTimeout(this.timer);
    this.events.forEach(e => document.removeEventListener(e, this.handler));
  }

  private reset(): void {
    clearTimeout(this.timer);
    this.scheduleTimer();
  }

  private scheduleTimer(): void {
    this.timer = setTimeout(() => {
      this.zone.run(() => this.lock());
    }, this.TIMEOUT_MS);
  }

  private lock(): void {
    const current = this.router.url;
    if (!current.startsWith('/lock')) {
      this.auth.lockSession(current);
      this.router.navigate(['/lock']);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}