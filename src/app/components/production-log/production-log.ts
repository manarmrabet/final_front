import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe }    from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { RouterLink, ActivatedRoute }   from '@angular/router';
import { ProductionService, ProductionArchiveFileDTO }
                                        from '../../services/production/production';
import { AuthService }                  from '../../services/auth/auth';
import { Subject, interval }            from 'rxjs';
import { takeUntil }                    from 'rxjs/operators';
import * as XLSX                        from 'xlsx';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ProductionLogComponent — VUE UNIFIÉE (Temps réel + Archives)
 *
 *  CORRECTION SKELETON INFINI :
 *  Les deux resolvers (logs + archives) sont déclarés sur la route.
 *  Angular attend leur résolution AVANT de monter le composant.
 *  ngOnInit() lit les données via ActivatedRoute.data — synchrone du
 *  point de vue du composant → isLoading=false et archivesLoaded=true
 *  dès le premier rendu → aucun skeleton, affichage immédiat.
 *
 *  BONNE PRATIQUE :
 *  Ne jamais charger des données dans ngOnInit() via HTTP directement
 *  quand le composant est lazy-loaded → utiliser un Resolver.
 * ══════════════════════════════════════════════════════════════════════════
 */

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
  selector:    'app-production-log',
  standalone:  true,
  imports:     [CommonModule, FormsModule, DecimalPipe, RouterLink],
  templateUrl: './production-log.html',
  styleUrls:   ['./production-log.scss']
})
export class ProductionLogComponent implements OnInit, OnDestroy {

  // ── Vue active ────────────────────────────────────────────────────────
  activeView: 'realtime' | 'archives' = 'realtime';

  // ── Données temps réel ────────────────────────────────────────────────
  logs:      ProductionLog[] = [];
  stats: ProductionStats = {
    totalOpsToday: 0, totalQtyToday: 0, failedToday: 0,
    recentLogs: [], operatorStats: []
  };
  isLoading   = false;
  autoRefresh = false;

  // ── Filtres ────────────────────────────────────────────────────────────
  searchTerm = ''; selectedType = ''; selectedStatus = '';
  selectedSource = ''; selectedUser = ''; selectedArticle = '';
  todayOnly = false;
  selectedLog: ProductionLog | null = null;

  // ── Données archives ───────────────────────────────────────────────────
  archives:       ProductionArchiveFileDTO[] = [];
  archivesLoading = false;
  // ✅ true par défaut : les archives arrivent du resolver, pas besoin de recharger
  archivesLoaded  = true;
  downloading:    string | null = null;
  triggering      = false;
  triggerMessage: string | null = null;
  triggerSuccess  = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc:   ProductionService,
    private auth:  AuthService,
    private route: ActivatedRoute
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    /**
     * ✅ Les deux resolvers ont déjà exécuté leurs requêtes HTTP.
     * ActivatedRoute.data contient les résultats — lecture synchrone.
     * Angular ne voit aucun changement d'état après le rendu → pas de NG0100.
     */
    this.route.data.subscribe(data => {
      this.logs     = data['logs']     ?? [];
      this.archives = data['archives'] ?? [];
    });
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Toggle onglets ────────────────────────────────────────────────────

  switchView(view: 'realtime' | 'archives'): void {
    this.activeView = view;
    // Plus besoin de vérifier archivesLoaded — données déjà disponibles
  }

