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
  { label: 'Unités gérées', value: '107M+', icon: 'pi-box' },
  { label: 'Pages de stock', value: '3 697', icon: 'pi-file' },
  { label: 'Entrepôts actifs', value: '8', icon: 'pi-building' },
  { label: 'Temps réel ERP', value: '100%', icon: 'pi-sync' }
];
  features = [
  {
    title: 'Dashboard Inventaire',
    desc: 'Visualisez en temps réel la répartition de vos stocks...',
    icon: 'pi-chart-bar',
    bg: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399'
  },
  {
    title: 'Consultation Stock',
    desc: 'Recherchez instantanément un article ou un lot...',
    icon: 'pi-search',
    bg: 'rgba(96, 165, 250, 0.1)',
    color: '#60a5fa'
  },
  {
    title: 'Gestion des Transferts',
    desc: 'Planifiez, validez et tracez chaque mouvement...',
    icon: 'pi-directions',
    bg: 'rgba(167, 139, 250, 0.1)',
    color: '#a78bfa'
  },
  {
    title: "Contrôle d'accès",
    desc: 'Rôles, permissions et audit trail complet...',
    icon: 'pi-shield',
    bg: 'rgba(251, 191, 36, 0.1)',
    color: '#fbbf24'
  }
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
