import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { FormsModule }                   from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReceptionService }              from '../../services/reception/reception.service';
import { ReceptionLine, ReceptionOrder, SearchMode } from '../../models/reception.model';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ReceptionComponent — Angular 21 Standalone — Version finale
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gestion des dates :
 *   · <input type="date"> stocke en ISO  yyyy-MM-dd  → startDateIso / endDateIso
 *   · L'API Spring Boot reçoit DD/MM/YYYY            → conversion via isoToApi()
 *
 * CORRECTIONS v4 :
 *   · Renommage pdfOrderLabel → pdfLabel  (cohérence HTML/TS)
 *   · ngOnDestroy : révocation du blob URL
 *   · handleError : affiche le message serveur
 *   · searchByOrder : t_orno ERP = PO0000032 (pas OR...)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@Component({
  selector:    'app-reception',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './reception.html',
  styleUrls:   ['./reception.scss'],
})
export class ReceptionComponent implements OnInit, OnDestroy {

  // ── Mode ──────────────────────────────────────────────────────────────────────
  searchMode: SearchMode = 'ORDER';

  // ── Saisie ────────────────────────────────────────────────────────────────────
  orderNumber  = '';
  startDateIso = '';   // yyyy-MM-dd  (format input HTML)
  endDateIso   = '';   // yyyy-MM-dd  (format input HTML)

  // ── Données ───────────────────────────────────────────────────────────────────
  receptionLines:  ReceptionLine[]  = [];
  receptionOrders: ReceptionOrder[] = [];

  // ── État UI ───────────────────────────────────────────────────────────────────
  loading      = false;
  exporting    = false;
  hasSearched  = false;
  errorMessage: string | null = null;

  // ── PDF preview ───────────────────────────────────────────────────────────────
  showPdfPanel = false;
  safePdfUrl:   SafeResourceUrl | null = null;
  pdfLabel:     string | null = null;           // ← nom unifié (utilisé dans HTML aussi)
  private blobUrl: string | null = null;

  // ── Plages rapides ────────────────────────────────────────────────────────────
  readonly quickRanges = [
    { label: 'Today',      key: 'today'     },
    { label: 'Yesterday',  key: 'yesterday' },
    { label: 'This Week',  key: 'week'      },
    { label: 'This Month', key: 'month'     },
  ];

  constructor(
    private readonly receptionSvc: ReceptionService,
    private readonly sanitizer:    DomSanitizer,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    const today   = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    this.startDateIso = this.toIso(weekAgo);
    this.endDateIso   = this.toIso(today);
  }

  ngOnDestroy(): void { this.revokeBlobUrl(); }

  // ══════════════════════════════════════════════════════════════════════════════
  // Conversions de dates
  // ══════════════════════════════════════════════════════════════════════════════

