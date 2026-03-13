import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin/admin';
import { AuthService } from '../../services/auth/auth';
import { UserDTO, Role, Site } from '../../models/user.model';
import { LucideAngularModule } from 'lucide-angular';

interface DashboardCard {
  id: string;
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  dataEndpoint: string;
  subLabel: string;
  subEndpoint: string;
  navigateTo?: string;
  roles: string[];
  customValue?: string;
  customSubValue?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  private router       = inject(Router);
  private adminService = inject(AdminService);
  private authService  = inject(AuthService);

  private allUsers = signal<UserDTO[]>([]);
  private allRoles = signal<Role[]>([]);
  private allSites = signal<Site[]>([]);

  visibleCards = signal<(DashboardCard & { resolvedValue: string; resolvedSubValue: string })[]>([]);
  isLoading    = signal(true);

  ngOnInit(): void { this.loadData(); }

  private loadData(): void {
    const userRoles = this.authService.currentUserValue?.authorities ?? [];
    let usersLoaded = false, rolesLoaded = false;

    const tryBuild = () => {
      if (usersLoaded && rolesLoaded) { this.buildVisibleCards(userRoles); this.isLoading.set(false); }
    };

    this.adminService.getUsers().subscribe({ next: (u: UserDTO[]) => { this.allUsers.set(u); usersLoaded = true; tryBuild(); }, error: () => { usersLoaded = true; tryBuild(); } });
    this.adminService.getRoles().subscribe({ next: (r: Role[]) => { this.allRoles.set(r); rolesLoaded = true; tryBuild(); }, error: () => { rolesLoaded = true; tryBuild(); } });
    this.adminService.getSites().subscribe({ next: (s: Site[]) => this.allSites.set(s), error: () => {} });
  }

  private buildVisibleCards(userRoles: string[]): void {
    const allCards: DashboardCard[] = this.defaultCards();
    const filtered = allCards.filter(c => c.roles.some(r => userRoles.includes(r)));
    this.visibleCards.set(filtered.map(c => ({
      ...c,
      resolvedValue:    this.resolveValue(c.dataEndpoint, c.customValue),
      resolvedSubValue: this.resolveSubValue(c.subEndpoint, c.customSubValue)
    })));
  }

  private resolveValue(endpoint: string, custom?: string): string {
    if (endpoint === 'users')  return this.allUsers().length.toString();
    if (endpoint === 'roles')  return this.allRoles().length.toString();
    if (endpoint === 'sites')  return this.allSites().length.toString();
    if (endpoint === 'custom') return custom ?? '—';
    return '—';
  }

  private resolveSubValue(endpoint: string, custom?: string): string {
    if (endpoint === 'activeUsers') return this.allUsers().filter(u => u.isActive === 1).length.toString();
    if (endpoint === 'custom')      return custom ?? '';
    return '';
  }

  navigateTo(card: DashboardCard): void { if (card.navigateTo) this.router.navigate([card.navigateTo]); }

  private defaultCards(): DashboardCard[] {
    return [
      { id:'1', title:'Total Users',      icon:'icon-users',   iconBg:'#eef2ff', iconColor:'#4f6ef7', dataEndpoint:'users',  subLabel:'Utilisateurs actifs', subEndpoint:'activeUsers', navigateTo:'/user-management', roles:['ROLE_ADMIN'] },
      { id:'2', title:'Total Rôles',      icon:'icon-shield',  iconBg:'#fef3f2', iconColor:'#f04438', dataEndpoint:'roles',  subLabel:'Rôles définis',       subEndpoint:'none',        roles:['ROLE_ADMIN'] },
      { id:'3', title:'Articles en stock',icon:'icon-package', iconBg:'#fefce8', iconColor:'#ca8a04', dataEndpoint:'custom', subLabel:'Articles en stock',   subEndpoint:'none',        roles:['ROLE_ADMIN','ROLE_MAGASINIER'] },
      { id:'4', title:'Expéditions',      icon:'icon-truck',   iconBg:'#f0fdf4', iconColor:'#16a34a', dataEndpoint:'custom', subLabel:'Expéditions en cours',subEndpoint:'none',        roles:['ROLE_ADMIN','ROLE_RESPONSABLE_MAGASIN'] }
    ];
  }
}