import { Injectable } from '@angular/core';

// ── Structure persistée par rôle ─────────────────────────────────────────────
export interface CardRoleConfig {
  roleId:     number;
  roleName:   string;
  visibleIds: number[]; // menuItemIds visibles pour ce rôle
}

// Interface locale (pas besoin d'importer depuis dashboard)
interface CardRef {
  id: string;
  menuItemId?: number;
}

const LS_PREFIX = 'dashboard_role_config_';

@Injectable({ providedIn: 'root' })
export class CardConfigService {

  getConfig(roleId: number): CardRoleConfig | null {
    const raw = localStorage.getItem(LS_PREFIX + roleId);
    return raw ? JSON.parse(raw) : null;
  }

  saveConfig(config: CardRoleConfig): void {
    localStorage.setItem(LS_PREFIX + config.roleId, JSON.stringify(config));
  }

  isCardVisible(roleId: number, menuItemId: number): boolean {
    const config = this.getConfig(roleId);
    if (!config) return true;
    return config.visibleIds.includes(menuItemId);
  }

  filterCardsForRole<T extends CardRef>(cards: T[], roleId: number): T[] {
    const config = this.getConfig(roleId);
    if (!config) return cards;
    return cards.filter(c =>
      c.menuItemId !== undefined && config.visibleIds.includes(c.menuItemId)
    );
  }

  resetConfig(roleId: number): void {
    localStorage.removeItem(LS_PREFIX + roleId);
  }

  /**
   * Quand l'admin réaffiche une card pour un rôle,
   * on purge le dismissedIds personnel pour que la card réapparaisse.
   * Clé localStorage user : 'dashboard_dismissed_menus'
   */
  syncDismissedWithAdminConfig(roleId: number): void {
    const config = this.getConfig(roleId);
    if (!config) return;

    const LS_DISMISSED = 'dashboard_dismissed_menus';
    const raw = localStorage.getItem(LS_DISMISSED);
    if (!raw) return;

    try {
      const dismissed: number[] = JSON.parse(raw);
      // Garder dans dismissed uniquement les IDs que l'admin a aussi masqués
      const synced = dismissed.filter(id => !config.visibleIds.includes(id));
      localStorage.setItem(LS_DISMISSED, JSON.stringify(synced));
    } catch { /* ignore */ }
  }
}
