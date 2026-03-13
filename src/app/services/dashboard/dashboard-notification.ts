import { Injectable, signal } from '@angular/core';
import { MenuItemDTO } from '../../models/menu-item';

@Injectable({
  providedIn: 'root',
})
export class DashboardNotification {
  pendingNewMenu = signal<MenuItemDTO | null>(null);

  proposeDashboardCard(menu: MenuItemDTO): void {
    this.pendingNewMenu.set(menu);
  }

  dismissProposal(): void {
    this.pendingNewMenu.set(null);
  }

}
