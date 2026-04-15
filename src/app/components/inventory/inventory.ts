// src/app/components/inventory/inventory.component.ts

import { Component, OnInit, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { API } from '../../utils/api-endpoints';
import {
  InventorySession, CollectLine, InventoryReport, ReportLine,
  CreateSessionRequest, AddCollectLineRequest,
  COLLECT_FIELDS
} from '../../models/inventory.model';

declare const feather: any;

type ReportFilter = 'ALL' | 'CONFORME' | 'ECART' | 'MANQUANT' | 'SURPLUS';
const FILTERS: ReportFilter[] = ['ALL', 'CONFORME', 'ECART', 'MANQUANT', 'SURPLUS'];
type View = 'sessions' | 'lines' | 'report';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit, AfterViewChecked {

  // ── État global ───────────────────────────────────────────────────────────
  view: View = 'sessions';
  loadingSessions = true;
  loadingLines    = false;
  loadingReport   = false;
  saving          = false;
  errorMsg        = '';
  successMsg      = '';

  // ── Données ───────────────────────────────────────────────────────────────
  sessions:        InventorySession[] = [];
  selectedSession: InventorySession | null = null;
  lines:           CollectLine[]      = [];
  report:          InventoryReport | null = null;
  reportNotFound   = false;

  // ── ERP dropdowns ─────────────────────────────────────────────────────────
  erpWarehouses: string[] = [];
  erpZones:      string[] = [];
  loadingZones   = false;

  // ── Modals ────────────────────────────────────────────────────────────────
  showCreate   = false;
  showCollect  = false;
  showValidate = false;

  // ── Formulaire création session ───────────────────────────────────────────
  /** Champs disponibles (fixe) */
  readonly availableFields = [...COLLECT_FIELDS];

  newSession: CreateSessionRequest = {
    name: '', warehouseCode: '', warehouseLabel: '', warehouseZone: '', collectFields: []
  };

  /** État des cases à cocher (field → coché) */
  fieldChecked: Record<string, boolean> = {
    ARTICLE:    true,
    LOT:        true,
    EMPLACEMENT: false,
    QUANTITE:   true,
  };

  // ── Formulaire collecte ───────────────────────────────────────────────────
  collectLoc    = '';
  collectValues: Record<string, string> = {};

  // ── Pagination ────────────────────────────────────────────────────────────
  linesPage = 1; linesPageSize = 10;
  rptPage   = 1; rptPageSize   = 15;
  rptFilter: ReportFilter = 'ALL';
  readonly rptFilters = FILTERS;

  private needFeatherRefresh = false;

  // ── Computed ──────────────────────────────────────────────────────────────
  get uniqueLocationsCount(): number {
    return this.lines.length === 0
      ? 0
      : new Set(this.lines.map(l => l.locationCode)).size;
  }

  /** Champs cochés pour la session en cours de création */
  get checkedFields(): string[] {
    return this.availableFields.filter(f => this.fieldChecked[f]);
  }

  constructor(private svc: InventoryService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewChecked(): void {
    if (this.needFeatherRefresh) {
      this.needFeatherRefresh = false;
      try { feather.replace(); } catch (_) {}
    }
  }

  private refreshIcons(): void {
    this.needFeatherRefresh = true;
    this.cdr.detectChanges();
  }

  // ════════════════════════════════════════════════════════════════
  // CHARGEMENT INITIAL
  // ════════════════════════════════════════════════════════════════

  private loadAll(): void {
    this.loadingSessions = true;

    this.svc.getErpWarehouses().subscribe({
      next: w => { this.erpWarehouses = w; },
      error: () => { this.erpWarehouses = []; }
    });

    this.svc.getSessions().subscribe({
      next: s => {
        this.sessions = s || [];
        this.loadingSessions = false;
        this.refreshIcons();
      },
      error: () => {
        this.sessions = [];
        this.loadingSessions = false;
        this.err('Impossible de charger les sessions');
        this.refreshIcons();
      }
    });
  }

  loadSessions(): void {
    this.loadingSessions = true;
    this.svc.getSessions().subscribe({
      next: s => {
        this.sessions = s || [];
        this.loadingSessions = false;
        this.refreshIcons();
      },
      error: () => {
        this.sessions = [];
        this.loadingSessions = false;
        this.err('Impossible de charger les sessions');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // SESSIONS — CRÉATION
  // ════════════════════════════════════════════════════════════════

  openCreate(): void {
    this.newSession = {
      name: '',
      warehouseCode: this.erpWarehouses[0] || '',
      warehouseLabel: '',
      warehouseZone: '',
      collectFields: [],
    };
    // Réinitialiser les cases à cocher (EMPLACEMENT décoché par défaut)
    this.fieldChecked = {
      ARTICLE:    true,
      LOT:        true,
      EMPLACEMENT: false,
      QUANTITE:   true,
    };
    this.erpZones = [];
    if (this.newSession.warehouseCode) {
      this.loadZones(this.newSession.warehouseCode);
    }
    this.showCreate = true;
    this.refreshIcons();
  }

  /** Chargé quand le magasin change dans le formulaire */
  onWarehouseChange(): void {
    this.newSession.warehouseZone = '';
    this.erpZones = [];
    if (this.newSession.warehouseCode) {
      this.loadZones(this.newSession.warehouseCode);
    }
  }

  private loadZones(warehouseCode: string): void {
    this.loadingZones = true;
    this.svc.getErpZones(warehouseCode).subscribe({
      next: z => { this.erpZones = z; this.loadingZones = false; this.refreshIcons(); },
      error: () => { this.erpZones = []; this.loadingZones = false; }
    });
  }

  createSession(): void {
    if (!this.newSession.name?.trim()) {
      this.err('Le nom de la session est obligatoire'); return;
    }
    if (!this.newSession.warehouseCode?.trim()) {
      this.err('Le magasin est obligatoire'); return;
    }
    if (this.checkedFields.length === 0) {
      this.err('Sélectionnez au moins un champ de collecte'); return;
    }

    this.newSession.collectFields = this.checkedFields;
    this.saving = true;

    this.svc.createSession(this.newSession).subscribe({
      next: s => {
        this.sessions.unshift(s);
        this.showCreate = false;
        this.saving = false;
        this.ok(`Session "${s.name}" créée ✅`);
        this.refreshIcons();
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur lors de la création');
        this.saving = false;
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // SESSIONS — VALIDATION
  // ════════════════════════════════════════════════════════════════

  askValidate(s: InventorySession, e?: Event): void {
    e?.stopPropagation();
    this.selectedSession = s;
    this.showValidate = true;
    this.refreshIcons();
  }

  confirmValidate(): void {
    if (!this.selectedSession) return;
    this.saving = true;
    this.svc.validateSession(this.selectedSession.id).subscribe({
      next: updated => {
        this._patchSession(updated);
        this.selectedSession = updated;
        this.showValidate = false;
        this.saving = false;
        this.ok('Session validée ✅');
        this.refreshIcons();
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur validation');
        this.saving = false;
      }
    });
  }

  private _patchSession(s: InventorySession): void {
    const i = this.sessions.findIndex(x => x.id === s.id);
    if (i !== -1) this.sessions[i] = s;
  }

  // ════════════════════════════════════════════════════════════════
  // LIGNES
  // ════════════════════════════════════════════════════════════════

  openLines(s: InventorySession): void {
    this.selectedSession = s;
    this.view = 'lines';
    this.lines = [];
    this.linesPage = 1;
    this.loadingLines = true;
    this.refreshIcons();

    this.svc.getLines(s.id).subscribe({
      next: l => {
        this.lines = l || [];
        this.loadingLines = false;
        this.refreshIcons();
      },
      error: () => {
        this.err('Erreur chargement de la collecte');
        this.loadingLines = false;
        this.refreshIcons();
      }
    });
  }

  openCollectModal(): void {
    this.collectLoc = '';
    this.collectValues = {};
    // Initialiser les valeurs selon les champs de la session
    (this.selectedSession?.collectFields ?? []).forEach(f => this.collectValues[f] = '');
    this.showCollect = true;
    this.refreshIcons();
  }

  addLine(): void {
    if (!this.collectLoc.trim()) { this.err('Emplacement obligatoire'); return; }
    for (const f of (this.selectedSession?.collectFields ?? [])) {
      if (!this.collectValues[f]?.trim()) { this.err(`"${f}" obligatoire`); return; }
    }

    this.saving = true;
    const req: AddCollectLineRequest = {
      sessionId:    this.selectedSession!.id,
      locationCode: this.collectLoc.trim().toUpperCase(),
      locationLabel: '',
      values: { ...this.collectValues }
    };

    this.svc.addLine(req).subscribe({
      next: line => {
        this.lines.unshift(line);
        this._patchSession({ ...this.selectedSession!, totalLines: this.lines.length });
        this.showCollect = false;
        this.saving = false;
        this.ok('Ligne ajoutée ✅');
        this.refreshIcons();
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur ajout');
        this.saving = false;
      }
    });
  }

  delLine(id: number): void {
    if (!confirm('Supprimer cette ligne ?')) return;
    this.svc.deleteLine(id).subscribe({
      next: () => {
        this.lines = this.lines.filter(l => l.id !== id);
        if (this.selectedSession) this.selectedSession.totalLines = this.lines.length;
        this.refreshIcons();
      }
    });
  }

  get pagedLines(): CollectLine[] {
    const start = (this.linesPage - 1) * this.linesPageSize;
    return this.lines.slice(start, start + this.linesPageSize);
  }

  get linesTotalPages(): number {
    return Math.max(1, Math.ceil(this.lines.length / this.linesPageSize));
  }

  lineHeaders(): string[] {
    return this.lines.length > 0 ? Object.keys(this.lines[0].values) : [];
  }

  // ════════════════════════════════════════════════════════════════
  // RAPPORT
  // ════════════════════════════════════════════════════════════════

  openReport(s: InventorySession): void {
    this.selectedSession = s;
    this.view = 'report';
    this.report = null;
    this.reportNotFound = false;
    this.rptPage = 1;
    this.rptFilter = 'ALL';
    this.loadingReport = true;
    this.refreshIcons();

    this.svc.getReport(s.id).subscribe({
      next: r => {
        this.report = r;
        this.loadingReport = false;
        this.refreshIcons();
      },
      error: err => {
        const msg = err.error?.message || err.message || '';
        if (err.status === 404 || msg.includes('Aucun rapport')) {
          this.reportNotFound = true;
        } else {
          this.err('Erreur lors du chargement du rapport');
        }
        this.loadingReport = false;
        this.refreshIcons();
      }
    });
  }

  generateReport(): void {
    if (!this.selectedSession) return;
    this.loadingReport = true;
    this.reportNotFound = false;

    this.svc.generateReport(this.selectedSession.id).subscribe({
      next: r => {
        this.report = r;
        this.loadingReport = false;
        this.ok('Rapport généré avec succès ✅');
        this.refreshIcons();
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur génération rapport');
        this.loadingReport = false;
      }
    });
  }

  setFilter(f: ReportFilter): void {
    this.rptFilter = f;
    this.rptPage = 1;
  }

  get filteredLines(): ReportLine[] {
    if (!this.report) return [];
    return this.rptFilter === 'ALL'
      ? this.report.lines
      : this.report.lines.filter(l => l.statut === this.rptFilter);
  }

  get pagedReport(): ReportLine[] {
    const start = (this.rptPage - 1) * this.rptPageSize;
    return this.filteredLines.slice(start, start + this.rptPageSize);
  }

  get rptTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLines.length / this.rptPageSize));
  }

  countStatut(f: ReportFilter): number {
    if (!this.report) return 0;
    return f === 'ALL'
      ? this.report.lines.length
      : this.report.lines.filter(l => l.statut === f).length;
  }

  sClass(s: string): string {
    const map: Record<string, string> = {
      CONFORME: 'badge-success', ECART: 'badge-warning',
      MANQUANT: 'badge-danger',  SURPLUS: 'badge-info'
    };
    return map[s] || '';
  }

  sIcon(s: string): string {
    const map: Record<string, string> = {
      CONFORME: '✅', ECART: '⚠️', MANQUANT: '🔴', SURPLUS: '🟡', ALL: '📋'
    };
    return map[s] || '';
  }

  // ════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════

  exportCollect(): void {
    if (!this.selectedSession) return;
    this.downloadWithAuth(
      API.INVENTORY.SESSIONS.EXPORT_COLLECT(this.selectedSession.id),
      `collecte_${this.selectedSession.warehouseCode}.xlsx`
    );
  }

  exportReport(): void {
    if (!this.selectedSession) return;
    this.downloadWithAuth(
      API.INVENTORY.SESSIONS.EXPORT_REPORT(this.selectedSession.id),
      `rapport_${this.selectedSession.name}.xlsx`
    );
  }

  private downloadWithAuth(url: string, filename: string): void {
    const token = localStorage.getItem('token')
               || localStorage.getItem('jwt')
               || sessionStorage.getItem('token');
    if (!token) { this.err('Vous devez être connecté pour exporter'); return; }

    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Erreur ${res.status}: ${text}`);
      }
      return res.blob();
    })
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      this.ok('Fichier téléchargé ✅');
    })
    .catch(err => this.err(err.message || 'Erreur téléchargement'));
  }

  // ════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════

  back(): void {
    this.view = 'sessions';
    this.selectedSession = null;
    this.report = null;
    this.reportNotFound = false;
    this.lines = [];
    this.errorMsg = '';
    this.successMsg = '';
    this.refreshIcons();
    if (this.sessions.length === 0) this.loadSessions();
  }

  // ════════════════════════════════════════════════════════════════
  // HELPERS UI
  // ════════════════════════════════════════════════════════════════

  get statusLabel(): Record<string, string> {
    return { EN_COURS: 'En cours', VALIDEE: 'Validée', CLOTUREE: 'Clôturée' };
  }

  get statusClass(): Record<string, string> {
    return { EN_COURS: 'status-active', VALIDEE: 'status-validated', CLOTUREE: 'status-closed' };
  }

  isNum(f: string): boolean {
    return ['QUANTITE', 'QTE'].includes(f.toUpperCase());
  }

  /** Label lisible pour un champ de collecte */
  fieldLabel(f: string): string {
    const labels: Record<string, string> = {
      ARTICLE:    'Article (t_item)',
      LOT:        'Lot (t_clot)',
      EMPLACEMENT: 'Emplacement (t_loca)',
      QUANTITE:   'Quantité (t_qhnd)',
    };
    return labels[f] ?? f;
  }

  /** Description courte pour les cases à cocher */
  fieldDesc(f: string): string {
    const desc: Record<string, string> = {
      ARTICLE:    'Code article ERP',
      LOT:        'Numéro de lot',
      EMPLACEMENT: 'Code emplacement',
      QUANTITE:   'Quantité comptée',
    };
    return desc[f] ?? '';
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private err(msg: string): void {
    this.errorMsg = msg;
    this.successMsg = '';
    setTimeout(() => this.errorMsg = '', 6000);
  }

  ok(msg: string): void {
    this.successMsg = msg;
    this.errorMsg = '';
    setTimeout(() => this.successMsg = '', 3000);
  }
}