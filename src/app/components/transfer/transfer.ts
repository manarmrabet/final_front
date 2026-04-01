// src/app/components/transfer-management/transfer-management.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferService, PagedResponse } from '../../services/transfer/transfer.service';
import {
  TransferResponse, TransferDashboard, TransferStatus
} from '../../models/transfer.model';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Component({
  selector:    'app-transfer-management',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './transfer-management.html',
  styleUrls:   ['./transfer-management.scss']
})
export class TransferManagementComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();
  private readonly api      = environment.baseUrl;

  // Dashboard
  dashboard:        TransferDashboard | null = null;
  dashboardLoading  = false;

  // Liste transferts
  transfersPage:    PagedResponse<TransferResponse> | null = null;
  transfersLoading  = false;
  loadError:        string | null = null;
  currentPage       = 0;
  readonly pageSize = 20;

  // Filtres
  filterForm!: FormGroup;
  private filtersReady = false;
  private readonly filterTrigger$ = new Subject<void>();

  // Modal détail
  selectedTransfer: TransferResponse | null = null;

  readonly statusLabels: Record<TransferStatus, string> = {
    PENDING:   'En attente',
    DONE:      'Effectué',
    ERROR:     'Erreur',
    CANCELLED: 'Annulé'
  };

  readonly statusColors: Record<TransferStatus, string> = {
    PENDING:   'warning',
    DONE:      'success',
    ERROR:     'danger',
    CANCELLED: 'secondary'
  };

  readonly transferTypeLabels: Record<string, string> = {
    PUTAWAY:             'Mise en stock',
    INTERNAL_RELOCATION: 'Déplacement interne',
    REPLENISHMENT:       'Réapprovisionnement'
  };

  constructor(
    private readonly transferService: TransferService,
    private readonly fb:  FormBuilder,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.setupFilterDebounce();
    this.loadDashboard();
    this.loadTransfers();

    // Active les valueChanges seulement après le premier chargement
    setTimeout(() => { this.filtersReady = true; }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.filterForm = this.fb.group({
      status:   [null],
      itemCode: [''],
      location: [''],
      from:     [''],
      to:       ['']
    });

    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.filtersReady) return;
        this.filterTrigger$.next();
      });
  }

  private setupFilterDebounce(): void {
    this.filterTrigger$
      .pipe(debounceTime(600), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 0;
        this.loadTransfers();
      });
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.transferService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: d => {
          this.dashboard        = d;
          this.dashboardLoading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Dashboard error:', err);
          this.dashboardLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get pendingCount():   number { return this.dashboard?.countByStatus?.['PENDING']   ?? 0; }
  get doneCount():      number { return this.dashboard?.countByStatus?.['DONE']      ?? 0; }
  get errorCount():     number { return this.dashboard?.countByStatus?.['ERROR']     ?? 0; }
  get cancelledCount(): number { return this.dashboard?.countByStatus?.['CANCELLED'] ?? 0; }

  loadTransfers(): void {
    this.transfersLoading = true;
    this.loadError        = null;
    this.cdr.detectChanges();

    const f = this.filterForm.value;

    let params = new HttpParams()
      .set('page', String(this.currentPage))
      .set('size', String(this.pageSize));

    if (f.status)           params = params.set('status',   f.status);
    if (f.itemCode?.trim()) params = params.set('itemCode', f.itemCode.trim());
    if (f.location?.trim()) params = params.set('location', f.location.trim());
    if (f.from)             params = params.set('from',     f.from + 'T00:00:00');
    if (f.to)               params = params.set('to',       f.to   + 'T23:59:59');

    this.http
      .get<any>(`${this.api}/api/transfers/search`, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (raw: any) => {
          this.transfersLoading = false;
          this.transfersPage    = this.parsePagedResponse(raw);
          this.cdr.detectChanges();
        },
        error: err => {
          this.transfersLoading = false;
          this.loadError = err?.error?.message
            ?? err?.error?.error
            ?? err?.message
            ?? 'Erreur réseau';
          console.error('loadTransfers error:', err);
          this.cdr.detectChanges();
        }
      });
  }

  private parsePagedResponse(raw: any): PagedResponse<TransferResponse> | null {

    // Cas 1 : { success, data: { content, totalPages, ... } }
    if (raw?.data?.content !== undefined) {
      return raw.data as PagedResponse<TransferResponse>;
    }

    // Cas 2 : { content, totalElements, totalPages, ... }
    if (Array.isArray(raw?.content) && raw?.totalElements !== undefined) {
      return {
        content:       raw.content,
        page:          raw.page          ?? raw.pageable?.pageNumber ?? 0,
        size:          raw.size          ?? raw.pageable?.pageSize   ?? this.pageSize,
        totalElements: raw.totalElements ?? raw.content.length,
        totalPages:    raw.totalPages    ?? 1,
        first:         raw.first         ?? true,
        last:          raw.last          ?? true,
      };
    }

    // Cas 3 : { success, data: [...] }
    if (Array.isArray(raw?.data)) {
      const list = raw.data as TransferResponse[];
      return {
        content: list, page: 0, size: list.length,
        totalElements: list.length, totalPages: 1, first: true, last: true
      };
    }

    // Cas 4 : tableau direct
    if (Array.isArray(raw)) {
      return {
        content: raw, page: 0, size: raw.length,
        totalElements: raw.length, totalPages: 1, first: true, last: true
      };
    }

    console.warn('parsePagedResponse : format inconnu', raw);
    this.loadError = 'Format de réponse inattendu';
    return null;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadTransfers();
  }

  resetFilters(): void {
    this.filtersReady = false;
    this.filterForm.patchValue(
      { status: null, itemCode: '', location: '', from: '', to: '' },
      { emitEvent: false }
    );
    this.currentPage  = 0;
    this.filtersReady = true;
    this.loadTransfers();
  }

  openDetail(transfer: TransferResponse): void  { this.selectedTransfer = transfer; }
  closeDetail(): void                            { this.selectedTransfer = null;    }

  getStatusLabel(s: TransferStatus): string { return this.statusLabels[s] ?? s; }
  getStatusColor(s: TransferStatus): string { return this.statusColors[s] ?? 'secondary'; }
  getTypeLabel(t: string): string           { return this.transferTypeLabels[t] ?? t; }

   /**
   * Affiche "Magasin / Emplacement" en utilisant les champs du backend
   * Priorité : warehouse (t_cwar) puis location (t_loca)
   */
  getLocationParts(
    warehouse: string | null | undefined,
    location: string | null | undefined
  ): { warehouse: string; emplacement: string } {

    const wh = (warehouse?.trim()) || '—';
    const loc = (location?.trim()) || '';

    // Si on a un emplacement différent du magasin → on l'affiche
    if (loc && loc.toUpperCase() !== wh.toUpperCase()) {
      return { warehouse: wh, emplacement: loc };
    }

    // Sinon on affiche seulement le magasin (cas actuel de tes données)
    return { warehouse: wh, emplacement: '—' };
  }

  get pages(): number[] {
    return Array.from({ length: this.transfersPage?.totalPages ?? 0 }, (_, i) => i);
  }

  trackById(_: number, t: TransferResponse): number { return t.id; }
}