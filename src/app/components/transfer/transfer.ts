// src/app/components/transfer-management/transfer-management.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
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
  dashboard:       TransferDashboard | null = null;
  dashboardLoading = false;

  // Liste transferts
  transfersPage:    PagedResponse<TransferResponse> | null = null;
  transfersLoading  = false;
  loadError:        string | null = null;
  currentPage       = 0;
  readonly pageSize = 20;

  // Filtres
  filterForm!: FormGroup;
  private readonly filterTrigger$ = new Subject<string>();

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
    private readonly fb: FormBuilder,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.setupFilterDebounce();
    this.loadDashboard();
    this.loadTransfers();
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

    this.filterForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v =>
      this.filterTrigger$.next(JSON.stringify(v))
    );
  }

  private setupFilterDebounce(): void {
    this.filterTrigger$.pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 0;
        this.loadTransfers();
      });
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.transferService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next:  d  => { this.dashboard = d; this.dashboardLoading = false; },
      error: () => { this.dashboardLoading = false; }
    });
  }

  get pendingCount(): number { return this.dashboard?.countByStatus?.['PENDING'] ?? 0; }
  get doneCount(): number { return this.dashboard?.countByStatus?.['DONE'] ?? 0; }
  get errorCount(): number { return this.dashboard?.countByStatus?.['ERROR'] ?? 0; }
  get cancelledCount(): number { return this.dashboard?.countByStatus?.['CANCELLED'] ?? 0; }

  loadTransfers(): void {
    this.transfersLoading = true;
    this.loadError = null;

    const f = this.filterForm.value;
    let params = new HttpParams()
      .set('page', String(this.currentPage))
      .set('size', String(this.pageSize));

    if (f.status)           params = params.set('status', f.status);
    if (f.itemCode?.trim()) params = params.set('itemCode', f.itemCode.trim());
    if (f.location?.trim()) params = params.set('location', f.location.trim());
    if (f.from)             params = params.set('from', f.from + 'T00:00:00');
    if (f.to)               params = params.set('to', f.to + 'T23:59:59');

    this.http.get<ApiResponse<PagedResponse<TransferResponse>>>(
      `${this.api}/api/transfers/search`, { params }
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (raw: any) => {
        this.transfersLoading = false;
        if (raw?.data?.content !== undefined) {
          this.transfersPage = raw.data;
        } else if (Array.isArray(raw?.content)) {
          this.transfersPage = raw;
        } else {
          this.loadError = 'Format de réponse inattendu';
          this.transfersPage = null;
        }
      },
      error: err => {
        this.transfersLoading = false;
        this.loadError = err?.error?.message ?? err?.message ?? 'Erreur réseau';
      }
    });
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadTransfers();
  }

  resetFilters(): void {
    this.filterForm.patchValue({ status: null, itemCode: '', location: '', from: '', to: '' });
    this.currentPage = 0;
  }

  openDetail(transfer: TransferResponse): void {
    this.selectedTransfer = transfer;
  }

  closeDetail(): void {
    this.selectedTransfer = null;
  }

  getStatusLabel(s: TransferStatus): string { return this.statusLabels[s] ?? s; }
  getStatusColor(s: TransferStatus): string { return this.statusColors[s] ?? 'secondary'; }
  getTypeLabel(t: string): string { return this.transferTypeLabels[t] ?? t; }

  // Helpers pour afficher Entrepôt / Emplacement
  getLocationParts(location: string): { warehouse: string; emplacement: string } {
    if (!location) return { warehouse: '', emplacement: '' };
    const parts = location.split('/');
    return {
      warehouse: parts[0]?.trim() || location,
      emplacement: parts.length > 1 ? parts.slice(1).join('/').trim() : location
    };
  }

  get pages(): number[] {
    return Array.from({ length: this.transfersPage?.totalPages ?? 0 }, (_, i) => i);
  }

  trackById(_: number, t: TransferResponse): number { return t.id; }
}