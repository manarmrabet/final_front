import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { FormsModule }                   from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReceptionService }              from '../../services/reception/reception.service';
import { ReceptionLine, ReceptionOrder, SearchMode } from '../../models/reception.model';

@Component({
  selector:    'app-reception',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './reception.html',
  styleUrls:   ['./reception.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionComponent implements OnInit, OnDestroy {

  searchMode: SearchMode = 'ORDER';

  // saisie
  orderNumber  = '';
  startDateIso = '';
  endDateIso   = '';

  // données
  receptionLines:  ReceptionLine[]  = [];
  receptionOrders: ReceptionOrder[] = [];

  // état UI
  loading      = false;
  exporting    = false;
  hasSearched  = false;
  errorMessage: string | null = null;

  // PDF
  showPdfPanel = false;
  safePdfUrl:  SafeResourceUrl | null = null;
  pdfLabel:    string | null = null;
  private blobUrl: string | null = null;

  readonly quickRanges = [
    { label: 'Today',      key: 'today'     },
    { label: 'Yesterday',  key: 'yesterday' },
    { label: 'This Week',  key: 'week'      },
    { label: 'This Month', key: 'month'     },
  ];

  constructor(
    private readonly svc:       ReceptionService,
    private readonly sanitizer: DomSanitizer,
    private readonly cdr:       ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - 7);
    this.startDateIso = this.toIso(start);
    this.endDateIso   = this.toIso(today);
  }

  ngOnDestroy(): void { this.revokeBlobUrl(); }

  // ── dates ─────────────────────────────────────────────────────────────────
  private toIso(d: Date): string { return d.toISOString().substring(0, 10); }

  private isoToApi(iso: string): string {
    if (!iso || iso.length !== 10) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  get startDateDisplay(): string { return this.isoToApi(this.startDateIso); }
  get endDateDisplay():   string { return this.isoToApi(this.endDateIso);   }

  // ── recherches ─────────────────────────────────────────────────────────────
  searchByOrder(): void {
    const on = this.orderNumber.trim();
    if (!on) { this.showError('Saisir un numéro de commande (ex. PO0000050).'); return; }
    this.beginSearch();
    this.svc.searchByOrder(on).subscribe({
      next: l => {
        this.receptionLines = l;
        this.endSearch();
        this.cdr.detectChanges();
      },
      error: e => this.handleError(e, 'searchByOrder'),
    });
  }

  searchByDateRange(): void {
    if (!this.startDateIso || !this.endDateIso) {
      this.showError('Sélectionner une plage de dates.'); return;
    }
    this.beginSearch();
    this.svc.searchByDateRange(this.isoToApi(this.startDateIso), this.isoToApi(this.endDateIso))
      .subscribe({
        next: o => {
          this.receptionOrders = o;
          this.endSearch();
          this.cdr.detectChanges();
        },
        error: e => this.handleError(e, 'searchByDateRange'),
      });
  }

  onSearch(): void {
    this.searchMode === 'ORDER' ? this.searchByOrder() : this.searchByDateRange();
  }

  // ── exports ────────────────────────────────────────────────────────────────
  generatePdf(on: string): void {
    this.exporting = true;
    this.cdr.detectChanges();
    this.svc.exportPdfByOrder(on).subscribe({
      next: b => {
        this.openPreview(b, on);
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: e => { this.handleError(e, 'generatePdf'); this.exporting = false; this.cdr.detectChanges(); },
    });
  }

  generatePdfValued(on: string): void {
    this.exporting = true;
    this.cdr.detectChanges();
    this.svc.exportPdfValued(on).subscribe({
      next: b => {
        this.openPreview(b, on + ' – Valorisé');
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: e => { this.handleError(e, 'generatePdfValued'); this.exporting = false; this.cdr.detectChanges(); },
    });
  }

  exportExcel(): void {
    if (!this.startDateIso || !this.endDateIso) return;
    this.exporting = true;
    this.cdr.detectChanges();
    const s = this.isoToApi(this.startDateIso), e = this.isoToApi(this.endDateIso);
    this.svc.exportExcel(s, e).subscribe({
      next: b => {
        this.svc.downloadBlob(b, `reception_${s.replace(/\//g,'-')}_${e.replace(/\//g,'-')}.xlsx`);
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: er => { this.handleError(er, 'exportExcel'); this.exporting = false; this.cdr.detectChanges(); },
    });
  }

  exportExcelForOrder(on: string): void {
    if (!on?.trim()) return;
    this.exporting = true;
    this.cdr.detectChanges();
    this.svc.exportExcelBulk([on.trim()]).subscribe({
      next: b => {
        this.svc.downloadBlob(b, `reception_${on}.xlsx`);
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: e => { this.handleError(e, 'exportExcelForOrder'); this.exporting = false; this.cdr.detectChanges(); },
    });
  }

  // ── PDF preview ────────────────────────────────────────────────────────────
  private openPreview(blob: Blob, label: string): void {
    this.revokeBlobUrl();
    this.blobUrl    = URL.createObjectURL(blob);
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
    this.pdfLabel   = label;
    this.showPdfPanel = true;
    this.cdr.detectChanges();
  }

  downloadPdf(): void {
    if (!this.blobUrl || !this.pdfLabel) return;
    Object.assign(document.createElement('a'), { href: this.blobUrl, download: `reception_${this.pdfLabel}.pdf` }).click();
  }

  openPdfInTab(): void { if (this.blobUrl) window.open(this.blobUrl, '_blank'); }

  closePdfPanel(): void {
    this.showPdfPanel = false;
    this.revokeBlobUrl();
    this.safePdfUrl = null;
    this.pdfLabel   = null;
    this.cdr.detectChanges();
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
  }

  // ── quick ranges ───────────────────────────────────────────────────────────
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
        this.startDateIso = this.toIso(new Date(today.getFullYear(), today.getMonth(), 1));
        this.endDateIso   = this.toIso(today); break;
      }
    }
    this.cdr.detectChanges();
  }

  // ── utilitaires ────────────────────────────────────────────────────────────
  setSearchMode(mode: SearchMode): void {
    this.searchMode = mode;
    this.receptionLines = []; this.receptionOrders = [];
    this.hasSearched = false; this.errorMessage = null;
    this.cdr.detectChanges();
  }

  loadExample(): void {
    if (this.searchMode === 'ORDER') this.orderNumber = 'PO0000050';
    else {
      const today = new Date();
      this.startDateIso = this.toIso(new Date(today.getFullYear(), today.getMonth(), 1));
      this.endDateIso   = this.toIso(today);
    }
    this.cdr.detectChanges();
  }

  clearAll(): void {
    this.orderNumber = ''; this.startDateIso = ''; this.endDateIso = '';
    this.receptionLines = []; this.receptionOrders = [];
    this.hasSearched = false; this.errorMessage = null;
    this.closePdfPanel();
    this.cdr.detectChanges();
  }

  dismissError(): void {
    this.errorMessage = null;
    this.cdr.detectChanges();
  }

  get hasResults(): boolean {
    return this.receptionOrders.length > 0 || this.receptionLines.length > 0;
  }

  private beginSearch(): void {
    this.loading = true; this.hasSearched = true; this.errorMessage = null;
    this.receptionLines = []; this.receptionOrders = [];
    this.cdr.detectChanges();
  }

  private endSearch(): void {
    this.loading = false;
    this.cdr.detectChanges();
  }

  private showError(m: string): void {
    this.errorMessage = m;
    this.loading = false;
    this.cdr.detectChanges();
  }

  private handleError(err: any, ctx: string): void {
    this.loading = false;
    const msg = err?.error?.message ?? err?.message ?? err?.statusText ?? 'Erreur inconnue';
    this.errorMessage = `[${ctx}] ${err?.status ?? 'ERR'} : ${msg}`;
    console.error('[Reception]', ctx, err);
    this.cdr.detectChanges();
  }
}