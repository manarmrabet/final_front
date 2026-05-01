// src/app/components/anomaly-dashboard/anomaly-dashboard.component.ts
// NOUVEAU DESIGN — PrimeIcons + palette industrielle slate/amber/rose

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AnomalyService, AnomalyAlertDTO, MlHealth } from '../../services/anomaly.service';

@Component({
  selector: 'app-anomaly-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="dash">



      <!-- ══ CONTENU PRINCIPAL ══════════════════════════════════ -->
      <main class="main">

        <!-- En-tête -->
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title">Détection d'anomalies</h1>
            <p class="page-sub">Surveillance ML des mouvements de stock</p>
          </div>
          <div class="topbar-actions">
            <button class="btn-ghost" (click)="checkHealth()">
              <i class="pi pi-wifi"></i>
              <span>Vérifier API</span>
            </button>
            <button class="btn-outline" (click)="loadData()" [disabled]="loading()">
              <i class="pi pi-refresh" [class.spin]="loading()"></i>
              <span>{{ loading() ? 'Chargement...' : 'Rafraîchir' }}</span>
            </button>
            <button class="btn-primary" (click)="triggerBatch()" [disabled]="triggering()">
              <i class="pi pi-bolt"></i>
              <span>{{ triggering() ? 'En cours...' : 'Lancer détection' }}</span>
            </button>
          </div>
        </header>

        <!-- Messages -->
        @if (successMsg()) {
          <div class="toast toast-success">
            <i class="pi pi-check-circle"></i>
            {{ successMsg() }}
          </div>
        }
        @if (errorMsg()) {
          <div class="toast toast-error">
            <i class="pi pi-times-circle"></i>
            {{ errorMsg() }}
          </div>
        }

        <!-- ── KPIs ─────────────────────────────────────────── -->
        <section class="kpi-row">

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Anomalies détectées</span>
              <div class="kpi-icon-wrap kpi-slate">
                <i class="pi pi-list-check"></i>
              </div>
            </div>
            <div class="kpi-val">{{ logs().length }}</div>
            <div class="kpi-foot">7 derniers jours</div>
          </div>

          <div class="kpi-card kpi-card--rose">
            <div class="kpi-top">
              <span class="kpi-label">Alertes critiques</span>
              <div class="kpi-icon-wrap kpi-rose">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
            </div>
            <div class="kpi-val">{{ alertCount() }}</div>
            <div class="kpi-foot">Score ≥ seuil alerte</div>
          </div>

          <div class="kpi-card kpi-card--amber">
            <div class="kpi-top">
              <span class="kpi-label">Score moyen</span>
              <div class="kpi-icon-wrap kpi-amber">
                <i class="pi pi-chart-line"></i>
              </div>
            </div>
            <div class="kpi-val">{{ avgScore() }}<span class="kpi-unit">%</span></div>
            <div class="kpi-foot">Consensus ISO + LOF</div>
          </div>

          <div class="kpi-card kpi-card--teal">
            <div class="kpi-top">
              <span class="kpi-label">Emails envoyés</span>
              <div class="kpi-icon-wrap kpi-teal">
                <i class="pi pi-send"></i>
              </div>
            </div>
            <div class="kpi-val">{{ alertCount() }}</div>
            <div class="kpi-foot">SMTP vers responsable</div>
          </div>

        </section>

        <!-- ── Tableau ───────────────────────────────────────── -->
        <section class="table-section">
          <div class="table-header">
            <h2 class="table-title">
              <i class="pi pi-table"></i>
              Journal des anomalies
            </h2>
            <span class="table-count">{{ logs().length }} entrée(s)</span>
          </div>

          @if (loading()) {
            <div class="state-box">
              <div class="loader-ring"></div>
              <p>Analyse en cours...</p>
            </div>
          } @else if (logs().length === 0) {
            <div class="state-box">
              <i class="pi pi-check-circle state-icon state-ok"></i>
              <p class="state-title">Aucune anomalie détectée</p>
              <p class="state-sub">Les 7 derniers jours sont dans la norme.</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th><i class="pi pi-calendar th-icon"></i>Date</th>
                    <th><i class="pi pi-user th-icon"></i>Opérateur</th>
                    <th><i class="pi pi-box th-icon"></i>Article</th>
                    <th><i class="pi pi-map-marker th-icon"></i>Emplacement</th>
                    <th class="right"><i class="pi pi-database th-icon"></i>Qté Avant</th>
                    <th class="right"><i class="pi pi-minus-circle th-icon"></i>Qté Sortie</th>
                    <th class="center">Score</th>
                    <th class="center">ISO</th>
                    <th class="center">LOF</th>
                    <th class="center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of logs(); track log.transferId) {
                    <tr [class.tr-alert]="log.anomalyScore >= 0.70"
                        [class.tr-watch]="log.anomalyScore >= 0.50 && log.anomalyScore < 0.70">

                      <td class="td-date">{{ formatDate(log.mouvementDate) }}</td>



                      <td>{{ log.operateur || '—' }}</td>
                      <td class="td-mono">{{ log.article || '—' }}</td>
                      <td>{{ log.emplacement || '—' }}</td>

                      <td class="right td-mono">{{ log.qteAvant }}</td>
                      <td class="right td-mono">{{ log.qteSortie }}</td>

                      <td class="center">
                        <div class="score-wrap">
                          <div class="score-bar-bg">
                            <div class="score-bar"
                              [style.width.%]="log.anomalyScore * 100"
                              [class.bar-rose]="log.anomalyScore >= 0.70"
                              [class.bar-amber]="log.anomalyScore >= 0.50 && log.anomalyScore < 0.70"
                              [class.bar-teal]="log.anomalyScore < 0.50">
                            </div>
                          </div>
                          <span class="score-txt"
                            [class.txt-rose]="log.anomalyScore >= 0.70"
                            [class.txt-amber]="log.anomalyScore >= 0.50 && log.anomalyScore < 0.70"
                            [class.txt-teal]="log.anomalyScore < 0.50">
                            {{ (log.anomalyScore * 100).toFixed(0) }}%
                          </span>
                        </div>
                      </td>

                      <td class="center">
                        <span class="flag-chip"
                          [class.chip-anormal]="log.isoFlag === 1"
                          [class.chip-normal]="log.isoFlag !== 1">
                          <i class="pi" [class.pi-times]="log.isoFlag === 1" [class.pi-check]="log.isoFlag !== 1"></i>
                          {{ log.isoFlag === 1 ? 'Anormal' : 'Normal' }}
                        </span>
                      </td>

                      <td class="center">
                        <span class="flag-chip"
                          [class.chip-anormal]="log.lofFlag === 1"
                          [class.chip-normal]="log.lofFlag !== 1">
                          <i class="pi" [class.pi-times]="log.lofFlag === 1" [class.pi-check]="log.lofFlag !== 1"></i>
                          {{ log.lofFlag === 1 ? 'Anormal' : 'Normal' }}
                        </span>
                      </td>

                      <td class="center">
                        @if (log.anomalyScore >= 0.70) {
                          <span class="status-chip chip-sent">
                            <i class="pi pi-send"></i>
                            Email envoyé
                          </span>
                        } @else {
                          <span class="status-chip chip-watch">
                            <i class="pi pi-eye"></i>
                            Surveillé
                          </span>
                        }
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
    @import url('https://cdnjs.cloudflare.com/ajax/libs/primeicons/7.0.0/primeicons.css');

    :host {
      --slate-950: #0a0f1e;
      --slate-900: #0f1629;
      --slate-800: #1a2340;
      --slate-700: #253058;
      --slate-600: #3b4a72;
      --slate-400: #7b8cb8;
      --slate-300: #adb8d4;
      --slate-200: #d4daea;
      --slate-100: #eef0f7;
      --slate-50:  #f7f8fc;

      --rose-600:  #e1365b;
      --rose-400:  #f06680;
      --rose-100:  #fde8ed;

      --amber-600: #d97706;
      --amber-400: #f59e0b;
      --amber-100: #fef3c7;

      --teal-600:  #0d9488;
      --teal-400:  #2dd4bf;
      --teal-100:  #ccfbf1;

      --body-font: 'DM Sans', sans-serif;
      --mono-font: 'DM Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .dash {
      display: flex;
      min-height: 100vh;
      background: var(--slate-50);
      font-family: var(--body-font);
    }

    /* ── SIDEBAR ──────────────────────────────────── */
    .sidebar {
      width: 220px;
      min-height: 100vh;
      background: var(--slate-950);
      display: flex;
      flex-direction: column;
      padding: 0;
      flex-shrink: 0;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }

    .brand-mark {
      width: 10px;
      height: 10px;
      background: var(--rose-600);
      border-radius: 3px;
      flex-shrink: 0;
      box-shadow: 0 0 12px var(--rose-600);
    }

    .brand-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.02em;
    }

    .sidebar-nav {
      padding: 16px 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--slate-400);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
    }
    .nav-item:hover { background: rgba(255,255,255,.05); color: var(--slate-200); }
    .nav-item .pi { font-size: 15px; }

    .nav-active {
      background: rgba(225,54,91,.12) !important;
      color: var(--rose-400) !important;
    }

    .sidebar-status {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,.06);
      margin-top: auto;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-ok      { background: var(--teal-400); box-shadow: 0 0 6px var(--teal-400); }
    .dot-err     { background: var(--rose-600); }
    .dot-pending { background: var(--amber-400); }

    .status-label {
      font-size: 0.76rem;
      color: var(--slate-300);
      font-weight: 500;
    }

    .status-model {
      font-size: 0.7rem;
      color: var(--slate-600);
      padding-left: 15px;
    }

    /* ── MAIN ─────────────────────────────────────── */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 0 0 32px;
    }

    /* ── TOPBAR ───────────────────────────────────── */
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 28px 18px;
      border-bottom: 1px solid var(--slate-200);
      background: #fff;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-title {
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--slate-900);
      letter-spacing: -0.02em;
    }

    .page-sub {
      font-size: 0.8rem;
      color: var(--slate-400);
      margin-top: 2px;
    }

    .topbar-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-ghost, .btn-outline, .btn-primary {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: 8px;
      font-family: var(--body-font);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn-ghost, .btn-outline, .btn-primary { .pi { font-size: 13px; } }

    .btn-ghost {
      background: transparent;
      color: var(--slate-600);
      border: 1px solid var(--slate-200);
    }
    .btn-ghost:hover { background: var(--slate-100); color: var(--slate-800); }

    .btn-outline {
      background: #fff;
      color: var(--slate-700);
      border: 1px solid var(--slate-200);
    }
    .btn-outline:hover { border-color: var(--slate-400); }

    .btn-primary {
      background: var(--rose-600);
      color: #fff;
    }
    .btn-primary:hover { background: var(--rose-400); }
    .btn-primary:disabled, .btn-outline:disabled { opacity: .5; cursor: not-allowed; }

    @keyframes spin-anim { to { transform: rotate(360deg); } }
    .spin { animation: spin-anim .7s linear infinite; }

    /* ── TOASTS ───────────────────────────────────── */
    .toast {
      margin: 12px 28px 0;
      padding: 11px 16px;
      border-radius: 8px;
      font-size: 0.83rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toast-success { background: var(--teal-100); color: var(--teal-600); }
    .toast-error   { background: var(--rose-100); color: var(--rose-600); }

    /* ── KPI ROW ──────────────────────────────────── */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 20px 28px 0;
    }

    .kpi-card {
      background: #fff;
      border-radius: 12px;
      padding: 18px 20px;
      border: 1px solid var(--slate-200);
      transition: box-shadow 0.2s;
    }
    .kpi-card:hover { box-shadow: 0 4px 20px rgba(10,15,30,.07); }
    .kpi-card--rose  { border-top: 3px solid var(--rose-600); }
    .kpi-card--amber { border-top: 3px solid var(--amber-400); }
    .kpi-card--teal  { border-top: 3px solid var(--teal-600); }

    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .kpi-label {
      font-size: 0.76rem;
      color: var(--slate-400);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kpi-icon-wrap .pi { font-size: 14px; }

    .kpi-slate { background: var(--slate-100); color: var(--slate-700); }
    .kpi-rose  { background: var(--rose-100);  color: var(--rose-600); }
    .kpi-amber { background: var(--amber-100); color: var(--amber-600); }
    .kpi-teal  { background: var(--teal-100);  color: var(--teal-600); }

    .kpi-val {
      font-size: 2.1rem;
      font-weight: 600;
      color: var(--slate-900);
      line-height: 1;
      letter-spacing: -0.03em;
    }

    .kpi-unit {
      font-size: 1.1rem;
      color: var(--slate-400);
      font-weight: 400;
    }

    .kpi-foot {
      font-size: 0.73rem;
      color: var(--slate-400);
      margin-top: 4px;
    }

    /* ── TABLE SECTION ────────────────────────────── */
    .table-section {
      margin: 20px 28px 0;
      background: #fff;
      border-radius: 12px;
      border: 1px solid var(--slate-200);
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--slate-100);
    }

    .table-title {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--slate-800);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .table-title .pi { color: var(--slate-400); font-size: 15px; }

    .table-count {
      font-size: 0.76rem;
      color: var(--slate-400);
      background: var(--slate-100);
      padding: 3px 10px;
      border-radius: 20px;
    }

    /* States */
    .state-box {
      padding: 64px 20px;
      text-align: center;
      color: var(--slate-400);
    }

    .loader-ring {
      width: 40px; height: 40px;
      border: 3px solid var(--slate-200);
      border-top-color: var(--rose-600);
      border-radius: 50%;
      animation: spin-anim .7s linear infinite;
      margin: 0 auto 16px;
    }

    .state-icon { font-size: 2.5rem; display: block; margin: 0 auto 12px; }
    .state-ok   { color: var(--teal-400); }
    .state-title { font-size: 0.95rem; font-weight: 600; color: var(--slate-600); }
    .state-sub   { font-size: 0.8rem; margin-top: 4px; }

    /* Table */
    .table-wrap { overflow-x: auto; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    .data-table thead tr {
      background: var(--slate-50);
    }

    .data-table th {
      padding: 10px 14px;
      text-align: left;
      font-size: 0.73rem;
      font-weight: 600;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid var(--slate-200);
      white-space: nowrap;
    }
    .data-table th.right  { text-align: right; }
    .data-table th.center { text-align: center; }

    .th-icon { font-size: 11px; margin-right: 5px; opacity: 0.7; }

    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--slate-100);
      color: var(--slate-700);
      vertical-align: middle;
    }
    .data-table td.right  { text-align: right; }
    .data-table td.center { text-align: center; }

    .tr-alert { background: rgba(225,54,91,.025); }
    .tr-watch { background: rgba(217,119,6,.02); }

    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover td { background: var(--slate-50); }

    .td-date { color: var(--slate-400); font-size: 0.78rem; white-space: nowrap; }
    .td-mono { font-family: var(--mono-font); font-size: 0.79rem; }

    .id-pill {
      font-family: var(--mono-font);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--slate-800);
      background: var(--slate-100);
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Score bar */
    .score-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 100px;
    }

    .score-bar-bg {
      flex: 1;
      height: 4px;
      background: var(--slate-100);
      border-radius: 2px;
      overflow: hidden;
    }

    .score-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s;
    }
    .bar-rose  { background: var(--rose-600); }
    .bar-amber { background: var(--amber-400); }
    .bar-teal  { background: var(--teal-400); }

    .score-txt {
      font-family: var(--mono-font);
      font-size: 0.78rem;
      font-weight: 500;
      min-width: 34px;
      text-align: right;
    }
    .txt-rose  { color: var(--rose-600); }
    .txt-amber { color: var(--amber-600); }
    .txt-teal  { color: var(--teal-600); }

    /* Flag chips */
    .flag-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 500;
    }
    .flag-chip .pi { font-size: 10px; }

    .chip-anormal { background: var(--rose-100); color: var(--rose-600); }
    .chip-normal  { background: var(--teal-100);  color: var(--teal-600); }

    /* Status chips */
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.74rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .status-chip .pi { font-size: 11px; }

    .chip-sent  { background: var(--rose-100);  color: var(--rose-600); }
    .chip-watch { background: var(--slate-100); color: var(--slate-500); }

    /* Responsive */
    @media (max-width: 900px) {
      .sidebar { display: none; }
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .kpi-row { grid-template-columns: 1fr 1fr; }
      .topbar  { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class AnomalyDashboardComponent implements OnInit {

  logs       = signal<AnomalyAlertDTO[]>([]);
  health     = signal<MlHealth | null>(null);
  loading    = signal(false);
  triggering = signal(false);
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  alertCount = computed(() => this.logs().filter(l => l.anomalyScore >= 0.70).length);
  avgScore   = computed(() => {
    const ls = this.logs();
    if (!ls.length) return '0';
    return ((ls.reduce((s, l) => s + l.anomalyScore, 0) / ls.length) * 100).toFixed(0);
  });

  constructor(private anomalyService: AnomalyService) {}

  ngOnInit() {
    this.checkHealth();
    this.loadData();
  }

  checkHealth() {
    this.anomalyService.checkMlHealth().subscribe({
      next:  h => this.health.set(h),
      error: () => this.health.set({ status: 'error', models_loaded: false })
    });
  }

  loadData() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.anomalyService.getAnomalies().subscribe({
      next:  data => { this.logs.set(data); this.loading.set(false); },
      error: err  => {
        this.errorMsg.set(`Erreur chargement : ${err.status}`);
        this.loading.set(false);
      }
    });
  }

  triggerBatch() {
    this.triggering.set(true);
    this.successMsg.set(null);
    this.errorMsg.set(null);
    this.anomalyService.triggerDetection().subscribe({
      next: msg => {
        this.successMsg.set(msg);
        this.triggering.set(false);
        setTimeout(() => this.loadData(), 3000);
      },
      error: err => {
        this.errorMsg.set(`Erreur : ${err.status}`);
        this.triggering.set(false);
      }
    });
  }

  formatDate(d: string): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('fr-FR'); }
    catch { return d; }
  }
}
