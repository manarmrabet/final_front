import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin/admin';

import { CardConfigService } from '../../services/card-config/card-config';
import { MenuItemDTO } from '../../models/menu-item';
import { AuthService } from '../../services/auth/auth';
import { DashboardNotification } from '../../services/dashboard/dashboard-notification';

// ─── Constantes localStorage ─────────────────────────────────────────────────
const LS_DISMISSED  = 'dashboard_dismissed_menus';
const LS_ORDER      = 'dashboard_card_order';
const LS_CUSTOM     = 'dashboard_card_customs'; // { [id]: { icon, iconColor, iconBg } }

// ─── Palette couleurs disponibles ────────────────────────────────────────────
export const COLOR_PALETTE = [
  { color: '#4f6ef7', bg: '#eef2ff' },
  { color: '#f04438', bg: '#fef3f2' },
  { color: '#ca8a04', bg: '#fefce8' },
  { color: '#16a34a', bg: '#f0fdf4' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#ea580c', bg: '#fff7ed' },
  { color: '#0891b2', bg: '#ecfeff' },
  { color: '#a21caf', bg: '#fdf4ff' },
  { color: '#059669', bg: '#ecfdf5' },
  { color: '#475569', bg: '#f8fafc' },
];

// ─── Icônes disponibles ───────────────────────────────────────────────────────
export const ICON_OPTIONS = [
  'icon-users', 'icon-shield', 'icon-package', 'icon-truck',
  'icon-bar-chart-2', 'icon-briefcase', 'icon-map-pin', 'icon-settings',
  'icon-grid', 'icon-archive', 'icon-shopping-cart', 'icon-layers',
  'icon-activity', 'icon-home', 'icon-bell', 'icon-calendar',
];

// ─── SVG registry ─────────────────────────────────────────────────────────────
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
};

export function inferIconForMenu(menu: MenuItemDTO): { icon: string; iconBg: string; iconColor: string } {
  const label = (menu.label ?? '').toLowerCase();
  const link  = (menu.link  ?? '').toLowerCase();
  if (label.includes('user') || label.includes('utilisateur'))
    return { icon: 'icon-users',        iconBg: '#eef2ff', iconColor: '#4f6ef7' };
  if (label.includes('role') || label.includes('permission'))
    return { icon: 'icon-shield',       iconBg: '#fef3f2', iconColor: '#f04438' };
  if (label.includes('stock') || label.includes('article') || label.includes('inventaire'))
    return { icon: 'icon-package',      iconBg: '#fefce8', iconColor: '#ca8a04' };
  if (label.includes('expéd') || label.includes('livraison') || label.includes('transport'))
    return { icon: 'icon-truck',        iconBg: '#f0fdf4', iconColor: '#16a34a' };
  if (label.includes('commande') || label.includes('order'))
    return { icon: 'icon-shopping-cart',iconBg: '#fff7ed', iconColor: '#ea580c' };
  if (label.includes('rapport') || label.includes('report') || label.includes('stat'))
    return { icon: 'icon-bar-chart-2',  iconBg: '#f5f3ff', iconColor: '#7c3aed' };
  if (label.includes('fournisseur') || label.includes('supplier'))
    return { icon: 'icon-briefcase',    iconBg: '#fdf4ff', iconColor: '#a21caf' };
  if (label.includes('site') || label.includes('entrepôt') || label.includes('warehouse'))
    return { icon: 'icon-map-pin',      iconBg: '#eff6ff', iconColor: '#2563eb' };
  if (label.includes('menu') || label.includes('configuration') || label.includes('config'))
    return { icon: 'icon-settings',     iconBg: '#f8fafc', iconColor: '#475569' };
  if (label.includes('dashboard') || label.includes('accueil'))
    return { icon: 'icon-grid',         iconBg: '#fafaf9', iconColor: '#78716c' };
  if (link.includes('magasin') || label.includes('magasin'))
    return { icon: 'icon-archive',      iconBg: '#ecfdf5', iconColor: '#059669' };
  return { icon: 'icon-layers',         iconBg: '#f1f5f9', iconColor: '#64748b' };
}

export interface DashboardCard {
  id: string;
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  subLabel: string;
  resolvedValue: string;
  resolvedSubValue: string;
  navigateTo?: string;
  menuItemId?: number;
}

interface CardCustom {
  icon: string;
  iconColor: string;
  iconBg: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  private router       = inject(Router);
  private sanitizer    = inject(DomSanitizer);
  private adminService = inject(AdminService);
  readonly notifSvc    = inject(DashboardNotification);
  private cardConfig   = inject(CardConfigService);
  private authService  = inject(AuthService);

