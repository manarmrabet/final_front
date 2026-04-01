import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {

  currentYear = new Date().getFullYear();
  currentTime = '';
  private timer: any;

  stats = [
    { value: '107M+', label: 'Unités gérées',     icon: 'mdi-package-variant'   },
    { value: '3 697', label: 'Pages de stock',     icon: 'mdi-database'          },
    { value: '8',     label: 'Entrepôts actifs',   icon: 'mdi-warehouse'         },
    { value: '100%',  label: 'Temps réel ERP',     icon: 'mdi-lightning-bolt'    },
  ];

  features = [
    {
      icon:  'mdi-chart-box-outline',
      title: 'Dashboard Inventaire',
      desc:  'Visualisez en temps réel la répartition de vos stocks par entrepôt, catégorie et emplacement.',
      color: '#0D9488',
      bg:    '#F0FDFA',
    },
    {
      icon:  'mdi-barcode-scan',
      title: 'Consultation Stock',
      desc:  'Recherchez instantanément un article ou un lot. Obtenez coordonnées, quantités et statut.',
      color: '#2563EB',
      bg:    '#EFF6FF',
    },
    {
      icon:  'mdi-swap-horizontal',
      title: 'Gestion des Transferts',
      desc:  'Planifiez, validez et tracez chaque mouvement de marchandise entre emplacements.',
      color: '#7C3AED',
      bg:    '#F5F3FF',
    },
    {
      icon:  'mdi-shield-check-outline',
      title: 'Contrôle d\'accès',
      desc:  'Rôles, permissions et audit trail complet. Chaque action est tracée et horodatée.',
      color: '#D97706',
      bg:    '#FFFBEB',
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
