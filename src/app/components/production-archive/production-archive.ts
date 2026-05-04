import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { Router, ActivatedRoute }       from '@angular/router';
import { interval, Subject }            from 'rxjs';
import { takeUntil }                    from 'rxjs/operators';
import { ProductionService, ProductionArchiveFileDTO }
       from '../../services/production/production';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ProductionArchiveComponent — SOLUTION DÉFINITIVE skeleton infini
 *
 *  VRAIE CAUSE du skeleton infini :
 *  Le composant est chargé en lazy loading. Angular crée le composant,
 *  exécute ngOnInit(), lance le HTTP → mais la détection de changements
 *  est déjà "verrouillée" sur le premier rendu du composant lazy.
 *  Résultat : isLoading passe à false en mémoire mais le template
 *  ne se met pas à jour jusqu'au prochain cycle (clic utilisateur).
 *
 *  SOLUTION DÉFINITIVE — même pattern que production-log :
 *  Utiliser un Resolver Angular qui charge les données AVANT le montage
 *  du composant. Les données arrivent via ActivatedRoute.data (synchrone
 *  du point de vue du composant) → isLoading = false dès le 1er rendu.
 *
 *  Voir aussi : ProductionArchiveResolver à créer dans resolvers/
 *  et la route à mettre à jour dans app.routes.ts.
 * ══════════════════════════════════════════════════════════════════════════
 */
@Component({
  selector:    'app-production-archive',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './production-archive.html',
  styleUrls:   ['./production-archive.scss']
})
export class ProductionArchiveComponent implements OnInit, OnDestroy {

  archives:       ProductionArchiveFileDTO[] = [];
  isLoading       = false;   // ✅ false par défaut — le resolver a déjà chargé
  autoRefresh     = false;
  downloading:    string | null = null;
  triggering      = false;
  triggerMessage: string | null = null;
  triggerSuccess  = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc:    ProductionService,
    private router: Router,
    private route:  ActivatedRoute   // ✅ pour lire les données du resolver
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    /**
     * ✅ SOLUTION — même pattern que ProductionLogComponent.ngOnInit()
     * Les archives arrivent déjà résolues via le resolver → pas d'attente HTTP.
     * isLoading reste false, pas de skeleton, affichage immédiat.
     */
    this.route.data.subscribe(data => {
      this.archives = data['archives'] ?? [];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToLogs(): void {
    this.router.navigate(['/app/production-log']);
  }

  // ── Rechargement manuel (bouton Actualiser) ───────────────────────────────

  load(): void {
    this.isLoading = true;
    this.svc.getArchives().subscribe({
      next:  data => { this.archives = data ?? []; this.isLoading = false; },
      error: err  => { console.error('[Archive]', err); this.archives = []; this.isLoading = false; }
    });
  }

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      interval(60_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.load());
    } else {
      this.destroy$.next();
    }
  }

  // ── Trigger manuel ────────────────────────────────────────────────────────

  triggerArchive(): void {
    if (this.triggering) return;
    this.triggering     = true;
    this.triggerMessage = null;

    this.svc.triggerArchive().subscribe({
      next: res => {
        this.triggerMessage = res?.data?.message ?? 'Archivage terminé.';
        this.triggerSuccess = true;
        this.triggering     = false;
        setTimeout(() => this.load(), 500);
      },
      error: err => {
        console.error('[Archive] Trigger error:', err);
        this.triggerMessage = 'Erreur lors du déclenchement.';
        this.triggerSuccess = false;
        this.triggering     = false;
      }
    });
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  get totalFiles():     number { return this.archives.length; }
  get totalLines():     number { return this.archives.reduce((a, f) => a + (f.lineCount  ?? 0), 0); }
  get totalSizeBytes(): number { return this.archives.reduce((a, f) => a + (f.sizeBytes  ?? 0), 0); }
  get totalSizeLabel(): string { return this.formatSize(this.totalSizeBytes); }

  // ── Téléchargement ────────────────────────────────────────────────────────

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
      error: (err: unknown) => {
        console.error('[Archive] DL failed:', err);
        this.downloading = null;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
