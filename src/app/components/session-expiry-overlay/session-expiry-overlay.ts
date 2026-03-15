import { Component, signal, inject, OnDestroy, effect } from '@angular/core';
import { Router } from '@angular/router';
import { SessionExpiryOverlayService } from '../../services/session-expiry-overlay';
import { FormDraftService }            from '../../services/form-draft';

@Component({
  selector: 'app-session-expiry-overlay',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="seo-backdrop" role="alertdialog" aria-modal="true" aria-live="assertive">
        <div class="seo-card">

          <div class="seo-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>

          <h1 class="seo-title">Session expirée</h1>

          <p class="seo-sub">
            Votre session a expiré par mesure de sécurité.<br>
            Redirection dans&nbsp;
            <span class="seo-count">{{ countdown() }}</span>&nbsp;s…
          </p>

          <div class="seo-track">
            <div class="seo-fill" [style.width.%]="progressPct()"></div>
          </div>

          @if (hasDraft()) {
            <div class="seo-draft">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Votre travail a été sauvegardé et sera restauré après reconnexion.
            </div>
          }

          <button class="seo-btn" (click)="redirectNow()">
            Se reconnecter maintenant
          </button>

        </div>
      </div>
    }
  `,
  styles: [`
    .seo-backdrop {
      position:fixed; inset:0; z-index:9999;
      background:rgba(8,14,38,.86); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      animation:seoBd .3s ease;
    }
    @keyframes seoBd   { from{opacity:0} to{opacity:1} }
    @keyframes seoCard { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:none} }
    .seo-card {
      background:#fff; border-radius:24px; padding:2.75rem 2.5rem 2.25rem;
      max-width:440px; width:calc(100% - 2rem); text-align:center;
      box-shadow:0 40px 100px rgba(0,0,0,.4);
      animation:seoCard .35s cubic-bezier(.22,.68,0,1.2) .05s both;
    }
    .seo-icon {
      width:90px; height:90px; border-radius:50%;
      background:#fef3c7; border:3px solid #fde68a;
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 1.5rem; color:#b45309;
    }
    .seo-title { font-size:1.9rem; font-weight:700; color:#111827; margin:0 0 .8rem; letter-spacing:-.3px; }
    .seo-sub   { font-size:.95rem; color:#6b7280; line-height:1.75; margin:0 0 1.5rem; }
    .seo-count { font-size:1.45rem; font-weight:700; color:#e55b2e; display:inline-block; min-width:24px; }
    .seo-track { height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden; margin-bottom:1.2rem; }
    .seo-fill  {
      height:100%; background:linear-gradient(90deg,#28c8a0,#405189);
      border-radius:4px; transition:width 1s linear;
    }
    .seo-draft {
      display:flex; align-items:center; justify-content:center; gap:.5rem;
      font-size:.8rem; color:#059669; background:#ecfdf5;
      border:1px solid #a7f3d0; border-radius:10px;
      padding:.6rem 1rem; margin:0 0 1.4rem; line-height:1.5;
    }
    .seo-btn {
      width:100%; padding:.85rem; background:#28c8a0; color:#fff; border:none;
      border-radius:12px; font-size:.95rem; font-weight:600; cursor:pointer;
      box-shadow:0 4px 16px rgba(40,200,160,.32); transition:background .2s;
    }
    .seo-btn:hover { background:#22a988; }
  `]
})
export class SessionExpiryOverlayComponent implements OnDestroy {
  private readonly router         = inject(Router);
  private readonly overlayService = inject(SessionExpiryOverlayService);
  private readonly draftService   = inject(FormDraftService);

  readonly visible     = signal(false);
  readonly countdown   = signal(5);
  readonly progressPct = signal(100);
  readonly hasDraft    = signal(false);

  private intervalId?: ReturnType<typeof setInterval>;
  private readonly DURATION = 5;

  constructor() {
    effect(() => {
      if (this.overlayService.isVisible() && !this.visible()) {
        this.start();
      }
    });
  }

  private start(): void {
    this.hasDraft.set(this.draftService.hasAny());
    this.countdown.set(this.DURATION);
    this.progressPct.set(100);
    this.visible.set(true);

    this.intervalId = setInterval(() => {
      const next = this.countdown() - 1;
      this.countdown.set(next);
      this.progressPct.set(Math.max(0, (next / this.DURATION) * 100));
      if (next <= 0) this.redirectNow();
    }, 1000);
  }

  redirectNow(): void {
    clearInterval(this.intervalId);
    this.visible.set(false);
    this.overlayService.hide();
    this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
  }

  ngOnDestroy(): void { clearInterval(this.intervalId); }
}