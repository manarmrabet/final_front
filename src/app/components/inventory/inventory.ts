import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { API } from '../../utils/api-endpoints';
import {
  InventorySession, CollectLine, CollectTemplate,
  InventoryReport, ReportLine, CreateSessionRequest, AddCollectLineRequest
} from '../../models/inventory.model';

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
export class InventoryComponent implements OnInit {

  view: View = 'sessions';
  loadingSessions = true;
  loadingLines    = false;
  loadingReport   = false;
  saving          = false;
  errorMsg        = '';
  successMsg      = '';

  sessions:        InventorySession[]  = [];
  selectedSession: InventorySession | null = null;
  lines:           CollectLine[]       = [];
  templates:       CollectTemplate[]   = [];
  report:          InventoryReport | null = null;
  reportNotFound   = false;
  erpWarehouses:   string[]            = [];

  showCreate   = false;
  showTemplate = false;
  showCollect  = false;
  showValidate = false;

  newSession: CreateSessionRequest = { name: '', warehouseCode: '', warehouseLabel: '' };
  collectLoc    = '';
  collectValues: Record<string, string> = {};
  activeTemplate: CollectTemplate | null = null;
  tplName   = '';
  tplFields: string[] = ['ARTICLE', 'LOT', 'QUANTITE'];
  tplInput  = '';

  linesPage = 1; linesPageSize = 10;
  rptPage   = 1; rptPageSize   = 15;
  rptFilter: ReportFilter = 'ALL';
  readonly rptFilters = FILTERS;

  get uniqueLocationsCount(): number {
    return this.lines.length === 0 ? 0 : new Set(this.lines.map(l => l.locationCode)).size;
  }

  get activeTemplateName(): string {
    return this.activeTemplate?.name || 'Aucun';
  }

