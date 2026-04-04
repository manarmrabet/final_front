// src/app/components/inventory/inventory.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import {
  InventorySession, CollectLine, CollectTemplate,
  InventoryReport, ReportLine, CreateSessionRequest, AddCollectLineRequest
} from '../../models/inventory.model';

type ReportFilter = 'ALL' | 'CONFORME' | 'ECART' | 'MANQUANT' | 'SURPLUS';
const REPORT_FILTERS: ReportFilter[] = ['ALL', 'CONFORME', 'ECART', 'MANQUANT', 'SURPLUS'];
type ViewMode = 'sessions' | 'lines' | 'report';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit {

  // ── View state ─────────────────────────────────────────────────
  view: ViewMode = 'sessions';
  loading = false;
  saving  = false;
  errorMsg   = '';
  successMsg = '';

  // ── Data ───────────────────────────────────────────────────────
  sessions:        InventorySession[] = [];
  selectedSession: InventorySession | null = null;
  lines:           CollectLine[] = [];
  templates:       CollectTemplate[] = [];
  report:          InventoryReport | null = null;
  erpWarehouses:   string[] = [];

  // ── Modals ─────────────────────────────────────────────────────
  showCreateModal  = false;
  showTemplateModal = false;
  showCollectModal  = false;
  showValidateModal = false;

  // ── Forms ──────────────────────────────────────────────────────
  newSession: CreateSessionRequest = { name: '', warehouseCode: '', warehouseLabel: '' };
  collectLocationCode = '';
  collectValues: Record<string, string> = {};
  collectTemplate: CollectTemplate | null = null;
  newTemplateName = '';
  newTemplateFields: string[] = ['ARTICLE', 'LOT', 'QUANTITE'];
  newFieldInput = '';

  // ── Pagination collecte ────────────────────────────────────────
  collectPage     = 1;
  collectPageSize = 10;

  // ── Pagination rapport ─────────────────────────────────────────
  reportPage     = 1;
  reportPageSize = 15;
  reportFilter: ReportFilter = 'ALL';
  readonly reportFilters = REPORT_FILTERS;

  constructor(private svc: InventoryService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading = true;
    this.svc.getSessions().subscribe({
      next: s => { this.sessions = s; this.loading = false; },
      error: () => { this.error('Erreur chargement sessions'); this.loading = false; }
    });
    this.svc.getTemplates().subscribe({
      next: t => { this.templates = t; this.collectTemplate = t[0] ?? null; }
    });
    this.svc.getErpWarehouses().subscribe({
      next: w => { this.erpWarehouses = w; }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // SESSIONS
  // ════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.newSession = { name: '', warehouseCode: '', warehouseLabel: '' };
    this.errorMsg = '';
    this.showCreateModal = true;
  }

  createSession(): void {
    if (!this.newSession.name?.trim() || !this.newSession.warehouseCode?.trim()) {
      this.error('Nom et magasin obligatoires'); return;
    }
    this.saving = true;
    this.svc.createSession(this.newSession).subscribe({
      next: s => {
        this.sessions.unshift(s);
        this.showCreateModal = false;
        this.saving = false;
        this.success(`Session "${s.name}" créée`);
      },
      error: e => { this.error(e?.error?.message || 'Erreur création'); this.saving = false; }
    });
  }

  // ── Valider session avec confirmation ──────────────────────────
  confirmValidate(session: InventorySession, e?: Event): void {
    e?.stopPropagation();
    this.selectedSession = session;
    this.showValidateModal = true;
  }

  doValidateSession(): void {
    if (!this.selectedSession) return;
    this.saving = true;
    this.svc.validateSession(this.selectedSession.id).subscribe({
      next: updated => {
        this.updateSessionInList(updated);
        this.selectedSession = updated;
        this.showValidateModal = false;
        this.saving = false;
        this.success('Session validée ✅');
        // Si on est dans la vue lignes, rester dedans mais rafraîchir l'état
        if (this.view === 'lines') {
          // pas besoin de recharger les lignes, juste mettre à jour le statut
        }
      },
      error: e => { this.error(e?.error?.message || 'Erreur validation'); this.saving = false; }
    });
  }

  private updateSessionInList(updated: InventorySession): void {
    const idx = this.sessions.findIndex(s => s.id === updated.id);
    if (idx !== -1) this.sessions[idx] = updated;
  }

  // ════════════════════════════════════════════════════════════════
  // LIGNES DE COLLECTE
  // ════════════════════════════════════════════════════════════════

  openSession(session: InventorySession): void {
    this.selectedSession = session;
    this.collectTemplate = this.templates[0] ?? null;
    this.resetCollectForm();
    this.collectPage = 1;
    this.view = 'lines';
    this.loading = true;
    this.svc.getLines(session.id).subscribe({
      next: l => { this.lines = l; this.loading = false; },
      error: () => { this.error('Erreur chargement lignes'); this.loading = false; }
    });
  }

  openCollectModal(): void {
    if (!this.collectTemplate) { this.error('Créez d\'abord un template'); return; }
    this.resetCollectForm();
    this.errorMsg = '';
    this.showCollectModal = true;
  }

  resetCollectForm(): void {
    this.collectLocationCode = '';
    this.collectValues = {};
    if (this.collectTemplate) {
      for (const f of this.collectTemplate.fields) this.collectValues[f] = '';
    }
  }

  addLineFromWeb(): void {
    if (!this.collectLocationCode.trim()) { this.error('Emplacement obligatoire'); return; }
    for (const f of this.collectTemplate!.fields) {
      if (!this.collectValues[f]?.trim()) { this.error(`"${f}" obligatoire`); return; }
    }
    this.saving = true;
    const req: AddCollectLineRequest = {
      sessionId:    this.selectedSession!.id,
      locationCode: this.collectLocationCode.trim().toUpperCase(),
      locationLabel: '',
      values: { ...this.collectValues }
    };
    this.svc.addLine(req).subscribe({
      next: line => {
        this.lines.unshift(line);
        // Mettre à jour le compteur de la session sans rechargement
        if (this.selectedSession) {
          this.selectedSession = { ...this.selectedSession, totalLines: this.lines.length };
          this.updateSessionInList(this.selectedSession);
        }
        this.showCollectModal = false;
        this.saving = false;
        this.success('Ligne ajoutée');
      },
      error: e => { this.error(e?.error?.message || 'Erreur ajout'); this.saving = false; }
    });
  }

  deleteLine(lineId: number): void {
    if (!confirm('Supprimer cette ligne ?')) return;
    this.svc.deleteLine(lineId).subscribe({
      next: () => {
        this.lines = this.lines.filter(l => l.id !== lineId);
        if (this.selectedSession) {
          this.selectedSession = { ...this.selectedSession, totalLines: this.lines.length };
          this.updateSessionInList(this.selectedSession);
        }
      }
    });
  }

  // Pagination collecte
  get pagedLines(): CollectLine[] {
    const start = (this.collectPage - 1) * this.collectPageSize;
    return this.lines.slice(start, start + this.collectPageSize);
  }

  get collectTotalPages(): number {
    return Math.max(1, Math.ceil(this.lines.length / this.collectPageSize));
  }

  getUniqueLocations(): string[] {
    return [...new Set(this.lines.map(l => l.locationCode))];
  }

  getLinesByLocation(loc: string): CollectLine[] {
    return this.lines.filter(l => l.locationCode === loc);
  }

  getHeadersForLocation(loc: string): string[] {
    const l = this.getLinesByLocation(loc);
    return l.length > 0 ? Object.keys(l[0].values) : [];
  }

  // ════════════════════════════════════════════════════════════════
  // RAPPORT
  // ════════════════════════════════════════════════════════════════

  openReport(session: InventorySession): void {
    this.selectedSession = session;
    this.view = 'report';
    this.report = null;
    this.reportPage = 1;
    this.reportFilter = 'ALL';
    this.loading = true;
    this.svc.getReport(session.id).subscribe({
      next: r => { this.report = r; this.loading = false; },
      error: () => { this.report = null; this.loading = false; }
    });
  }

  generateReport(): void {
    if (!this.selectedSession) return;
    this.loading = true;
    this.reportPage = 1;
    this.svc.generateReport(this.selectedSession.id).subscribe({
      next: r => { this.report = r; this.loading = false; this.success('Rapport généré'); },
      error: e => { this.error(e?.error?.message || 'Erreur génération'); this.loading = false; }
    });
  }

  setFilter(f: ReportFilter): void {
    this.reportFilter = f;
    this.reportPage = 1;
  }

  get filteredReportLines(): ReportLine[] {
    if (!this.report) return [];
    return this.reportFilter === 'ALL'
        ? this.report.lines
        : this.report.lines.filter(l => l.statut === this.reportFilter);
  }

  get pagedReportLines(): ReportLine[] {
    const start = (this.reportPage - 1) * this.reportPageSize;
    return this.filteredReportLines.slice(start, start + this.reportPageSize);
  }

  get reportTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReportLines.length / this.reportPageSize));
  }

  getCountByStatut(s: ReportFilter): number {
    if (!this.report) return 0;
    return s === 'ALL' ? this.report.lines.length : this.report.lines.filter(l => l.statut === s).length;
  }

  statutClass(s: string): string {
    return ({CONFORME:'badge-success',ECART:'badge-warning',MANQUANT:'badge-danger',SURPLUS:'badge-info'} as any)[s]||'';
  }

  statutIcon(s: string): string {
    return ({CONFORME:'✅',ECART:'⚠️',MANQUANT:'🔴',SURPLUS:'🟡',ALL:'📋'} as any)[s]||'';
  }

  // ════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ════════════════════════════════════════════════════════════════

  addField(): void {
    const f = this.newFieldInput.trim().toUpperCase();
    if (f && !this.newTemplateFields.includes(f)) { this.newTemplateFields.push(f); this.newFieldInput = ''; }
  }

  removeField(field: string): void {
    this.newTemplateFields = this.newTemplateFields.filter(f => f !== field);
  }

  saveTemplate(): void {
    if (!this.newTemplateName.trim() || this.newTemplateFields.length === 0) {
      this.error('Nom et champs obligatoires'); return;
    }
    this.saving = true;
    this.svc.createTemplate({ name: this.newTemplateName.trim(), fields: this.newTemplateFields, active: true }).subscribe({
      next: t => {
        const idx = this.templates.findIndex(x => x.id === t.id);
        if (idx !== -1) this.templates[idx] = t; else this.templates.push(t);
        this.collectTemplate = t;
        this.showTemplateModal = false;
        this.saving = false;
        this.newTemplateName = '';
        this.newTemplateFields = ['ARTICLE', 'LOT', 'QUANTITE'];
        this.success('Template sauvegardé');
      },
      error: e => { this.error(e?.error?.message || 'Erreur template'); this.saving = false; }
    });
  }

  selectTemplate(t: CollectTemplate): void {
    this.collectTemplate = t;
    this.success(`Template "${t.name}" sélectionné`);
  }

  // ════════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════════

  exportCollect(): void {
    if (this.selectedSession) this.svc.exportCollect(this.selectedSession.id);
  }

  exportReport(): void {
    if (this.selectedSession) this.svc.exportReport(this.selectedSession.id);
  }

  // ════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════

  back(): void {
    this.view = 'sessions';
    this.selectedSession = null;
    this.report = null;
    this.lines = [];
    this.errorMsg = '';
    // Rafraîchir la liste des sessions pour avoir les compteurs à jour
    this.svc.getSessions().subscribe({ next: s => { this.sessions = s; } });
  }

  // ════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════

  get statusLabel(): Record<string, string> {
    return { EN_COURS: 'En cours', VALIDEE: 'Validée', CLOTUREE: 'Clôturée' };
  }

  get statusClass(): Record<string, string> {
    return { EN_COURS: 'status-active', VALIDEE: 'status-validated', CLOTUREE: 'status-closed' };
  }

  isNumericField(f: string): boolean {
    return ['QUANTITE','QTE'].includes(f.toUpperCase());
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  private error(msg: string): void {
    this.errorMsg = msg;
    this.successMsg = '';
    setTimeout(() => { this.errorMsg = ''; }, 5000);
  }

  private success(msg: string): void {
    this.successMsg = msg;
    this.errorMsg = '';
    setTimeout(() => { this.successMsg = ''; }, 3000);
  }
}