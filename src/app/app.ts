import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService }       from './services/auth/auth';
import { InactivityService } from './services/auth/inactivity';
import { TokenWarningBannerComponent }   from './components/token-warning-banner/token-warning-banner';
import { SessionExpiryOverlayComponent } from './components/session-expiry-overlay/session-expiry-overlay';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TokenWarningBannerComponent, SessionExpiryOverlayComponent],
  template: `
    <app-token-warning-banner/>
    <router-outlet/>
    <app-session-expiry-overlay/>
  `,
})
export class App implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly inactivity = inject(InactivityService);

  ngOnInit(): void {
    // Reprendre le timer après refresh de page si token encore valide
    if (this.auth.currentUserValue && !this.auth.isLocked()) {
      this.inactivity.start((url) => this.auth.lockSession(url));
    }
  }
}