  // ── State principal ────────────────────────────────────────────────────────
  authorizedMenus = signal<MenuItemDTO[]>([]);
  isLoading       = signal(true);
  showProposal    = signal(false);

  // ── Card Management ────────────────────────────────────────────────────────
  showManager     = signal(false);
  editingCard     = signal<DashboardCard | null>(null);
  dragOverId      = signal<string | null>(null);

  // ── Persistance ────────────────────────────────────────────────────────────
  private dismissedIds = new Set<number>(
    JSON.parse(localStorage.getItem(LS_DISMISSED) ?? '[]')
  );
  private cardOrder: string[] = JSON.parse(localStorage.getItem(LS_ORDER) ?? '[]');
  private cardCustoms: Record<string, CardCustom> = JSON.parse(
    localStorage.getItem(LS_CUSTOM) ?? '{}'
  );

  // ── Computed: toutes les cards (visibles + masquées) pour le manager ────────
  allCards = computed<DashboardCard[]>(() => {
    const base = this.authorizedMenus()
      .filter(m => m.menuItemId !== undefined && !m.isTitle && !m.isLayout && m.link)
      .map(m => {
        const id      = String(m.menuItemId);
        const inferred = inferIconForMenu(m);
        const custom  = this.cardCustoms[id];
        return {
          id,
          title:            m.label ?? '',
          icon:             custom?.icon      ?? inferred.icon,
          iconBg:           custom?.iconBg    ?? inferred.iconBg,
          iconColor:        custom?.iconColor ?? inferred.iconColor,
          subLabel:         m.label ?? '',
          resolvedValue:    '',
          resolvedSubValue: '',
          navigateTo:       m.link ?? undefined,
          menuItemId:       m.menuItemId
        };
      });

    // Appliquer l'ordre
    if (this.cardOrder.length) {
      base.sort((a, b) => {
        const ia = this.cardOrder.indexOf(a.id);
        const ib = this.cardOrder.indexOf(b.id);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return base;
  });

  // ── Computed: cards visibles selon rôle + dismissed perso ──────────────────
  visibleCards = computed<DashboardCard[]>(() => {
    const user     = this.authService.currentUserValue;
    const roleName = user?.authorities?.[0] ?? '';
    const roleIdMatch = this._roleIdFromName(roleName);
    const adminConfig = roleIdMatch !== null ? this.cardConfig.getConfig(roleIdMatch) : null;

    return this.allCards().filter(c => {
      const menuId = Number(c.id);

      // 1. Si config admin existe → elle est PRIORITAIRE
      //    La card doit être dans visibleIds admin pour être affichable
      if (adminConfig) {
        const allowedByAdmin = adminConfig.visibleIds.includes(menuId);
        if (!allowedByAdmin) return false; // admin a masqué → jamais visible
        // Admin a autorisé → l'user peut encore la masquer personnellement
        return !this.dismissedIds.has(menuId);
      }

      // 2. Pas de config admin → l'user gère librement
      return !this.dismissedIds.has(menuId);
    });
  });

  // ── Computed: cards masquées ───────────────────────────────────────────────
  hiddenCards = computed<DashboardCard[]>(() =>
    this.allCards().filter(c => this.dismissedIds.has(Number(c.id)))
  );

  pendingMenu = computed(() => this.notifSvc.pendingNewMenu());

  // ── Exposer pour le template ───────────────────────────────────────────────
  readonly colorPalette = COLOR_PALETTE;
  readonly iconOptions  = ICON_OPTIONS;
  readonly svgRegistry  = SVG_REGISTRY;

  constructor() {
    effect(() => {
      const pending = this.notifSvc.pendingNewMenu();
      if (pending) setTimeout(() => this.showProposal.set(true));
    });
  }

  ngOnInit(): void { this.loadAuthorizedMenus(); }

  private loadAuthorizedMenus(): void {
    this.adminService.getAuthorizedMenus().subscribe({
      next: (menus: MenuItemDTO[]) => {
        this.authorizedMenus.set(menus);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Erreur chargement menus:', err);
        this.isLoading.set(false);
      }
    });
  }


  // ── Récupère le roleId depuis le roleName stocké en LS ─────────────────────
  // Le JWT stocke "ROLE_ADMIN" mais le backend retourne "ADMIN"
  // On normalise les deux pour comparer
  private _roleIdFromName(roleName: string): number | null {
    // Normaliser : retirer le préfixe ROLE_ si présent
    const normalize = (name: string) =>
      name.trim().toUpperCase().replace(/^ROLE_/, '');

    const normalizedInput = normalize(roleName);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('dashboard_role_config_')) {
        try {
          const cfg = JSON.parse(localStorage.getItem(key)!);
          if (normalize(cfg.roleName) === normalizedInput) return cfg.roleId;
        } catch { /* ignore */ }
      }
    }
    return null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  navigateTo(card: DashboardCard): void {
    if (!card.navigateTo) return;
    const link = card.navigateTo.trim();
    const url  = link.startsWith('/app') ? link : '/app' + (link.startsWith('/') ? link : '/' + link);
    this.router.navigateByUrl(url);
  }

  // ── SVG helper ─────────────────────────────────────────────────────────────
  getSvgIcon(iconKey: string, color: string): SafeHtml {
    const paths = SVG_REGISTRY[iconKey] ?? SVG_REGISTRY['icon-layers'];
    const svg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getSvgIconRaw(iconKey: string, color: string): string {
    const paths = SVG_REGISTRY[iconKey] ?? SVG_REGISTRY['icon-layers'];
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  // ── Toggle visibilité ──────────────────────────────────────────────────────
  toggleCardVisibility(card: DashboardCard): void {
    const id = Number(card.id);
    if (this.dismissedIds.has(id)) {
      this.dismissedIds.delete(id);
    } else {
      this.dismissedIds.add(id);
    }
    localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    this.authorizedMenus.set([...this.authorizedMenus()]);
  }

  isCardVisible(card: DashboardCard): boolean {
    return !this.dismissedIds.has(Number(card.id));
  }

  // ── Masquer depuis le dashboard ────────────────────────────────────────────
  removeCard(card: DashboardCard, event: MouseEvent): void {
    event.stopPropagation();
    this.dismissedIds.add(Number(card.id));
    localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    this.authorizedMenus.set([...this.authorizedMenus()]);
  }

  // ── Drag & Drop (réordonnement) ────────────────────────────────────────────
  onDragStart(event: DragEvent, card: DashboardCard): void {
    event.dataTransfer?.setData('cardId', card.id);
  }

  onDragOver(event: DragEvent, card: DashboardCard): void {
    event.preventDefault();
    this.dragOverId.set(card.id);
  }

  onDrop(event: DragEvent, targetCard: DashboardCard): void {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData('cardId');
    if (!sourceId || sourceId === targetCard.id) { this.dragOverId.set(null); return; }

    const order = this.allCards().map(c => c.id);
    const fromIdx = order.indexOf(sourceId);
    const toIdx   = order.indexOf(targetCard.id);
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, sourceId);
    this.cardOrder = order;
    localStorage.setItem(LS_ORDER, JSON.stringify(order));
    this.authorizedMenus.set([...this.authorizedMenus()]);
    this.dragOverId.set(null);
  }

  onDragEnd(): void { this.dragOverId.set(null); }

  // ── Édition couleur/icône ──────────────────────────────────────────────────
  openEdit(card: DashboardCard): void {
    this.editingCard.set({ ...card });
  }

  closeEdit(): void { this.editingCard.set(null); }

  setEditColor(c: { color: string; bg: string }): void {
    const card = this.editingCard();
    if (!card) return;
    this.editingCard.set({ ...card, iconColor: c.color, iconBg: c.bg });
  }

  setEditIcon(icon: string): void {
    const card = this.editingCard();
    if (!card) return;
    this.editingCard.set({ ...card, icon });
  }

  saveEdit(): void {
    const card = this.editingCard();
    if (!card) return;
    this.cardCustoms[card.id] = {
      icon:      card.icon,
      iconColor: card.iconColor,
      iconBg:    card.iconBg
    };
    localStorage.setItem(LS_CUSTOM, JSON.stringify(this.cardCustoms));
    this.authorizedMenus.set([...this.authorizedMenus()]);
    this.editingCard.set(null);
  }

  resetCardCustom(card: DashboardCard): void {
    delete this.cardCustoms[card.id];
    localStorage.setItem(LS_CUSTOM, JSON.stringify(this.cardCustoms));
    this.authorizedMenus.set([...this.authorizedMenus()]);
    this.editingCard.set(null);
  }

  // ── Proposal ───────────────────────────────────────────────────────────────
  acceptProposal(): void {
    const menu = this.notifSvc.pendingNewMenu();
    if (menu?.menuItemId) {
      this.dismissedIds.delete(menu.menuItemId);
      localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    }
    this.loadAuthorizedMenus();
    this.notifSvc.dismissProposal();
    this.showProposal.set(false);
  }

  refuseProposal(): void {
    const menu = this.notifSvc.pendingNewMenu();
    if (menu?.menuItemId) {
      this.dismissedIds.add(menu.menuItemId);
      localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedIds]));
    }
    this.notifSvc.dismissProposal();
    this.showProposal.set(false);
  }
}