import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { StockService } from '../../services/stock/stock';
import { StockDashboard } from '../../models/stock.model';

Chart.register(...registerables);

@Component({
  selector: 'app-stock-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './stock-dashboard.html',
  styleUrls: ['./stock-dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDashboardComponent implements OnInit, OnDestroy {

  dashboard: StockDashboard | null = null;
  loading = false;
  error: string | null = null;
  lastRefresh: Date | null = null;
  kpiCards: any[] = [];

  private charts: Chart[] = [];

  private palette = [
    '#0D9488', '#2563EB', '#7C3AED', '#D97706',
    '#059669', '#DC2626', '#0891B2', '#9333EA',
    '#16A34A', '#64748B'
  ];

  constructor(
    private stockSvc: StockService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { this.loadDashboard(); }
  ngOnDestroy(): void { this.destroyCharts(); }

  loadDashboard(): void {
    this.loading = true;
    this.error = null; // Reset error on retry
    this.dashboard = null;
    this.kpiCards = [];
    this.destroyCharts();
    this.cdr.markForCheck();

    this.stockSvc.getDashboard().subscribe({
      next: (data: StockDashboard) => {
        this.dashboard = data;
        this.lastRefresh = new Date();
        this.loading = false;
        this.buildKpiCards();
        this.cdr.detectChanges();

        // Timeout légèrement augmenté pour garantir le rendu du DOM
        setTimeout(() => {
          this.buildCharts();
          this.cdr.detectChanges();
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Impossible de récupérer les données SQL Server.';
        console.error('Dashboard Error:', err);
        this.cdr.detectChanges();
      }
    });
  }

  goToArticle(code: string): void {
    this.router.navigate(['/app/stock/consultation'], { queryParams: { code } });
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  private buildKpiCards(): void {
    if (!this.dashboard) return;

    // Correction du reduce : vérification de l'existence de byWarehouse
    const totalQty = (this.dashboard.byWarehouse || []).reduce(
      (s, w) => s + (w.totalQty || 0), 0);

    this.kpiCards = [
      {
        label: 'Quantité totale', value: totalQty,
        unit: 'unités', icon: 'mdi-package-variant',
        color: '#0D9488', bg: '#F0FDFA'
      },
      {
        label: 'Articles en stock', value: this.dashboard.topItems?.length || 0,
        unit: 'références', icon: 'mdi-barcode',
        color: '#2563EB', bg: '#EFF6FF'
      },
      {
        label: 'Entrepôts actifs', value: this.dashboard.byWarehouse?.length || 0,
        unit: 'sites', icon: 'mdi-warehouse',
        color: '#7C3AED', bg: '#F5F3FF'
      },
      {
        label: 'Emplacements', value: this.dashboard.byLocation?.length || 0,
        unit: 'occupés', icon: 'mdi-map-marker',
        color: '#D97706', bg: '#FFFBEB'
      },
    ];
  }

  private buildCharts(): void {
    if (!this.dashboard) return;
    this.buildWarehouseChart();
    this.buildCategoryChart();
    this.buildLocationChart();
  }

  private buildWarehouseChart(): void {
    const el = document.getElementById('warehouseChart') as HTMLCanvasElement;
    if (!el || !this.dashboard?.byWarehouse) return;
    const data = this.dashboard.byWarehouse.slice(0, 10);

    this.charts.push(new Chart(el, {
      type: 'bar',
      data: {
        labels: data.map(d => d.warehouse),
        datasets: [{
          label: 'Quantité en stock',
          data: data.map(d => d.totalQty),
          backgroundColor: data.map((_, i) => this.palette[i % this.palette.length]),
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.65,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 12,
            callbacks: { label: ctx => ` ${Number(ctx.raw).toLocaleString('fr-FR')} unités` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 12, weight: 600 } } // CORRIGÉ : weight: 600 (nombre)
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11 },
              callback: (v: any) => {
                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                return v;
              }
            }
          }
        }
      }
    }));
  }

  private buildCategoryChart(): void {
    const el = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (!el || !this.dashboard?.byCategory) return;
    const data = this.dashboard.byCategory.slice(0, 9);

    this.charts.push(new Chart(el, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category),
        datasets: [{
          data: data.map(d => d.itemCount),
          backgroundColor: this.palette,
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 10,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 11, weight: 600 }, // CORRIGÉ : weight: 600
              color: '#64748B',
              padding: 12,
              usePointStyle: true
            }
          }
        }
      }
    }));
  }

  private buildLocationChart(): void {
    const el = document.getElementById('locationChart') as HTMLCanvasElement;
    if (!el || !this.dashboard?.byLocation) return;
    const data = [...this.dashboard.byLocation.slice(0, 10)].reverse();

    this.charts.push(new Chart(el, {
      type: 'bar',
      data: {
        labels: data.map(d => d.location),
        datasets: [{
          label: 'Quantité',
          data: data.map(d => d.totalQty),
          backgroundColor: '#2563EB',
          borderRadius: { topRight: 6, bottomRight: 6 },
          borderSkipped: false,
          barPercentage: 0.7,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            ticks: { color: '#94A3B8', font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#475569', font: { size: 12, weight: 600 } } // CORRIGÉ : weight: 600
          }
        }
      }
    }));
  }
}