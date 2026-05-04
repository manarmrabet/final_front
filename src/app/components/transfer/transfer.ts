// src/app/components/transfer-management/transfer-management.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferService, PagedResponse } from '../../services/transfer/transfer.service';
import { TransferResponse, TransferDashboard, TransferStatus } from '../../models/transfer.model';
import { environment } from '../../../environments/environment';

export interface ArchiveFile { fileName: string; period: string; createdAt: string; sizeKb: number; }
interface ApiResp<T>         { success: boolean; message: string; data: T; }
type Tab = 'transfers' | 'archives';

@Component({
  selector:    'app-transfer-management',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './transfer-management.html',
  styleUrls:   ['./transfer-management.scss']
})
export class TransferManagementComponent implements OnInit, OnDestroy {

  private readonly d$  = new Subject<void>();
  private readonly ft$ = new Subject<void>();
  private readonly api = environment.baseUrl;

  // ── State ────────────────────────────────────────────────────────────────────
  tab: Tab = 'transfers';

  dash:    TransferDashboard | null = null;
  page:    PagedResponse<TransferResponse> | null = null;
  loading  = false;
  err:     string | null = null;
  curPage  = 0;
  readonly PS = 20;

  form!: FormGroup;
  private ready = false;

  selected: TransferResponse | null = null;
  exporting = false;

  archives:   ArchiveFile[] = [];
  arcLoading  = false;
  arcErr:     string | null = null;

  // ── Labels ───────────────────────────────────────────────────────────────────
  private readonly SL: Record<TransferStatus, string> = {
    PENDING:'En attente', DONE:'Effectué', ERROR:'Erreur', CANCELLED:'Annulé'
  };
  private readonly SC: Record<TransferStatus, string> = {
    PENDING:'w', DONE:'ok', ERROR:'err', CANCELLED:'off'
  };

  constructor(
    private fb:  FormBuilder,
    private http: HttpClient,
    private svc:  TransferService,
    private cdr:  ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.ft$.pipe(debounceTime(400), takeUntil(this.d$)).subscribe(() => { this.curPage = 0; this.loadData(); });
    this.loadDash();
    this.loadData();
    setTimeout(() => { this.ready = true; }, 300);
  }

  ngOnDestroy(): void { this.d$.next(); this.d$.complete(); }

