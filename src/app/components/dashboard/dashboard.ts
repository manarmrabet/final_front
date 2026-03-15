import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin/admin';
import { CardConfigService } from '../../services/card-config/card-config';
import { MenuItemDTO } from '../../models/menu-item';
import { AuthService } from '../../services/auth/auth';
import { DashboardNotification } from '../../services/dashboard/dashboard-notification';
import { UserDTO, Role, Site } from '../../models/user.model';
import { DataStoreService } from '../../services/dataStore/data-store';
import { AuditService } from '../../services/audit/audit';
import { AuditLog } from '../../models/audit-log';
import { Subscription } from 'rxjs';

const LS_DISMISSED = 'dashboard_dismissed_menus';
const LS_ORDER     = 'dashboard_card_order';
const LS_CUSTOM    = 'dashboard_card_customs';

export const COLOR_PALETTE = [
  { color: '#4f6ef7', bg: '#eef2ff' }, { color: '#f04438', bg: '#fef3f2' },
  { color: '#ca8a04', bg: '#fefce8' }, { color: '#16a34a', bg: '#f0fdf4' },
  { color: '#7c3aed', bg: '#f5f3ff' }, { color: '#ea580c', bg: '#fff7ed' },
  { color: '#0891b2', bg: '#ecfeff' }, { color: '#a21caf', bg: '#fdf4ff' },
  { color: '#059669', bg: '#ecfdf5' }, { color: '#475569', bg: '#f8fafc' },
];

export const ICON_OPTIONS = [
  'icon-users','icon-shield','icon-package','icon-truck','icon-bar-chart-2',
  'icon-briefcase','icon-map-pin','icon-settings','icon-grid','icon-archive',
  'icon-shopping-cart','icon-layers','icon-activity','icon-home','icon-bell','icon-calendar',
];

