import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MenuItemDTO } from '../../models/menu-item'; 
import { ApiResponse } from '../../models/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleMappingService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api';
  

  /**
   * Récupère la liste complète des menus pour l'affichage des cases à cocher
   */
  getAllMenus(): Observable<MenuItemDTO[]> {
    return this.http.get<ApiResponse<MenuItemDTO[]>>(`${this.apiUrl}/menu-items`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Récupère les IDs des menus déjà attribués à un rôle spécifique
   * URL mise à jour pour correspondre au MenuItemController.java
   */
  getRoleMenuIds(roleId: number): Observable<number[]> {
    return this.http.get<ApiResponse<number[]>>(`${this.apiUrl}/menu-items/permissions/role/${roleId}`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Enregistre la nouvelle sélection de menus pour un rôle
   * URL mise à jour pour pointer vers /api/menu-items/permissions/save
   */
  saveMapping(roleId: number, menuItemIds: number[]): Observable<ApiResponse<void>> {
    const payload = {
      roleId: roleId,
      menuItemIds: menuItemIds
    };
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/menu-items/permissions/save`, payload);
  }
}
