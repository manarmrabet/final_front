// src/app/components/transfer-management/transfer-management.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { TransferService, PagedResponse } from '../../services/transfer/transfer.service';
import {
  TransferResponse, TransferDashboard, ErpArticle, ErpStock,
  TransferStatus, TransferSearchParams
} from '../../models/transfer.model';

// PagedResponse est importé depuis transfer.service.ts

@Component({
  selector:    'app-transfer-management',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './transfer-management.html',
  styleUrls:   ['./transfer-management.scss']
})
export class TransferManagementComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: TransferDashboard | null = null;
  dashboardLoading = false;

  // ─── Liste transferts ────────────────────────────────────────────────────
  transfersPage: PagedResponse<TransferResponse> | null = null;
  transfersLoading = false;
  currentPage = 0;
  pageSize    = 20;

  // ─── Filtres ─────────────────────────────────────────────────────────────
  filterForm!: FormGroup;
  private searchSubject = new Subject<void>();

  // ─── Création manuelle (web) ──────────────────────────────────────────────
  showCreateForm = false;
  createForm!:    FormGroup;
  createLoading = false;
  createError:    string | null = null;

  // ─── Données ERP (recherche article) ─────────────────────────────────────
  articleSearchResults: ErpArticle[] = [];
  selectedArticle:      ErpArticle | null = null;
  articleStocks:        ErpStock[] = [];
  private articleSearch$ = new Subject<string>();

  // ─── Détail / Modal ───────────────────────────────────────────────────────
  selectedTransfer: TransferResponse | null = null;
  actionLoading = false;
  actionError:    string | null = null;

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
    PUTAWAY:             'Mise en stock (Putaway)',
    INTERNAL_RELOCATION: 'Déplacement interne',
    REPLENISHMENT:       'Réapprovisionnement'
  };

  constructor(
    private transferService: TransferService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadDashboard();
    this.loadTransfers();
    this.setupSearchDebounce();
    this.setupArticleSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  private initForms(): void {
    this.filterForm = this.fb.group({
      status:   [null],
      itemCode: [''],
      location: [''],
      from:     [''],
      to:       ['']
    });

    this.createForm = this.fb.group({
      erpItemCode:    ['', Validators.required],
      sourceLocation: ['', Validators.required],
      destLocation:   ['', Validators.required],
      quantity:       [1, [Validators.required, Validators.min(1)]],
      lotNumber:      [''],
      transferType:   ['INTERNAL_RELOCATION'],
      notes:          ['']
    });

    // Déclencher recherche à chaque changement de filtre
    this.filterForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.searchSubject.next());
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadTransfers();
    });
  }

  private setupArticleSearch(): void {
    this.articleSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.transferService.searchArticles(query)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: results => this.articleSearchResults = results,
      error: () => this.articleSearchResults = []
    });
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  loadDashboard(): void {
    this.dashboardLoading = true;
    this.transferService.getDashboard().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next:     data  => { this.dashboard = data; this.dashboardLoading = false; },
      error:    ()    => { this.dashboardLoading = false; }
    });
  }

  get pendingCount(): number {
    return this.dashboard?.countByStatus?.['PENDING'] ?? 0;
  }
  get doneCount(): number {
    return this.dashboard?.countByStatus?.['DONE'] ?? 0;
  }
  get errorCount(): number {
    return this.dashboard?.countByStatus?.['ERROR'] ?? 0;
  }

  // ─── Liste ────────────────────────────────────────────────────────────────
  loadTransfers(): void {
    this.transfersLoading = true;
    const filters = this.filterForm.value;

    const params: TransferSearchParams = {
      page: this.currentPage,
      size: this.pageSize,
      ...(filters.status   && { status:   filters.status }),
      ...(filters.itemCode && { itemCode: filters.itemCode }),
      ...(filters.location && { location: filters.location }),
      ...(filters.from     && { from:     filters.from + 'T00:00:00' }),
      ...(filters.to       && { to:       filters.to   + 'T23:59:59' })
    };

    this.transferService.search(params).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: page => {
        this.transfersPage  = page;
        this.transfersLoading = false;
      },
      error: () => { this.transfersLoading = false; }
    });
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadTransfers();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 0;
    this.loadTransfers();
  }

  // ─── Création web ─────────────────────────────────────────────────────────
  onArticleSearchInput(query: string): void {
    if (query.length >= 2) this.articleSearch$.next(query);
    else this.articleSearchResults = [];
  }

  selectArticle(article: ErpArticle): void {
    this.selectedArticle = article;
    this.createForm.patchValue({ erpItemCode: article.itemCode });
    this.articleSearchResults = [];
    // Charger le stock disponible par emplacement
    this.transferService.getStockByItem(article.itemCode).subscribe(
      stocks => this.articleStocks = stocks
    );
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.createLoading = true;
    this.createError   = null;

    this.transferService.createTransfer(this.createForm.value).subscribe({
      next: () => {
        this.createLoading = false;
        this.showCreateForm = false;
        this.createForm.reset({ transferType: 'INTERNAL_RELOCATION', quantity: 1 });
        this.selectedArticle = null;
        this.articleStocks   = [];
        this.loadTransfers();
      },
      error: err => {
        this.createLoading = false;
        this.createError = err?.error?.message ?? 'Erreur lors de la création';
      }
    });
  }

  // ─── Actions superviseur ──────────────────────────────────────────────────
  openDetail(transfer: TransferResponse): void {
    this.selectedTransfer = transfer;
    this.actionError      = null;
  }

  validateTransfer(): void {
    if (!this.selectedTransfer) return;
    this.actionLoading = true;
    this.transferService.validate(this.selectedTransfer.id).subscribe({
      next: updated => {
        this.selectedTransfer = updated;
        this.actionLoading    = false;
        this.loadTransfers();
        this.loadDashboard();
      },
      error: err => {
        this.actionLoading = false;
        this.actionError = err?.error?.message ?? 'Erreur validation';
      }
    });
  }

  cancelTransfer(reason = ''): void {
    if (!this.selectedTransfer) return;
    this.actionLoading = true;
    this.transferService.cancel(this.selectedTransfer.id, reason).subscribe({
      next: updated => {
        this.selectedTransfer = updated;
        this.actionLoading    = false;
        this.loadTransfers();
        this.loadDashboard();
      },
      error: err => {
        this.actionLoading = false;
        this.actionError = err?.error?.message ?? 'Erreur annulation';
      }
    });
  }

  closeDetail(): void {
    this.selectedTransfer = null;
    this.actionError      = null;
  }

  // ─── Helpers template ─────────────────────────────────────────────────────
  getStatusLabel(status: TransferStatus): string {
    return this.statusLabels[status] ?? status;
  }

  getStatusColor(status: TransferStatus): string {
    return this.statusColors[status] ?? 'secondary';
  }

  getTypeLabel(type: string): string {
    return this.transferTypeLabels[type] ?? type;
  }

  get pages(): number[] {
    const total = this.transfersPage?.totalPages ?? 0;
    return Array.from({ length: total }, (_, i) => i);
  }

  trackById(_: number, t: TransferResponse): number { return t.id; }
}