export const SVG_REGISTRY: Record<string, string> = {
  'icon-users':         `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  'icon-shield':        `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  'icon-package':       `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
  'icon-truck':         `<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`,
  'icon-bar-chart-2':   `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  'icon-briefcase':     `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>`,
  'icon-map-pin':       `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`,
  'icon-settings':      `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'icon-grid':          `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
  'icon-archive':       `<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>`,
  'icon-shopping-cart': `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>`,
  'icon-layers':        `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  'icon-activity':      `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  'icon-home':          `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  'icon-bell':          `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  'icon-calendar':      `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  'icon-user-check':    `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>`,
  'icon-user-x':        `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>`,
  'icon-pie-chart':     `<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>`,
  'icon-building':      `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><rect x="9" y="7" width="6" height="4"/>`,
  'icon-log-in':        `<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>`,
  'icon-alert':         `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  'icon-edit':          `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  'icon-trash':         `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>`,
};

export interface StatCard {
  id: string; title: string; value: string | number; subValue?: string;
  icon: string; iconColor: string; iconBg: string;
  trend?: { label: string; positive: boolean };
  detail?: { label: string; value: string | number }[];
}

export interface DashboardCard {
  id: string; title: string; icon: string; iconBg: string; iconColor: string;
  subLabel: string; resolvedValue: string; resolvedSubValue: string;
  navigateTo?: string; menuItemId?: number;
}

interface CardCustom { icon: string; iconColor: string; iconBg: string; }

// Activité récente enrichie
export interface ActivityItem {
  id: number; label: string; sub: string; color: string; icon: string;
}

export function inferIconForMenu(menu: MenuItemDTO): { icon: string; iconBg: string; iconColor: string } {
  const label = (menu.label ?? '').toLowerCase();
  const link  = (menu.link  ?? '').toLowerCase();
  if (label.includes('user') || label.includes('utilisateur'))  return { icon:'icon-users',        iconBg:'#eef2ff', iconColor:'#4f6ef7' };
  if (label.includes('role') || label.includes('permission'))   return { icon:'icon-shield',       iconBg:'#fef3f2', iconColor:'#f04438' };
  if (label.includes('stock') || label.includes('article'))     return { icon:'icon-package',      iconBg:'#fefce8', iconColor:'#ca8a04' };
  if (label.includes('expéd') || label.includes('livraison'))   return { icon:'icon-truck',        iconBg:'#f0fdf4', iconColor:'#16a34a' };
  if (label.includes('commande') || label.includes('order'))    return { icon:'icon-shopping-cart',iconBg:'#fff7ed', iconColor:'#ea580c' };
  if (label.includes('rapport') || label.includes('stat'))      return { icon:'icon-bar-chart-2',  iconBg:'#f5f3ff', iconColor:'#7c3aed' };
  if (label.includes('fournisseur'))                            return { icon:'icon-briefcase',    iconBg:'#fdf4ff', iconColor:'#a21caf' };
  if (label.includes('site') || label.includes('entrepôt'))    return { icon:'icon-map-pin',      iconBg:'#eff6ff', iconColor:'#2563eb' };
  if (label.includes('menu') || label.includes('config'))       return { icon:'icon-settings',     iconBg:'#f8fafc', iconColor:'#475569' };
  if (label.includes('dashboard') || label.includes('accueil')) return { icon:'icon-grid',         iconBg:'#fafaf9', iconColor:'#78716c' };
  if (link.includes('magasin') || label.includes('magasin'))    return { icon:'icon-archive',      iconBg:'#ecfdf5', iconColor:'#059669' };
  return { icon:'icon-layers', iconBg:'#f1f5f9', iconColor:'#64748b' };
}

function getActivityColor(eventType: string, severity: string): string {
  if (eventType === 'LOGIN') return '#16a34a';
  if (eventType === 'LOGIN_FAILED') return '#f04438';
  if (eventType === 'LOGOUT') return '#6b7280';
  if (severity === 'ERROR' || severity === 'CRITICAL') return '#f04438';
  if (severity === 'WARNING') return '#ca8a04';
  if (eventType === 'CREATE') return '#4f6ef7';
  if (eventType === 'DELETE') return '#f04438';
  if (eventType === 'UPDATE') return '#ea580c';
  return '#9ca3af';
}

function getActivityIcon(eventType: string): string {
  if (eventType === 'LOGIN' || eventType === 'LOGOUT') return 'icon-log-in';
  if (eventType === 'LOGIN_FAILED') return 'icon-alert';
  if (eventType === 'CREATE') return 'icon-edit';
  if (eventType === 'DELETE') return 'icon-trash';
  if (eventType === 'UPDATE') return 'icon-edit';
  return 'icon-activity';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  if (diffMin < 1)  return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24)   return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1)  return 'Hier';
  return `Il y a ${diffD} jours`;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router       = inject(Router);
  private sanitizer    = inject(DomSanitizer);
  private adminService = inject(AdminService);
  readonly notifSvc    = inject(DashboardNotification);
  private cardConfig   = inject(CardConfigService);
  private authService  = inject(AuthService);
  private dataStore    = inject(DataStoreService);
  private auditService = inject(AuditService);

  authorizedMenus  = signal<MenuItemDTO[]>([]);
  isLoading        = signal(true);
  showProposal     = signal(false);
  currentDate      = new Date();

  // ── Stats admin ────────────────────────────────────────────────────────────
  allUsers     = signal<UserDTO[]>([]);
  allRoles     = signal<Role[]>([]);
  allSites     = signal<Site[]>([]);
  recentLogs   = signal<AuditLog[]>([]);
  statsLoading = signal(true);
  private storeSubs: Subscription[] = [];

  isAdmin = computed(() =>
    (this.authService.currentUserValue?.authorities ?? []).some(a => a.replace('ROLE_', '') === 'ADMIN')
  );

  // ── KPI cards ──────────────────────────────────────────────────────────────
  statCards = computed<StatCard[]>(() => {
    if (!this.isAdmin() || this.statsLoading()) return [];
    const users  = this.allUsers();
    const roles  = this.allRoles();
    const sites  = this.allSites();
    const logs   = this.recentLogs();
    const total      = users.length;
    const active     = users.filter(u => u.isActive === 1).length;
    const inactive   = total - active;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const todayLogs  = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
    return [
      { id:'total-users',  title:'Utilisateurs Actifs', value:active,        subValue:`${activeRate}% · ${inactive} inactifs`, icon:'icon-user-check', iconColor:'#16a34a', iconBg:'#f0fdf4', trend:{ label:`${total} total`, positive:true } },
      { id:'total-roles',  title:'Rôles Configurés',    value:roles.length,  subValue:roles.slice(0,3).map(r=>r.roleName).join(', ')+(roles.length>3?'...':''), icon:'icon-shield', iconColor:'#4f6ef7', iconBg:'#eef2ff', trend:undefined },
      { id:'total-menus',  title:'Menus Configurés',    value:this.authorizedMenus().length, subValue:`${this.authorizedMenus().filter((m: MenuItemDTO)=>!m.parentId).length} menus racine`, icon:'icon-grid', iconColor:'#ca8a04', iconBg:'#fefce8', trend:undefined },
      { id:'audit-today',  title:'Entrées Audit',       value:logs.length,   subValue:`▲ ${todayLogs} aujourd'hui`, icon:'icon-activity', iconColor:'#f04438', iconBg:'#fef3f2', trend:{ label:`${todayLogs} aujourd'hui`, positive:false } },
    ];
  });

  // ── Répartition par rôle ───────────────────────────────────────────────────
  roleDistribution = computed(() => {
    const users = this.allUsers();
    const roles = this.allRoles();
    const total = users.length;
    if (!total) return [];
    return roles.map(r => ({
      name:    r.roleName,
      count:   users.filter(u => u.roleName === r.roleName).length,
      percent: Math.round((users.filter(u => u.roleName === r.roleName).length / total) * 100),
      color:   ['#4f6ef7','#16a34a','#ea580c','#7c3aed','#0891b2'][roles.indexOf(r) % 5]
    })).filter(r => r.count > 0);
  });

  // ── Répartition par site ───────────────────────────────────────────────────
  siteDistribution = computed(() => {
    const users = this.allUsers();
    const sites = this.allSites();
    const total = users.length;
    if (!total) return [];
    const dist = sites.map(s => ({
      name:    s.siteName,
      count:   users.filter(u => u.siteName === s.siteName).length,
      total
    })).filter(s => s.count > 0);
    const noSite = users.filter(u => !u.siteName).length;
    if (noSite > 0) dist.push({ name: 'Non assigné', count: noSite, total });
    return dist;
  });

  // ── Utilisateurs récents ───────────────────────────────────────────────────
  recentUsers = computed(() => this.allUsers().slice(0, 5));

  // ── Activité récente ────────────────────────────────────────────────────────
  activityItems = computed<ActivityItem[]>(() =>
    this.recentLogs().slice(0, 8).map(log => ({
      id:    log.id,
      label: log.action || `${log.eventType} — ${log.userFullName || log.username}`,
      sub:   formatRelativeTime(log.createdAt),
      color: getActivityColor(log.eventType, log.severity),
      icon:  getActivityIcon(log.eventType)
    }))
  );

  // ── Audit severity aujourd'hui ────────────────────────────────────────────
  auditSeverity = computed(() => {
    const today = this.recentLogs().filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString());
    return {
      info:     today.filter(l => l.severity === 'INFO').length,
      warning:  today.filter(l => l.severity === 'WARNING').length,
      error:    today.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL').length,
    };
  });

  // ── Graphique barres 7 jours ──────────────────────────────────────────────
  chartDays = computed(() => {
    const logs  = this.recentLogs();
    const days: { label: string; logins: number; logouts: number; max: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === dayStr);
      days.push({
        label:   ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()],
        logins:  dayLogs.filter(l => l.eventType === 'LOGIN').length,
        logouts: dayLogs.filter(l => l.eventType === 'LOGOUT').length,
        max: 0
      });
    }
    const maxVal = Math.max(...days.map(d => Math.max(d.logins, d.logouts)), 1);
    return days.map(d => ({ ...d, max: maxVal }));
  });

  // ── Card Management ────────────────────────────────────────────────────────
  showManager = signal(false);
  editingCard = signal<DashboardCard | null>(null);
  dragOverId  = signal<string | null>(null);

  private dismissedIds = new Set<number>(JSON.parse(localStorage.getItem(LS_DISMISSED) ?? '[]'));
  private cardOrder: string[] = JSON.parse(localStorage.getItem(LS_ORDER) ?? '[]');
  private cardCustoms: Record<string, CardCustom> = JSON.parse(localStorage.getItem(LS_CUSTOM) ?? '{}');

  allCards = computed<DashboardCard[]>(() => {
    const base = this.authorizedMenus()
      .filter(m => m.menuItemId !== undefined && !m.isTitle && !m.isLayout && m.link)
      .map(m => {
        const id = String(m.menuItemId);
        const inferred = inferIconForMenu(m);
        const custom = this.cardCustoms[id];
        return { id, title: m.label ?? '', icon: custom?.icon ?? inferred.icon, iconBg: custom?.iconBg ?? inferred.iconBg, iconColor: custom?.iconColor ?? inferred.iconColor, subLabel: m.label ?? '', resolvedValue: '', resolvedSubValue: '', navigateTo: m.link ?? undefined, menuItemId: m.menuItemId };
      });
    if (this.cardOrder.length) base.sort((a, b) => (this.cardOrder.indexOf(a.id) === -1 ? 999 : this.cardOrder.indexOf(a.id)) - (this.cardOrder.indexOf(b.id) === -1 ? 999 : this.cardOrder.indexOf(b.id)));
    return base;
  });

  visibleCards = computed<DashboardCard[]>(() => {
    const roleName    = this.authService.currentUserValue?.authorities?.[0] ?? '';
    const roleIdMatch = this._roleIdFromName(roleName);
    const adminConfig = roleIdMatch !== null ? this.cardConfig.getConfig(roleIdMatch) : null;
    return this.allCards().filter(c => {
      const menuId = Number(c.id);
      if (adminConfig) { if (!adminConfig.visibleIds.includes(menuId)) return false; }
      return !this.dismissedIds.has(menuId);
    });
  });

  hiddenCards = computed<DashboardCard[]>(() => this.allCards().filter(c => this.dismissedIds.has(Number(c.id))));
  pendingMenu = computed(() => this.notifSvc.pendingNewMenu());
  readonly colorPalette = COLOR_PALETTE;
  readonly iconOptions  = ICON_OPTIONS;
  readonly svgRegistry  = SVG_REGISTRY;

  constructor() {
    effect(() => { const p = this.notifSvc.pendingNewMenu(); if (p) setTimeout(() => this.showProposal.set(true)); });
  }

  ngOnInit(): void {
    this.loadAuthorizedMenus();
    if (this.isAdmin()) this.loadAdminStats();
  }

  private loadAuthorizedMenus(): void {
    this.adminService.getAuthorizedMenus().subscribe({
      next: (menus) => { this.authorizedMenus.set(menus); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  private loadAdminStats(): void {
    this.statsLoading.set(true);
    this.storeSubs.push(
      this.dataStore.users$.subscribe(u => { this.allUsers.set(u); if (u.length > 0) this.statsLoading.set(false); }),
      this.dataStore.roles$.subscribe(r => this.allRoles.set(r)),
      this.dataStore.sites$.subscribe(s => { this.allSites.set(s); this.statsLoading.set(false); })
    );
    if (!this.dataStore.users.length) this.dataStore.loadAll();
    else { this.allUsers.set(this.dataStore.users); this.allRoles.set(this.dataStore.roles); this.allSites.set(this.dataStore.sites); this.statsLoading.set(false); }

    // Charger audit récent
    this.auditService.getLogs({ page: 0, size: 50, sort: 'createdAt,desc' }).subscribe({
      next: res => this.recentLogs.set(res.data?.content ?? []),
      error: () => {}
    });
  }

  ngOnDestroy(): void { this.storeSubs.forEach(s => s.unsubscribe()); }

  refreshStats(): void {
    if (!this.isAdmin()) return;
    this.dataStore.refreshUsers();
    this.auditService.getLogs({ page: 0, size: 50, sort: 'createdAt,desc' }).subscribe({
      next: res => this.recentLogs.set(res.data?.content ?? []),
      error: () => {}
    });
  }

  private _roleIdFromName(roleName: string): number | null {
    const normalize = (n: string) => n.trim().toUpperCase().replace(/^ROLE_/, '');
    const ni = normalize(roleName);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('dashboard_role_config_')) {
        try { const cfg = JSON.parse(localStorage.getItem(key)!); if (normalize(cfg.roleName) === ni) return cfg.roleId; } catch { }
      }
    }
    return null;
  }

  getUserInitials(u: UserDTO): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || u.userName?.[0]?.toUpperCase() || '?';
  }

  getRoleColor(roleName: string): string {
    const map: Record<string, string> = { ADMIN:'#4f6ef7', RESPONSABLE_MAGASIN:'#16a34a', MAGASINIER:'#ea580c', VIEWER:'#9ca3af', CONSULTATION:'#7c3aed' };
    return map[roleName] ?? '#9ca3af';
  }

  navigateTo(card: DashboardCard): void {
    if (!card.navigateTo) return;
    const link = card.navigateTo.trim();
    this.router.navigateByUrl(link.startsWith('/app') ? link : '/app' + (link.startsWith('/') ? link : '/' + link));
  }

  getSvgIcon(iconKey: string, color: string): SafeHtml {
    const paths = SVG_REGISTRY[iconKey] ?? SVG_REGISTRY['icon-layers'];
    return this.sanitizer.bypassSecurityTrustHtml(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`);
  }

  getSvgIconSm(iconKey: string, color: string): SafeHtml {
    const paths = SVG_REGISTRY[iconKey] ?? SVG_REGISTRY['icon-layers'];
    return this.sanitizer.bypassSecurityTrustHtml(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`);
  }

  toggleCardVisibility(card: DashboardCard): void {
    const id = Number(card.id);
    if (this.dismissedIds.has(id)) this.dismissedIds.delete(id); else this.dismissedIds.add(id);
    localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    this.authorizedMenus.set([...this.authorizedMenus()]);
  }

  isCardVisible(card: DashboardCard): boolean { return !this.dismissedIds.has(Number(card.id)); }

  removeCard(card: DashboardCard, e: MouseEvent): void {
    e.stopPropagation();
    this.dismissedIds.add(Number(card.id));
    localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    this.authorizedMenus.set([...this.authorizedMenus()]);
  }

  onDragStart(e: DragEvent, card: DashboardCard): void { e.dataTransfer?.setData('cardId', card.id); }
  onDragOver(e: DragEvent, card: DashboardCard): void  { e.preventDefault(); this.dragOverId.set(card.id); }

  onDrop(e: DragEvent, target: DashboardCard): void {
    e.preventDefault();
    const src = e.dataTransfer?.getData('cardId');
    if (!src || src === target.id) { this.dragOverId.set(null); return; }
    const order = this.allCards().map(c => c.id);
    const fi = order.indexOf(src), ti = order.indexOf(target.id);
    order.splice(fi, 1); order.splice(ti, 0, src);
    this.cardOrder = order;
    localStorage.setItem(LS_ORDER, JSON.stringify(order));
    this.authorizedMenus.set([...this.authorizedMenus()]);
    this.dragOverId.set(null);
  }

  onDragEnd(): void { this.dragOverId.set(null); }
  openEdit(card: DashboardCard): void { this.editingCard.set({ ...card }); }
  closeEdit(): void { this.editingCard.set(null); }

  setEditColor(c: { color: string; bg: string }): void {
    const card = this.editingCard(); if (card) this.editingCard.set({ ...card, iconColor: c.color, iconBg: c.bg });
  }

  setEditIcon(icon: string): void {
    const card = this.editingCard(); if (card) this.editingCard.set({ ...card, icon });
  }

  saveEdit(): void {
    const card = this.editingCard(); if (!card) return;
    this.cardCustoms[card.id] = { icon: card.icon, iconColor: card.iconColor, iconBg: card.iconBg };
    localStorage.setItem(LS_CUSTOM, JSON.stringify(this.cardCustoms));
    this.authorizedMenus.set([...this.authorizedMenus()]); this.editingCard.set(null);
  }

  resetCardCustom(card: DashboardCard): void {
    delete this.cardCustoms[card.id];
    localStorage.setItem(LS_CUSTOM, JSON.stringify(this.cardCustoms));
    this.authorizedMenus.set([...this.authorizedMenus()]); this.editingCard.set(null);
  }

  acceptProposal(): void {
    const menu = this.notifSvc.pendingNewMenu();
    if (menu?.menuItemId) { this.dismissedIds.delete(menu.menuItemId); localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds])); }
    this.loadAuthorizedMenus(); this.notifSvc.dismissProposal(); this.showProposal.set(false);
  }

  refuseProposal(): void {
    const menu = this.notifSvc.pendingNewMenu();
    if (menu?.menuItemId) { this.dismissedIds.add(menu.menuItemId); localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds])); }
    this.notifSvc.dismissProposal(); this.showProposal.set(false);
  }
}