  // ── Tab ──────────────────────────────────────────────────────────────────────
  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'archives' && !this.archives.length && !this.arcLoading) this.loadArchives();
    this.cdr.detectChanges();
  }

  refresh(): void { this.loadDash(); this.loadData(); }

  // ── Form — status field removed ──────────────────────────────────────────────
  private initForm(): void {
    this.form = this.fb.group({ itemCode:[''], location:[''], operator:[''], from:[''], to:[''] });
    this.form.valueChanges.pipe(takeUntil(this.d$)).subscribe(() => { if (this.ready) this.ft$.next(); });
  }

  resetFilters(): void {
    this.ready = false;
    this.form.patchValue({ itemCode:'', location:'', operator:'', from:'', to:'' }, { emitEvent:false });
    this.curPage = 0;
    this.ready = true;
    this.loadData();
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  loadDash(): void {
    this.svc.getDashboard().pipe(takeUntil(this.d$))
      .subscribe({ next: d => { this.dash = d; this.cdr.detectChanges(); }, error: () => {} });
  }

  get pendingCount(): number { return this.dash?.countByStatus?.['PENDING']   ?? 0; }
  get doneCount():    number { return this.dash?.countByStatus?.['DONE']      ?? 0; }
  get errCount():     number { return this.dash?.countByStatus?.['ERROR']     ?? 0; }

  // ── Transfers ────────────────────────────────────────────────────────────────
  loadData(): void {
    this.loading = true; this.err = null; this.cdr.detectChanges();

    this.http.get<any>(`${this.api}/api/transfers/search`, { params: this.buildParams() })
      .pipe(takeUntil(this.d$))
      .subscribe({
        next: raw => {
          this.loading = false;
          this.page    = this.parsePage(raw);
          this.cdr.detectChanges();
        },
        error: e => {
          this.loading = false;
          this.err = e?.error?.message ?? e?.message ?? 'Erreur réseau';
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Build HttpParams — status removed.
   * Matches backend: status, itemCode, location, operator, from, to
   * Status is always null (no filter) → not sent.
   */
  private buildParams(size = this.PS): HttpParams {
    const f = this.form.value;
    let p = new HttpParams().set('page', String(this.curPage)).set('size', String(size));

    // No status filter — field has been removed
    if (f.itemCode?.trim()) p = p.set('itemCode', f.itemCode.trim());
    if (f.location?.trim()) p = p.set('location', f.location.trim());
    if (f.operator?.trim()) p = p.set('operator', f.operator.trim());
    if (f.from)             p = p.set('from', f.from + 'T00:00:00');
    if (f.to)               p = p.set('to',   f.to   + 'T23:59:59');

    return p;
  }

  private parsePage(raw: any): PagedResponse<TransferResponse> | null {
    // Spring ApiResponse wrapper: { success, data: { content, totalPages, ... } }
    if (raw?.data?.content !== undefined) return raw.data;
    // Spring Page direct: { content, totalElements, totalPages, ... }
    if (Array.isArray(raw?.content) && raw?.totalElements !== undefined) {
      return {
        content: raw.content,
        page: raw.page ?? raw.pageable?.pageNumber ?? 0,
        size: raw.size ?? this.PS,
        totalElements: raw.totalElements,
        totalPages: raw.totalPages ?? 1,
        first: raw.first ?? true, last: raw.last ?? true
      };
    }
    // Array in data field
    if (Array.isArray(raw?.data)) {
      const l = raw.data as TransferResponse[];
      return { content:l, page:0, size:l.length, totalElements:l.length, totalPages:1, first:true, last:true };
    }
    // Bare array
    if (Array.isArray(raw)) {
      return { content:raw, page:0, size:raw.length, totalElements:raw.length, totalPages:1, first:true, last:true };
    }
    this.err = 'Format de réponse inattendu';
    return null;
  }

  goPage(p: number): void { this.curPage = p; this.loadData(); }

  get pages(): number[] {
    return Array.from({ length: this.page?.totalPages ?? 0 }, (_, i) => i);
  }

  trackId(_: number, t: TransferResponse): number { return t.id; }

  // ── CSV Export ───────────────────────────────────────────────────────────────
  exportCSV(): void {
    this.exporting = true; this.cdr.detectChanges();

    const params = this.buildParams(5000);

    this.http.get<any>(`${this.api}/api/transfers/search`, { params })
      .pipe(takeUntil(this.d$))
      .subscribe({
        next: raw => {
          const rows = this.parsePage(raw)?.content ?? [];
          const BOM  = '\uFEFF';
          const HDR  = ['ID','Date','Code article','Désignation','Lot','Source','Destination','Entrepôt src','Entrepôt dst','Quantité','Unité','Statut','Opérateur','Notes'];
          const body = rows.map(r => [
            r.id, r.createdAt, r.erpItemCode,
            this.esc(r.erpItemLabel), r.lotNumber ?? '',
            r.sourceLocation, r.destLocation,
            r.sourceWarehouse ?? '', r.destWarehouse ?? '',
            r.quantity, r.unit ?? '',
            this.SL[r.status] ?? r.status,
            r.operatorName ?? '',
            this.esc(r.notes ?? '')
          ].join(';'));

          const csv  = BOM + [HDR.join(';'), ...body].join('\n');
          const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
          const a    = Object.assign(document.createElement('a'), {
            href:     URL.createObjectURL(blob),
            download: `transferts_${new Date().toISOString().slice(0,10)}.csv`
          });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
          this.exporting = false; this.cdr.detectChanges();
        },
        error: () => { this.exporting = false; this.cdr.detectChanges(); }
      });
  }

  private esc(s: string): string {
    if (!s) return '';
    return (s.includes(';') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g,'""') + '"' : s;
  }

  // ── Archives ─────────────────────────────────────────────────────────────────
  loadArchives(): void {
    this.arcLoading = true; this.arcErr = null; this.cdr.detectChanges();
    this.http.get<ApiResp<ArchiveFile[]>>(`${this.api}/api/transfers/archives/files`)
      .pipe(takeUntil(this.d$))
      .subscribe({
        next: r  => { this.archives = r.data ?? []; this.arcLoading = false; this.cdr.detectChanges(); },
        error: e => { this.arcErr = e?.error?.message ?? e?.message ?? 'Erreur réseau'; this.arcLoading = false; this.cdr.detectChanges(); }
      });
  }

  dlArchive(f: ArchiveFile): void {
    const url   = `${this.api}/api/transfers/archives/files/${encodeURIComponent(f.fileName)}`;
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('token') ||
                  localStorage.getItem('access_token') || sessionStorage.getItem('jwt_token') || '';
    if (!token) { alert('Session expirée.'); return; }

    fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then(b => {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: f.fileName });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      })
      .catch(e => alert(`Erreur : ${e.message}`));
  }

  fmtSize(kb: number): string { return kb < 1024 ? `${kb} Ko` : `${(kb/1024).toFixed(1)} Mo`; }

  // ── Modal ────────────────────────────────────────────────────────────────────
  openDetail(t: TransferResponse): void  { this.selected = t;    }
  closeDetail(): void                     { this.selected = null; }

  // ── UI helpers ───────────────────────────────────────────────────────────────
  statusLabel(s: TransferStatus): string { return this.SL[s] ?? s; }
  chipClass(s: TransferStatus): string   { return 'chip--' + (this.SC[s] ?? 'off'); }

  locParts(warehouse: string|null|undefined, location: string|null|undefined): { wh:string; em:string } {
    const wh = warehouse?.trim() || '—';
    const em = location?.trim()  || '';
    return (em && em.toUpperCase() !== wh.toUpperCase()) ? { wh, em } : { wh, em:'—' };
  }
}