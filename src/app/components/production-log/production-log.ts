import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe }    from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { ProductionService }            from '../../services/production/production';
import { AuthService }                  from '../../services/auth/auth';
import { Subject, interval }            from 'rxjs';
import { takeUntil, filter, take }      from 'rxjs/operators';

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
  failedToday:    0,   // ← backend renvoie null, ici on force 0
  recentLogs:     [],
  operatorStats:  []
};
  isLoading   = true;
  autoRefresh = false;

  // Filtres
  searchTerm     = '';
  selectedType   = '';
  selectedStatus = '';
  selectedSource = '';
  selectedUser   = '';
  todayOnly      = false;

  selectedLog: ProductionLog | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private svc:  ProductionService,
    private auth: AuthService        // ← injecter AuthService
  ) {}

  // ── ngOnInit : attendre que le user soit authentifié ─────────────────────
 ngOnInit(): void {
  if (localStorage.getItem('token')) {
    this.loadAll();
  } else {
    this.auth.currentUser$.pipe(
      filter(user => user !== null),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadAll());
  }
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  // ✅ APRÈS — wrapper setTimeout force le chargement hors du cycle CD
loadAll(): void {
  this.isLoading = true;

  this.svc.getAllLogs().subscribe({
    next:  d   => {
      this.logs      = d || [];
      this.isLoading = false;
    },
    error: err => {
      console.error('[ProductionLog] logs error:', err);
      this.logs      = [];
      this.isLoading = false;
    }
  });

  this.svc.getStats().subscribe({
    next: s => {
      // Protéger contre les null du backend
      this.stats = {
        totalOpsToday:  s?.totalOpsToday  ?? 0,
        totalQtyToday:  s?.totalQtyToday  ?? 0,
        failedToday:    s?.failedToday    ?? 0,   // ← null → 0
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

  // ── KPIs locaux ───────────────────────────────────────────────────────────
  private isTodayLog(l: ProductionLog): boolean {
    const d = l.createdAt?.slice(0, 10);
    if (!d) return false;
    const [day, mon, yr] = d.split('/');
    return new Date(`${yr}-${mon}-${day}`).toDateString() === new Date().toDateString();
  }

  get todayLogs(): ProductionLog[]  { return this.logs.filter(l => this.isTodayLog(l)); }
  get totalOpsToday():  number { return this.todayLogs.filter(l => l.status === 'SUCCESS').length; }
  get totalQtyToday():  number { return this.todayLogs.filter(l => l.status === 'SUCCESS').reduce((a, l) => a + (l.qtyRequested || 0), 0); }
  get failedToday():    number { return this.todayLogs.filter(l => l.status === 'FAILED').length; }
  get lotsVidesToday(): number { return this.todayLogs.filter(l => l.stockVide && l.status === 'SUCCESS').length; }

  get uniqueUsers(): string[] {
    return [...new Set(this.logs.map(l => l.userName).filter(u => !!u))];
  }

  // ── Filtre ────────────────────────────────────────────────────────────────
  get filteredLogs(): ProductionLog[] {
    const term  = this.searchTerm.toLowerCase();
    const today = new Date().toDateString();

    return this.logs.filter(l => {
      const matchSearch  = !term ||
        l.lotCode?.toLowerCase().includes(term)  ||
        l.itemCode?.toLowerCase().includes(term) ||
        l.userName?.toLowerCase().includes(term) ||
        l.warehouse?.toLowerCase().includes(term);
      const matchType    = !this.selectedType   || l.operationType === this.selectedType;
      const matchStatus  = !this.selectedStatus || l.status === this.selectedStatus;
      const matchSource  = !this.selectedSource || l.source === this.selectedSource;
      const matchUser    = !this.selectedUser   || l.userName === this.selectedUser;
      const matchToday   = !this.todayOnly || this.isTodayLog(l);
      return matchSearch && matchType && matchStatus && matchSource && matchUser && matchToday;
    });
  }

  clearFilters(): void {
    this.searchTerm = ''; this.selectedType = ''; this.selectedStatus = '';
    this.selectedSource = ''; this.selectedUser = ''; this.todayOnly = false;
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  exportCsv(): void {
    const headers = ['ID','Date','Opérateur','Lot','Article','Magasin',
                     'Type','Statut','Qty Avant','Qty Sortie','Qty Après','Source','Notes'];
    const rows = this.filteredLogs.map(l =>
      [l.id, l.createdAt, l.userName, l.lotCode, l.itemCode, l.warehouse,
       l.operationType, l.status, l.qtyBefore, l.qtyRequested, l.qtyAfter,
       l.source, l.notes ?? ''].join(',')
    );
    const csv  = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `sorties_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Détail ────────────────────────────────────────────────────────────────
  openDetail(log: ProductionLog): void  { this.selectedLog = log; }
  closeDetail(): void                   { this.selectedLog = null; }
  trackByLog(_: number, l: ProductionLog): number { return l.id; }
}
