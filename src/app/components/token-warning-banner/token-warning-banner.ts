import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TokenWarningService } from '../../services/token-warning';
import { AuthService }         from '../../services/auth/auth';
import { InactivityService }   from '../../services/auth/inactivity';

@Component({
  selector: 'app-token-warning-banner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- ── Bannière orange fixe en haut ── -->
    @if (warningService.isWarning()) {
      <div class="twb-banner" role="alert" aria-live="polite">
        <div class="twb-inner">
          <svg class="twb-clock" width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="twb-msg">
            Session expire dans&nbsp;<strong>{{ formattedTime() }}</strong>
          </span>
          <div class="twb-bar-wrap" role="progressbar" [attr.aria-valuenow]="progressPct()">
            <div class="twb-bar-fill" [style.width.%]="progressPct()"></div>
          </div>
          <button class="twb-btn" (click)="openModal()" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Rafraîchir
          </button>
        </div>
      </div>
    }

    <!-- ── Mini-modale mot de passe ── -->
    @if (modalOpen()) {
      <div class="twb-overlay" (click)="onBdClick($event)"
           role="dialog" aria-modal="true" aria-labelledby="twb-title">
        <div class="twb-modal">

          <div class="twb-mh">
            <div class="twb-micon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 id="twb-title" class="twb-mt">Confirmer votre identité</h2>
              <p class="twb-ms">Saisissez votre mot de passe pour prolonger la session.</p>
            </div>
            <button class="twb-close" (click)="closeModal()" aria-label="Fermer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="twb-mb" novalidate>
            <label class="twb-lbl" for="twb-pwd">Mot de passe</label>
            <div class="twb-iw">
              <input id="twb-pwd" class="twb-input"
                     [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password"
                     placeholder="••••••••"
                     autocomplete="current-password"/>
              <button type="button" class="twb-eye" (click)="showPwd.update(v => !v)"
                      [attr.aria-label]="showPwd() ? 'Masquer' : 'Afficher'">
                @if (!showPwd()) {
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                } @else {
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                }
              </button>
            </div>
            @if (errMsg()) {
              <p class="twb-err" role="alert">{{ errMsg() }}</p>
            }
            <div class="twb-actions">
              <button type="button" class="twb-cancel" (click)="closeModal()">Annuler</button>
              <button type="submit" class="twb-confirm" [disabled]="form.invalid || loading()">
                @if (!loading()) { Prolonger la session }
                @else { <span class="twb-spin"></span> }
              </button>
            </div>
          </form>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Bannière ─────────────────────────────────────────────── */
    .twb-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1050;
      background: #7c3d0a; color: #fef3c7;
      animation: twbDown .3s ease;
    }
    @keyframes twbDown { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
    .twb-inner {
      display: flex; align-items: center; gap: 10px;
      max-width: 1400px; margin: 0 auto; padding: 7px 20px;
    }
    .twb-clock { flex-shrink:0; color:#fcd34d; }
    .twb-msg   { font-size:.875rem; white-space:nowrap; }
    .twb-msg strong { color:#fcd34d; font-weight:700; font-size:1rem; }
    .twb-bar-wrap {
      flex:1; height:4px; background:rgba(255,255,255,.2);
      border-radius:2px; overflow:hidden; min-width:60px;
    }
    .twb-bar-fill { height:100%; background:#fcd34d; border-radius:2px; transition:width 1s linear; }
    .twb-btn {
      display:flex; align-items:center; gap:5px; flex-shrink:0;
      background:#fcd34d; color:#7c3d0a; border:none; border-radius:6px;
      padding:5px 13px; font-size:.8rem; font-weight:700; cursor:pointer;
      white-space:nowrap; transition:background .15s;
    }
    .twb-btn:hover { background:#fbbf24; }

    /* ── Overlay ──────────────────────────────────────────────── */
    .twb-overlay {
      position:fixed; inset:0; z-index:2000;
      background:rgba(8,14,38,.6); backdrop-filter:blur(4px);
      display:flex; align-items:center; justify-content:center;
      animation:twbBd .2s ease;
    }
    @keyframes twbBd  { from{opacity:0} to{opacity:1} }
    @keyframes twbUp  { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:none} }
    .twb-modal {
      background:#fff; border-radius:18px; width:min(420px,calc(100vw - 2rem));
      box-shadow:0 24px 60px rgba(0,0,0,.28);
      animation:twbUp .25s cubic-bezier(.22,.68,0,1.15) both;
    }

    /* ── Header modale ────────────────────────────────────────── */
    .twb-mh {
      display:flex; align-items:flex-start; gap:12px; padding:1.4rem 1.4rem .9rem;
    }
    .twb-micon {
      width:42px; height:42px; border-radius:12px; flex-shrink:0;
      background:#fef3c7; border:1.5px solid #fde68a;
      display:flex; align-items:center; justify-content:center; color:#b45309;
    }
    .twb-mt { font-size:1rem; font-weight:700; color:#111827; margin:0 0 .2rem; }
    .twb-ms { font-size:.8rem; color:#6b7280; margin:0; line-height:1.5; }
    .twb-close {
      margin-left:auto; background:none; border:none; cursor:pointer;
      color:#9ca3af; padding:4px; border-radius:6px; display:flex;
      transition:color .15s, background .15s;
    }
    .twb-close:hover { color:#374151; background:#f3f4f6; }

    /* ── Corps modale ─────────────────────────────────────────── */
    .twb-mb  { padding:0 1.4rem 1.4rem; }
    .twb-lbl { display:block; font-size:.78rem; font-weight:600; color:#374151; margin-bottom:.35rem; }
    .twb-iw  { position:relative; }
    .twb-input {
      width:100%; box-sizing:border-box; padding:.6rem 2.4rem .6rem .85rem;
      border:1.5px solid #d1d5db; border-radius:8px; font-size:.875rem;
      color:#111827; outline:none; transition:border-color .15s, box-shadow .15s;
    }
    .twb-input:focus { border-color:#28c8a0; box-shadow:0 0 0 3px rgba(40,200,160,.15); }
    .twb-input::placeholder { color:#9ca3af; }
    .twb-eye {
      position:absolute; right:.7rem; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; padding:0;
    }
    .twb-eye:hover { color:#374151; }
    .twb-err { font-size:.78rem; color:#ef4444; margin:.35rem 0 0; }
    .twb-actions { display:flex; gap:8px; margin-top:1.1rem; }
    .twb-cancel {
      flex:1; padding:.65rem; border:1.5px solid #d1d5db; border-radius:9px;
      background:#fff; color:#374151; font-size:.875rem; font-weight:600; cursor:pointer;
      transition:background .15s;
    }
    .twb-cancel:hover { background:#f9fafb; }
    .twb-confirm {
      flex:2; padding:.65rem; border:none; border-radius:9px;
      background:#28c8a0; color:#fff; font-size:.875rem; font-weight:600; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(40,200,160,.28); transition:background .15s;
    }
    .twb-confirm:hover:not(:disabled) { background:#22a988; }
    .twb-confirm:disabled { opacity:.65; cursor:not-allowed; }
    .twb-spin {
      width:16px; height:16px; border:2px solid rgba(255,255,255,.4);
      border-top-color:#fff; border-radius:50%; animation:twbSpin .7s linear infinite;
    }
    @keyframes twbSpin { to{transform:rotate(360deg)} }
  `]
})
export class TokenWarningBannerComponent implements OnDestroy {
  readonly warningService = inject(TokenWarningService);
  private readonly auth        = inject(AuthService);
  private readonly inactivity  = inject(InactivityService);
  private readonly fb          = inject(FormBuilder);

  readonly form    = this.fb.group({ password: ['', Validators.required] });
  readonly modalOpen = signal(false);
  readonly showPwd   = signal(false);
  readonly loading   = signal(false);
  readonly errMsg    = signal('');

  readonly progressPct = computed(() =>
    Math.max(0, Math.min(100, (this.warningService.remainingMs() / 300_000) * 100))
  );

  readonly formattedTime = computed(() => {
    const s = Math.max(0, Math.ceil(this.warningService.remainingMs() / 1000));
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  });

  openModal(): void {
    this.errMsg.set('');
    this.form.reset();
    this.modalOpen.set(true);
    setTimeout(() => (document.getElementById('twb-pwd') as HTMLInputElement)?.focus(), 60);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.form.reset();
    this.errMsg.set('');
  }

  onBdClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('twb-overlay')) this.closeModal();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errMsg.set('');

    this.auth.unlock(this.form.value.password ?? '').subscribe({
      next: () => {
        this.loading.set(false);
        this.closeModal();
        // Relancer le timer d'inactivité avec le nouveau token
        this.inactivity.start((url) => this.auth.lockSession(url));
      },
      error: (err) => {
        this.loading.set(false);
        this.errMsg.set(
          err?.status === 401 || err?.status === 403
            ? 'Mot de passe incorrect.'
            : 'Erreur réseau, réessayez.'
        );
      },
    });
  }

  ngOnDestroy(): void {}
}