  private toIso(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  /** yyyy-MM-dd → DD/MM/YYYY  (format attendu par le backend) */
  private isoToApi(iso: string): string {
    if (!iso || iso.length !== 10) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  get startDateDisplay(): string { return this.isoToApi(this.startDateIso); }
  get endDateDisplay():   string { return this.isoToApi(this.endDateIso);   }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Recherche par numéro de commande
  //    IMPORTANT : le t_orno dans l'ERP = "PO0000032" (format PO + 7 chiffres)
  //    Pas OR... — OR est le numéro de RÉCEPTION (t_rcno)
  // ══════════════════════════════════════════════════════════════════════════════
  searchByOrder(): void {
    const on = this.orderNumber.trim();
    if (!on) { this.showError('Veuillez saisir un numéro de commande.'); return; }
    this.beginSearch();
    this.receptionSvc.searchByOrder(on).subscribe({
      next:  lines => { this.receptionLines = lines; this.endSearch(); },
      error: err   => this.handleError(err, 'searchByOrder'),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Recherche par plage de dates
  // ══════════════════════════════════════════════════════════════════════════════
  searchByDateRange(): void {
    if (!this.startDateIso || !this.endDateIso) {
      this.showError('Veuillez sélectionner une plage de dates.'); return;
    }
    this.beginSearch();
    this.receptionSvc.searchByDateRange(
      this.isoToApi(this.startDateIso),
      this.isoToApi(this.endDateIso),
    ).subscribe({
      next:  orders => { this.receptionOrders = orders; this.endSearch(); },
      error: err    => this.handleError(err, 'searchByDateRange'),
    });
  }

  onSearch(): void {
    this.searchMode === 'ORDER' ? this.searchByOrder() : this.searchByDateRange();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. PDF standard
  // ══════════════════════════════════════════════════════════════════════════════
  generatePdf(orderNumber: string): void {
    this.exporting = true;
    this.receptionSvc.exportPdfByOrder(orderNumber).subscribe({
      next:  blob => { this.openPreview(blob, orderNumber); this.exporting = false; },
      error: err  => { this.handleError(err, 'generatePdf'); this.exporting = false; },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. PDF valorisé
  // ══════════════════════════════════════════════════════════════════════════════
  generatePdfValued(orderNumber: string): void {
    this.exporting = true;
    this.receptionSvc.exportPdfValued(orderNumber).subscribe({
      next:  blob => { this.openPreview(blob, `${orderNumber} – Valorisé`); this.exporting = false; },
      error: err  => { this.handleError(err, 'generatePdfValued'); this.exporting = false; },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. Export Excel — plage de dates
  // ══════════════════════════════════════════════════════════════════════════════
  exportExcel(): void {
    if (!this.startDateIso || !this.endDateIso) return;
    this.exporting = true;
    const start = this.isoToApi(this.startDateIso);
    const end   = this.isoToApi(this.endDateIso);
    this.receptionSvc.exportExcel(start, end).subscribe({
      next:  blob => {
        this.receptionSvc.downloadBlob(
          blob,
          `reception_${start.replace(/\//g,'-')}_${end.replace(/\//g,'-')}.xlsx`
        );
        this.exporting = false;
      },
      error: err => { this.handleError(err, 'exportExcel'); this.exporting = false; },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Export Excel — commande unique
  // ══════════════════════════════════════════════════════════════════════════════
  exportExcelForOrder(orderNumber: string): void {
    if (!orderNumber?.trim()) return;
    this.exporting = true;
    this.receptionSvc.exportExcelBulk([orderNumber.trim()]).subscribe({
      next:  blob => {
        this.receptionSvc.downloadBlob(blob, `reception_${orderNumber}.xlsx`);
        this.exporting = false;
      },
      error: err => { this.handleError(err, 'exportExcelForOrder'); this.exporting = false; },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PDF Preview
  // ══════════════════════════════════════════════════════════════════════════════
  private openPreview(blob: Blob, label: string): void {
    this.revokeBlobUrl();
    this.blobUrl     = URL.createObjectURL(blob);
    this.safePdfUrl  = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
    this.pdfLabel    = label;
    this.showPdfPanel = true;
  }

  downloadPdf(): void {
    if (!this.blobUrl || !this.pdfLabel) return;
    const a  = document.createElement('a');
    a.href   = this.blobUrl;
    a.download = `reception_${this.pdfLabel}.pdf`;
    a.click();
  }

  openPdfInTab(): void {
    if (this.blobUrl) window.open(this.blobUrl, '_blank');
  }

  closePdfPanel(): void {
    this.showPdfPanel = false;
    this.revokeBlobUrl();
    this.safePdfUrl = null;
    this.pdfLabel   = null;
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Quick date ranges
  // ══════════════════════════════════════════════════════════════════════════════
  applyQuickRange(key: string): void {
    const today = new Date();
    switch (key) {
      case 'today':
        this.startDateIso = this.endDateIso = this.toIso(today); break;
      case 'yesterday': {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        this.startDateIso = this.endDateIso = this.toIso(y); break;
      }
      case 'week': {
        const w = new Date(today); w.setDate(today.getDate() - 6);
        this.startDateIso = this.toIso(w); this.endDateIso = this.toIso(today); break;
      }
      case 'month': {
        const m = new Date(today.getFullYear(), today.getMonth(), 1);
        this.startDateIso = this.toIso(m); this.endDateIso = this.toIso(today); break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Utilitaires
  // ══════════════════════════════════════════════════════════════════════════════
  setSearchMode(mode: SearchMode): void {
    this.searchMode      = mode;
    this.receptionLines  = [];
    this.receptionOrders = [];
    this.hasSearched     = false;
    this.errorMessage    = null;
  }

  loadExample(): void {
    if (this.searchMode === 'ORDER') {
      this.orderNumber = 'PO0000050'; // vrai t_orno de votre ERP
    } else {
      const today = new Date();
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      this.startDateIso = this.toIso(m);
      this.endDateIso   = this.toIso(today);
    }
  }

  clearAll(): void {
    this.orderNumber     = '';
    this.startDateIso    = '';
    this.endDateIso      = '';
    this.receptionLines  = [];
    this.receptionOrders = [];
    this.hasSearched     = false;
    this.errorMessage    = null;
    this.closePdfPanel();
  }

  dismissError(): void { this.errorMessage = null; }

  get hasResults(): boolean {
    return this.receptionOrders.length > 0 || this.receptionLines.length > 0;
  }

  private beginSearch(): void {
    this.loading = true; this.hasSearched = true;
    this.errorMessage = null;
    this.receptionLines = []; this.receptionOrders = [];
  }

  private endSearch(): void { this.loading = false; }

  private showError(msg: string): void {
    this.errorMessage = msg; this.loading = false;
  }

  private handleError(err: any, ctx: string): void {
    this.loading = false;
    const msg = err?.error?.message ?? err?.message ?? err?.statusText ?? 'Erreur inconnue';
    this.errorMessage = `[${ctx}] ${err?.status ?? 'ERR'} : ${msg}`;
    console.error('[Reception]', ctx, err);
  }
}