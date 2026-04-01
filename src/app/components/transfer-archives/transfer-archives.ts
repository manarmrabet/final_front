// src/app/components/transfer-archives/transfer-archives.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule }                                     from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule }                                     from '@angular/router';
import { Subject, debounceTime, takeUntil }                 from 'rxjs';
import { ArchiveService }                                   from '../../services/transfer/Archive.service';
import { PagedResponse }                                    from '../../services/transfer/transfer.service';
import { TransferResponse, TransferStatus }                 from '../../models/transfer.model';

@Component({
  selector:    'app-transfer-archives',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './transfer-archives.html',
  styleUrls:   ['./transfer-archives.scss']
})
export class TransferArchivesComponent implements OnInit, OnDestroy {

  private readonly destroy$       = new Subject<void>();
  private readonly filterTrigger$ = new Subject<void>();
  private filtersReady            = false;

  archivesPage:    PagedResponse<TransferResponse> | null = null;
  archivesLoading  = false;
  loadError:       string | null = null;
  currentPage      = 0;
  readonly pageSize = 20;

  filterForm!: FormGroup;

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
    private readonly archiveService: ArchiveService,
    private readonly fb:             FormBuilder,
    private readonly cdr:            ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupFilterDebounce();
    this.loadArchives();
    setTimeout(() => { this.filtersReady = true; }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form ─────────────────────────────────────────────────────────────────

  private initForm(): void {
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
        this.loadArchives();
      });
  }

  // ─── Chargement ───────────────────────────────────────────────────────────

  loadArchives(): void {
    this.archivesLoading = true;
    this.loadError       = null;
    this.cdr.detectChanges();

    const f = this.filterForm.value;

    this.archiveService.search({
      status:   f.status   || undefined,
      itemCode: f.itemCode?.trim() || undefined,
      location: f.location?.trim() || undefined,
      from:     f.from ? f.from + 'T00:00:00' : undefined,
      to:       f.to   ? f.to   + 'T23:59:59' : undefined,
      page:     this.currentPage,
      size:     this.pageSize
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          this.archivesPage    = page;
          this.archivesLoading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          this.archivesLoading = false;
          this.loadError = err?.error?.message ?? err?.message ?? 'Erreur réseau';
          this.cdr.detectChanges();
        }
      });
  }

  // ─── Export CSV ───────────────────────────────────────────────────────────

  exportCsv(): void {
    const f = this.filterForm.value;
    this.archiveService.downloadCsv({
      status:   f.status   || undefined,
      itemCode: f.itemCode?.trim() || undefined,
      location: f.location?.trim() || undefined,
      from:     f.from ? f.from + 'T00:00:00' : undefined,
      to:       f.to   ? f.to   + 'T23:59:59' : undefined
    });
  }

  // ─── Pagination ───────────────────────────────────────────────────────────

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadArchives();
  }

  get pages(): number[] {
    return Array.from({ length: this.archivesPage?.totalPages ?? 0 }, (_, i) => i);
  }

  // ─── Filtres ──────────────────────────────────────────────────────────────

  resetFilters(): void {
    this.filtersReady = false;
    this.filterForm.patchValue(
      { status: null, itemCode: '', location: '', from: '', to: '' },
      { emitEvent: false }
    );
    this.currentPage  = 0;
    this.filtersReady = true;
    this.loadArchives();
  }

  // ─── Helpers d'affichage ──────────────────────────────────────────────────

  getStatusLabel(s: TransferStatus): string { return this.statusLabels[s] ?? s; }
  getStatusColor(s: TransferStatus): string { return this.statusColors[s] ?? 'secondary'; }
  getTypeLabel(t: string): string           { return this.transferTypeLabels[t] ?? t; }

  getLocationParts(location: string): { warehouse: string; emplacement: string } {
    if (!location) return { warehouse: '—', emplacement: '—' };
    const parts = location.split('/');
    return {
      warehouse:   parts[0]?.trim() || location,
      emplacement: parts.length > 1 ? parts.slice(1).join('/').trim() : location
    };
  }

  trackById(_: number, t: TransferResponse): number { return t.id; }
}