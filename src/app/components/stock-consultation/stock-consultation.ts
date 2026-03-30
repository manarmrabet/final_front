import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { StockService } from '../../services/stock/stock';
import { ErpArticleSummary, ErpLotLine, ErpStockLine, StockStatus } from '../../models/stock.model';

type SearchMode = 'article' | 'lot';

@Component({
  selector: 'app-stock-consultation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './stock-consultation.html',
  styleUrls: ['./stock-consultation.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockConsultationComponent implements OnInit {

  searchMode: SearchMode = 'article';
  searchQuery = '';
  loading = false;
  error: string | null = null;

  // Résultats spécifiques (Recherche)
  article: ErpArticleSummary | null = null;
  lotLines: ErpLotLine[] = [];

  // Données pour la liste globale (Pagination serveur)
  globalStock: ErpLotLine[] = [];
  currentPage = 0;
  pageSize = 15;
  totalElements = 0;
  totalPages = 0;

  // Filtres pour la vue "Article"
  lotFilter = 'ALL';
  warehouseFilter = '';
  warehouses: string[] = [];

  constructor(
    private stockSvc: StockService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 1. Écouter les paramètres d'URL (pour redirection depuis dashboard)
    this.route.queryParams.subscribe(p => {
      if (p['code']) {
        this.searchQuery = p['code'];
        this.searchMode = 'article';
        this.onSearch();
      } else if (p['lot']) {
        this.searchQuery = p['lot'];
        this.searchMode = 'lot';
        this.onSearch();
      } else {
        // 2. Si aucune recherche, charger la liste globale par défaut
        this.loadGlobalStock();
      }
    });
  }

  /**
   * Charge la liste complète paginée (Vue par défaut)
   */
  loadGlobalStock(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.stockSvc.getAllStockPaginated(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.globalStock = res.content;
        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error = "Erreur lors du chargement de la base de données ERP.";
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Déclenche la recherche spécifique
   */
  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.reset();
      return;
    }

    this.loading = true;
    this.error = null;
    this.article = null;
    this.lotLines = [];
    this.cdr.markForCheck();

    if (this.searchMode === 'article') {
      this.stockSvc.getArticleSummary(q).subscribe({
        next: data => {
          this.article = data;
          this.warehouses = [...new Set(data.lots.map(l => l.warehouseCode).filter(Boolean))].sort();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          this.loading = false;
          this.error = err.status === 404 ? `Article "${q}" introuvable.` : 'Erreur de récupération.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.stockSvc.getLotDetails(q).subscribe({
        next: lines => {
          this.lotLines = lines;
          this.loading = false;
          if (!lines.length) this.error = `Aucun résultat pour le lot "${q}".`;
          this.cdr.markForCheck();
        },
        error: err => {
          this.loading = false;
          this.error = 'Erreur serveur lors de la recherche du lot.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * Navigation de la pagination
   */
  changePage(delta: number): void {
    const nextSearchPage = this.currentPage + delta;
    if (nextSearchPage >= 0 && nextSearchPage < this.totalPages) {
      this.currentPage = nextSearchPage;
      this.loadGlobalStock();
    }
  }

  // Getter pour filtrer les lots dynamiquement dans le template (Vue Article)
  get filteredLots(): ErpStockLine[] {
    if (!this.article) return [];
    return this.article.lots.filter(l => {
      const matchStatus = this.lotFilter === 'ALL' || l.status === this.lotFilter;
      const matchWh = !this.warehouseFilter || l.warehouseCode === this.warehouseFilter;
      return matchStatus && matchWh;
    });
  }

  switchMode(mode: SearchMode): void {
    this.searchMode = mode;
    this.reset();
  }

  reset(): void {
    this.searchQuery = '';
    this.article = null;
    this.lotLines = [];
    this.error = null;
    this.lotFilter = 'ALL';
    this.warehouseFilter = '';
    this.currentPage = 0;
    this.loadGlobalStock(); // On recharge la liste globale
    this.cdr.markForCheck();
  }

  // --- Helpers de calcul et style ---

  countLots(status: string): number {
    return this.article?.lots.filter(l => l.status === status).length ?? 0;
  }

  totalLotQty(): number {
    return this.lotLines.reduce((acc, curr) => acc + (curr.quantityAvailable || 0), 0);
  }

  getStatusLabel(s: StockStatus | string): string {
    const map: Record<string, string> = {
      AVAILABLE: 'Disponible',
      BLOCKED: 'Bloqué',
      PARTIAL_BLOCK: 'Part. bloqué',
      EMPTY: 'Vide',
    };
    return map[s] ?? s;
  }

  getModernStatusClass(s: StockStatus | string): string {
    const map: Record<string, string> = {
      'AVAILABLE': 'status-available',
      'BLOCKED': 'status-blocked',
      'PARTIAL_BLOCK': 'status-warning',
      'EMPTY': 'bg-light text-muted',
    };
    return map[s] ?? 'bg-light';
  }
}