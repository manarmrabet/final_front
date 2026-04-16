import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe }    from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { ProductionService }            from '../../services/production/production';
import { AuthService }                  from '../../services/auth/auth';
import { Subject, interval }            from 'rxjs';
import { takeUntil, filter, take }      from 'rxjs/operators';
import * as XLSX                         from 'xlsx';
import { ActivatedRoute } from '@angular/router';

export interface ProductionLog {
  id:            number;
  lotCode:       string;
  itemCode:      string;
  warehouse:     string;
  location:      string;
  qtyBefore:     number;
  qtyRequested:  number;
  qtyAfter:      number;
  qtyDelta:      number;
  operationType: 'TOTALE' | 'PARTIELLE';
  status:        'SUCCESS' | 'FAILED';
  userId:        number;
  userName:      string;
  deviceInfo:    string;
  source:        'MOBILE' | 'WEB';
  createdAt:     string;
  notes:         string;
  stockVide:     boolean;
  errorMessage:  string;
}

export interface ProductionStats {
  totalOpsToday:  number;
  totalQtyToday:  number;
  failedToday:    number;
  recentLogs:     ProductionLog[];
  operatorStats:  { userId: number; userName: string; nbOps: number; totalQty: number }[];
}

@Component({
  selector:     'app-production-log',
  standalone:   true,
  imports:      [CommonModule, FormsModule, DecimalPipe],
  templateUrl:  './production-log.html',
  styleUrls:    ['./production-log.scss']
})
export class ProductionLogComponent implements OnInit, OnDestroy {

  logs:   ProductionLog[] = [];
  stats: ProductionStats = {
    totalOpsToday:  0,
    totalQtyToday:  0,
    failedToday:    0,
    recentLogs:     [],
    operatorStats:  []
  };
  isLoading   = true;
  autoRefresh = false;

  // ── Filtres ────────────────────────────────────────────────────────────
  searchTerm      = '';
  selectedType    = '';
  selectedStatus  = '';
  selectedSource  = '';
  selectedUser    = '';
  selectedArticle = '';   // ← NOUVEAU filtre article
  todayOnly       = false;

  selectedLog: ProductionLog | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private svc:  ProductionService,
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}



  ngOnInit(): void {
  // ✅ Les logs arrivent déjà résolus, pas d'attente
  this.route.data.subscribe(data => {
    this.logs      = data['logs'] ?? [];
    this.isLoading = false;
  });

  // Stats séparément (légères, pas bloquantes)
  this.loadStats();
}

