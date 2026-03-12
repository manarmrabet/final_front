import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Role, UserDTO, Site } from '../../models/user.model';
import { MenuItemDTO } from '../../models/menu-item'; 
import { ApiResponse } from '../../models/shared';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  private apiUrl = `http://localhost:8080/api`;

  // Chemins d'accès sécurisés correspondant au SecurityConfig
  private adminUsersUrl = `${this.apiUrl}/admin/users`;
  private adminRolesUrl = `${this.apiUrl}/admin/roles`;
  private adminSitesUrl = `${this.apiUrl}/admin/sites`;

  getUsers(): Observable<UserDTO[]> {
    return this.http.get<ApiResponse<UserDTO[]>>(this.adminUsersUrl).pipe(
      map(res => res.data)
    );
  }

 createUser(user: UserDTO): Observable<UserDTO> {
    // Changé de /api/users à /api/admin/users pour passer la sécurité
    return this.http.post<ApiResponse<UserDTO>>(this.adminUsersUrl, user).pipe(
      map(res => res.data)
    );
  }



  updateUser(id: number, user: UserDTO): Observable<UserDTO> {
  return this.http.put<ApiResponse<UserDTO>>(`${this.adminUsersUrl}/${id}`, user).pipe(
    map(res => res.data)
  );
}

  deleteUser(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.adminUsersUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  forceDeleteUser(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.adminUsersUrl}/${id}/force`).pipe(
      map(res => res.data)
    );
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(this.adminRolesUrl).pipe(
      map(res => res.data)
    );
  }

  getSites(): Observable<Site[]> {
    return this.http.get<ApiResponse<Site[]>>(this.adminSitesUrl).pipe(
      map(res => res.data)
    );
  }

  getAuthorizedMenus(): Observable<MenuItemDTO[]> {
    return this.http.get<ApiResponse<MenuItemDTO[]>>(`${this.apiUrl}/menu-items/me`).pipe(
      map(res => res.data || [])
    );
  }


getAllMenuItems(): Observable<ApiResponse<MenuItemDTO[]>> {
    return this.http.get<ApiResponse<MenuItemDTO[]>>(`${this.apiUrl}/menu-items`);
  }

  createMenuItem(menu: MenuItemDTO): Observable<ApiResponse<MenuItemDTO>> {
    return this.http.post<ApiResponse<MenuItemDTO>>(`${this.apiUrl}/menu-items`, menu);
  }

  updateMenuItem(id: number, menu: MenuItemDTO): Observable<ApiResponse<MenuItemDTO>> {
    return this.http.put<ApiResponse<MenuItemDTO>>(`${this.apiUrl}/menu-items/${id}`, menu);
  }
  deleteMenuItem(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/menu-items/${id}`);
  }
}