  constructor(private svc: InventoryService) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadTemplatesAndWarehouses();
  }

  private loadTemplatesAndWarehouses(): void {
    this.svc.getTemplates().subscribe({
      next: t => { this.templates = t; this.activeTemplate = t[0] ?? null; },
      error: () => console.warn('Templates non chargés')
    });

    this.svc.getErpWarehouses().subscribe({
      next: w => this.erpWarehouses = w
    });
  }

  loadSessions(): void {
    this.loadingSessions = true;
    this.svc.getSessions().subscribe({
      next: (s) => {
        this.sessions = s || [];
        this.loadingSessions = false;
      },
      error: (err) => {
        console.error('Erreur sessions:', err);
        this.sessions = [];
        this.loadingSessions = false;
        this.err('Impossible de charger les sessions');
      }
    });
  }

  // ====================== SESSIONS ======================
  openCreate(): void {
    this.newSession = { name: '', warehouseCode: '', warehouseLabel: '' };
    this.showCreate = true;
  }

  createSession(): void {
    if (!this.newSession.name?.trim() || !this.newSession.warehouseCode?.trim()) {
      this.err('Nom et magasin obligatoires'); return;
    }
    this.saving = true;
    this.svc.createSession(this.newSession).subscribe({
      next: s => {
        this.sessions.unshift(s);
        this.showCreate = false;
        this.saving = false;
        this.ok(`Session "${s.name}" créée`);
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur création');
        this.saving = false;
      }
    });
  }

  askValidate(s: InventorySession, e?: Event): void {
    e?.stopPropagation();
    this.selectedSession = s;
    this.showValidate = true;
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

  // ====================== LIGNES ======================
  openLines(s: InventorySession): void {
    this.selectedSession = s;
    this.view = 'lines';
    this.lines = [];
    this.linesPage = 1;
    this.loadingLines = true;

    this.svc.getLines(s.id).subscribe({
      next: l => {
        this.lines = l || [];
        this.loadingLines = false;
      },
      error: () => {
        this.err('Erreur chargement de la collecte');
        this.loadingLines = false;
      }
    });
  }

  openCollectModal(): void {
    if (!this.activeTemplate) {
      this.err('Créez d’abord un template');
      return;
    }
    this.collectLoc = '';
    this.collectValues = {};
    this.activeTemplate.fields.forEach(f => this.collectValues[f] = '');
    this.showCollect = true;
  }

  addLine(): void {
    if (!this.collectLoc.trim()) { this.err('Emplacement obligatoire'); return; }
    for (const f of this.activeTemplate!.fields) {
      if (!this.collectValues[f]?.trim()) { this.err(`"${f}" obligatoire`); return; }
    }

    this.saving = true;
    const req: AddCollectLineRequest = {
      sessionId: this.selectedSession!.id,
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
        this.ok('Ligne ajoutée');
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

  // ====================== RAPPORT ======================
  openReport(s: InventorySession): void {
    this.selectedSession = s;
    this.view = 'report';
    this.report = null;
    this.reportNotFound = false;
    this.rptPage = 1;
    this.rptFilter = 'ALL';
    this.loadingReport = true;

    this.svc.getReport(s.id).subscribe({
      next: r => {
        this.report = r;
        this.loadingReport = false;
      },
      error: (err) => {
        const msg = err.error?.message || err.message || '';
        if (msg.includes('RAPPORT_NON_GENERE') || msg.includes('Aucun rapport')) {
          this.reportNotFound = true;
        } else {
          this.err('Erreur lors du chargement du rapport');
        }
        this.loadingReport = false;
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
        this.ok('Rapport généré avec succès');
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
    return this.rptFilter === 'ALL' ? this.report.lines : this.report.lines.filter(l => l.statut === this.rptFilter);
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
    return f === 'ALL' ? this.report.lines.length : this.report.lines.filter(l => l.statut === f).length;
  }

  sClass(s: string): string {
    const map: any = { CONFORME: 'badge-success', ECART: 'badge-warning', MANQUANT: 'badge-danger', SURPLUS: 'badge-info' };
    return map[s] || '';
  }

  sIcon(s: string): string {
    const map: any = { CONFORME: '✅', ECART: '⚠️', MANQUANT: '🔴', SURPLUS: '🟡', ALL: '📋' };
    return map[s] || '';
  }

  // ====================== TEMPLATES ======================
  addField(): void {
    const f = this.tplInput.trim().toUpperCase();
    if (f && !this.tplFields.includes(f)) {
      this.tplFields.push(f);
      this.tplInput = '';
    }
  }

  removeField(f: string): void {
    this.tplFields = this.tplFields.filter(x => x !== f);
  }

  saveTemplate(): void {
    if (!this.tplName.trim()) { this.err('Nom obligatoire'); return; }
    this.saving = true;
    this.svc.createTemplate({ name: this.tplName.trim(), fields: this.tplFields, active: true }).subscribe({
      next: t => {
        const i = this.templates.findIndex(x => x.id === t.id);
        if (i !== -1) this.templates[i] = t; else this.templates.push(t);
        this.activeTemplate = t;
        this.showTemplate = false;
        this.saving = false;
        this.tplName = '';
        this.tplFields = ['ARTICLE', 'LOT', 'QUANTITE'];
        this.ok('Template sauvegardé');
      },
      error: e => {
        this.err(e?.error?.message || 'Erreur template');
        this.saving = false;
      }
    });
  }

  // ====================== EXPORT ======================
exportCollect(): void {
  if (!this.selectedSession) return;
  this.downloadWithAuth(
    API.INVENTORY.SESSIONS.EXPORT_COLLECT(this.selectedSession.id),
    `collecte_${this.selectedSession.warehouseCode || this.selectedSession.name || 'session'}.xlsx`
  );
}

exportReport(): void {
  if (!this.selectedSession) return;
  this.downloadWithAuth(
    API.INVENTORY.SESSIONS.EXPORT_REPORT(this.selectedSession.id),
    `rapport_detaille_${this.selectedSession.name || this.selectedSession.id}.xlsx`
  );
}

// Méthode de téléchargement sécurisée avec token JWT
private downloadWithAuth(url: string, filename: string): void {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('jwt') || 
                sessionStorage.getItem('token');

  if (!token) {
    this.err('Vous devez être connecté pour exporter');
    return;
  }

  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
  .then(async response => {
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 403) throw new Error('Accès refusé (403)');
      if (response.status === 404) throw new Error('Endpoint non trouvé (404)');
      throw new Error(`Erreur ${response.status}: ${text}`);
    }
    return response.blob();
  })
  .then(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    this.ok('Rapport détaillé téléchargé avec succès (Excel avec plusieurs onglets)');
  })
  .catch(err => {
    console.error('Download error:', err);
    this.err(err.message || 'Erreur lors du téléchargement du rapport détaillé');
  });
}

  // ====================== NAVIGATION ======================
  back(): void {
    this.view = 'sessions';
    this.selectedSession = null;
    this.report = null;
    this.lines = [];
    this.errorMsg = '';
    this.loadSessions();
  }

  // ====================== HELPERS ======================
  get statusLabel(): Record<string, string> {
    return { EN_COURS: 'En cours', VALIDEE: 'Validée', CLOTUREE: 'Clôturée' };
  }

  get statusClass(): Record<string, string> {
    return { EN_COURS: 'status-active', VALIDEE: 'status-validated', CLOTUREE: 'status-closed' };
  }

  isNum(f: string): boolean {
    return ['QUANTITE', 'QTE'].includes(f.toUpperCase());
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
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