private loadStats(): void {
  this.svc.getStats().subscribe({
    next:  s   => {
      this.stats = {
        totalOpsToday: s?.totalOpsToday ?? 0,
        totalQtyToday: s?.totalQtyToday ?? 0,
        failedToday:   s?.failedToday   ?? 0,
        recentLogs:    s?.recentLogs    ?? [],
        operatorStats: s?.operatorStats ?? []
      };
    },
    error: err => console.error('[ProductionLog] stats error:', err)
  });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ────────────────────────────────────────────────────────
  loadAll(): void {
    this.isLoading = true;

    this.svc.getAllLogs().subscribe({
      next:  d   => { this.logs = d || []; this.isLoading = false; },
      error: err => { console.error('[ProductionLog] logs error:', err); this.logs = []; this.isLoading = false; }
    });

    this.svc.getStats().subscribe({
      next: s => {
        this.stats = {
          totalOpsToday:  s?.totalOpsToday  ?? 0,
          totalQtyToday:  s?.totalQtyToday  ?? 0,
          failedToday:    s?.failedToday    ?? 0,
          recentLogs:     s?.recentLogs     ?? [],
          operatorStats:  s?.operatorStats  ?? []
        };
      },
      error: err => console.error('[ProductionLog] stats error:', err)
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      interval(30000).pipe(takeUntil(this.destroy$))
        .subscribe(() => this.loadAll());
    } else {
      this.destroy$.next();
    }
  }

  // ── KPIs locaux ───────────────────────────────────────────────────────
  private isTodayLog(l: ProductionLog): boolean {
    const d = l.createdAt?.slice(0, 10);
    if (!d) return false;
    const [day, mon, yr] = d.split('/');
    return new Date(`${yr}-${mon}-${day}`).toDateString() === new Date().toDateString();
  }

  get todayLogs():      ProductionLog[] { return this.logs.filter(l => this.isTodayLog(l)); }
  get totalOpsToday():  number { return this.todayLogs.filter(l => l.status === 'SUCCESS').length; }
  get totalQtyToday():  number { return this.todayLogs.filter(l => l.status === 'SUCCESS').reduce((a, l) => a + (l.qtyRequested || 0), 0); }
  get failedToday():    number { return this.todayLogs.filter(l => l.status === 'FAILED').length; }
  get lotsVidesToday(): number { return this.todayLogs.filter(l => l.stockVide && l.status === 'SUCCESS').length; }

  // ── Listes distinctes pour les selects ───────────────────────────────
  get uniqueUsers(): string[] {
    return [...new Set(this.logs.map(l => l.userName).filter(u => !!u))];
  }

  // ← NOUVEAU : liste distincte des articles pour le filtre
  get uniqueArticles(): string[] {
    return [...new Set(this.logs.map(l => l.itemCode).filter(a => !!a && a !== 'N/A'))].sort();
  }

  // ── Filtre ────────────────────────────────────────────────────────────
  get filteredLogs(): ProductionLog[] {
    const term  = this.searchTerm.toLowerCase();

    return this.logs.filter(l => {
      const matchSearch   = !term ||
        l.lotCode?.toLowerCase().includes(term)  ||
        l.itemCode?.toLowerCase().includes(term) ||
        l.userName?.toLowerCase().includes(term) ||
        l.warehouse?.toLowerCase().includes(term);
      const matchType     = !this.selectedType    || l.operationType === this.selectedType;
      const matchStatus   = !this.selectedStatus  || l.status        === this.selectedStatus;
      const matchSource   = !this.selectedSource  || l.source        === this.selectedSource;
      const matchUser     = !this.selectedUser    || l.userName      === this.selectedUser;
      const matchArticle  = !this.selectedArticle || l.itemCode      === this.selectedArticle; // ← NOUVEAU
      const matchToday    = !this.todayOnly        || this.isTodayLog(l);
      return matchSearch && matchType && matchStatus && matchSource && matchUser && matchArticle && matchToday;
    });
  }

  clearFilters(): void {
    this.searchTerm     = '';
    this.selectedType   = '';
    this.selectedStatus = '';
    this.selectedSource = '';
    this.selectedUser   = '';
    this.selectedArticle = ''; // ← NOUVEAU
    this.todayOnly      = false;
  }

  // ── Export EXCEL (SheetJS) ────────────────────────────────────────────
  // Remplace complètement l'export CSV
  exportExcel(): void {
    const rows = this.filteredLogs.map(l => ({
      'ID':           l.id,
      'Date':         l.createdAt,
      'Opérateur':    l.userName,
      'Lot':          l.lotCode,
      'Article':      l.itemCode,
      'Magasin':      l.warehouse,
      'Emplacement':  l.location,
      'Type':         l.operationType,
      'Statut':       l.status,
      'Qté Avant':    l.qtyBefore,
      'Qté Sortie':   l.qtyRequested,
      'Qté Après':    l.qtyAfter,
      'Source':       l.source,
      'Appareil':     l.deviceInfo ?? '',
      'Notes':        l.notes      ?? '',
      'Erreur':       l.errorMessage ?? ''
    }));

    // Créer le workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs colonnes automatiques
    const colWidths = [
      { wch: 6  },  // ID
      { wch: 18 },  // Date
      { wch: 14 },  // Opérateur
      { wch: 16 },  // Lot
      { wch: 14 },  // Article
      { wch: 10 },  // Magasin
      { wch: 14 },  // Emplacement
      { wch: 10 },  // Type
      { wch: 10 },  // Statut
      { wch: 10 },  // Qté Avant
      { wch: 10 },  // Qté Sortie
      { wch: 10 },  // Qté Après
      { wch: 8  },  // Source
      { wch: 14 },  // Appareil
      { wch: 20 },  // Notes
      { wch: 30 },  // Erreur
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sorties Production');

    // Nom du fichier avec date + filtres actifs
    const dateStr    = new Date().toISOString().slice(0, 10);
    const articleSuf = this.selectedArticle ? `_${this.selectedArticle}` : '';
    const typeSuf    = this.selectedType    ? `_${this.selectedType}`    : '';
    const filename   = `sorties${articleSuf}${typeSuf}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }

  // ── Détail ────────────────────────────────────────────────────────────
  openDetail(log: ProductionLog): void  { this.selectedLog = log; }
  closeDetail(): void                   { this.selectedLog = null; }
  trackByLog(_: number, l: ProductionLog): number { return l.id; }
}
