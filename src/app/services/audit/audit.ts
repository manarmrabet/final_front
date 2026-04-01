import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditFilter, AuditLog } from '../../models/audit-log';
import { PageResponse, ApiResponse } from '../../models/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);

  private readonly API = `${environment.baseUrl}/api/audit`;

  getLogs(filters: AuditFilter): Observable<ApiResponse<PageResponse<AuditLog>>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 20)
      .set('sort', 'createdAt,desc');

    if (filters.eventType && (filters.eventType as any) !== '') {
      params = params.set('eventType', filters.eventType);
    }
    if (filters.severity && (filters.severity as any) !== '') {
      params = params.set('severity', filters.severity);
    }
    if (filters.userId) {
      params = params.set('userId', filters.userId.toString());
    }

    // ── Filtres date ── les 2 lignes qui manquaient ────────
    if (filters.from) {
      params = params.set('from', filters.from.length === 16 ? filters.from + ':00' : filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to.length === 16 ? filters.to + ':00' : filters.to);
    }

    return this.http.get<ApiResponse<PageResponse<AuditLog>>>(this.API, { params });
  }

  getByUser(userId: number, page = 0, size = 20): Observable<ApiResponse<PageResponse<AuditLog>>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'createdAt,desc');

    return this.http.get<ApiResponse<PageResponse<AuditLog>>>(`${this.API}/user/${userId}`, { params });
  }

  getConnections(userId: number): Observable<ApiResponse<AuditLog[]>> {
    return this.http.get<ApiResponse<AuditLog[]>>(`${this.API}/user/${userId}/connections`);
  }

  getArchives(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API}/archives`);
  }

  downloadArchive(filename: string): Observable<Blob> {
    return this.http.get(`${this.API}/archives/download/${filename}`, {
      responseType: 'blob'
    });
  }
}