  // ══════════════════════════════════════════════════════════════════════
  //  VUE TEMPS RÉEL
  // ══════════════════════════════════════════════════════════════════════

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
      error: err => console.error('[ProductionLog] stats:', err)
    });
  }

  loadAll(): void {
    this.isLoading = true;
    this.svc.getAllLogs().subscribe({
      next:  d   => { this.logs = d || []; this.isLoading = false; },
      error: err => { console.error('[ProductionLog]', err); this.logs = []; this.isLoading = false; }
    });
    this.loadStats();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      interval(30_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadAll());
    } else {
      this.destroy$.next();
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────
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

  // ── Selects ───────────────────────────────────────────────────────────
  get uniqueUsers():    string[] { return [...new Set(this.logs.map(l => l.userName).filter(Boolean))]; }
  get uniqueArticles(): string[] { return [...new Set(this.logs.map(l => l.itemCode).filter(a => !!a && a !== 'N/A'))].sort(); }

  // ── Filtre ────────────────────────────────────────────────────────────
  get filteredLogs(): ProductionLog[] {
    const term = this.searchTerm.toLowerCase();
    return this.logs.filter(l => {
      const s = !term || [l.lotCode, l.itemCode, l.userName, l.warehouse]
        .some(v => v?.toLowerCase().includes(term));
      return s
        && (!this.selectedType    || l.operationType === this.selectedType)
        && (!this.selectedStatus  || l.status        === this.selectedStatus)
        && (!this.selectedSource  || l.source        === this.selectedSource)
        && (!this.selectedUser    || l.userName      === this.selectedUser)
        && (!this.selectedArticle || l.itemCode      === this.selectedArticle)
        && (!this.todayOnly       || this.isTodayLog(l));
    });
  }

  clearFilters(): void {
    this.searchTerm = ''; this.selectedType = ''; this.selectedStatus = '';
    this.selectedSource = ''; this.selectedUser = ''; this.selectedArticle = '';
    this.todayOnly = false;
  }

  // ── Export Excel ──────────────────────────────────────────────────────
  exportExcel(): void {
    const rows = this.filteredLogs.map(l => ({
      'ID': l.id, 'Date': l.createdAt, 'Opérateur': l.userName,
      'Lot': l.lotCode, 'Article': l.itemCode, 'Magasin': l.warehouse,
      'Emplacement': l.location, 'Type': l.operationType, 'Statut': l.status,
      'Qté Avant': l.qtyBefore, 'Qté Sortie': l.qtyRequested, 'Qté Après': l.qtyAfter,
      'Source': l.source, 'Appareil': l.deviceInfo ?? '', 'Notes': l.notes ?? '',
      'Erreur': l.errorMessage ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:6},{wch:18},{wch:14},{wch:16},{wch:14},{wch:10},{wch:14},
      {wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:8},{wch:14},{wch:20},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sorties Production');
    const d = new Date().toISOString().slice(0,10);
    const a = this.selectedArticle ? `_${this.selectedArticle}` : '';
    const t = this.selectedType    ? `_${this.selectedType}`    : '';
    XLSX.writeFile(wb, `sorties${a}${t}_${d}.xlsx`);
  }

  // ── Détail ────────────────────────────────────────────────────────────
  openDetail(log: ProductionLog): void  { this.selectedLog = log; }
  closeDetail(): void                   { this.selectedLog = null; }
  trackByLog(_: number, l: ProductionLog): number { return l.id; }

  // ══════════════════════════════════════════════════════════════════════
  //  VUE ARCHIVES
  // ══════════════════════════════════════════════════════════════════════

  refreshArchives(): void {
    this.archivesLoading = true;
    this.svc.getArchives().subscribe({
      next:  data => { this.archives = data ?? []; this.archivesLoading = false; },
      error: err  => { console.error('[Archives]', err); this.archives = []; this.archivesLoading = false; }
    });
  }

  triggerArchive(): void {
    if (this.triggering) return;
    this.triggering     = true;
    this.triggerMessage = null;

    this.svc.triggerArchive().subscribe({
      next: res => {
        this.triggerMessage = res?.data?.message ?? 'Archivage terminé.';
        this.triggerSuccess = true;
        this.triggering     = false;
        setTimeout(() => this.refreshArchives(), 500);
      },
      error: err => {
        console.error('[Archives] trigger:', err);
        this.triggerMessage = 'Erreur lors du déclenchement.';
        this.triggerSuccess = false;
        this.triggering     = false;
      }
    });
  }

  download(file: ProductionArchiveFileDTO): void {
    if (this.downloading) return;
    this.downloading = file.fileName;
    this.svc.downloadArchive(file.fileName).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = file.fileName; a.click();
        window.URL.revokeObjectURL(url);
        this.downloading = null;
      },
      error: (err: unknown) => { console.error('[Archives] DL:', err); this.downloading = null; }
    });
  }

  // ── KPIs archives ─────────────────────────────────────────────────────
  get totalArchiveFiles(): number { return this.archives.length; }
  get totalArchiveLines(): number { return this.archives.reduce((a, f) => a + (f.lineCount  ?? 0), 0); }
  get totalArchiveSize():  string { return this.formatSize(this.archives.reduce((a, f) => a + (f.sizeBytes ?? 0), 0)); }

  // ── Helpers ───────────────────────────────────────────────────────────
  formatSize(bytes: number): string {
    if (!bytes)            return '0 o';
    if (bytes < 1024)      return `${bytes} o`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1_048_576).toFixed(2)} Mo`;
  }

  fileNameToDate(fileName: string): { date: string; time: string } {
    const m = fileName.match(/(\d{8})_(\d{6})/);
    if (!m) return { date: fileName, time: '' };
    const d = m[1], t = m[2];
    return {
      date: `${d.slice(6,8)}/${d.slice(4,6)}/${d.slice(0,4)}`,
      time: `${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`
    };
  }

  trackByFile(_: number, f: ProductionArchiveFileDTO): string { return f.fileName; }
}
