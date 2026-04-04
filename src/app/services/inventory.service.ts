// src/app/services/inventory/inventory.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  InventorySession, CreateSessionRequest,
  CollectLine, AddCollectLineRequest,
  CollectTemplate, InventoryReport
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {

  private base = `${environment.baseUrl}/api/inventory`;

  constructor(private http: HttpClient) {}

  getSessions(): Observable<InventorySession[]> {
    return this.http.get<InventorySession[]>(`${this.base}/sessions`);
  }

  getSession(id: number): Observable<InventorySession> {
    return this.http.get<InventorySession>(`${this.base}/sessions/${id}`);
  }

  createSession(req: CreateSessionRequest): Observable<InventorySession> {
    return this.http.post<InventorySession>(`${this.base}/sessions`, req);
  }

  validateSession(id: number): Observable<InventorySession> {
    return this.http.put<InventorySession>(`${this.base}/sessions/${id}/validate`, {});
  }

  getLines(sessionId: number): Observable<CollectLine[]> {
    return this.http.get<CollectLine[]>(`${this.base}/sessions/${sessionId}/lines`);
  }

  // ← Ajout pour la collecte depuis le web
  addLine(req: AddCollectLineRequest): Observable<CollectLine> {
    return this.http.post<CollectLine>(`${this.base}/lines`, req);
  }

  deleteLine(lineId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/lines/${lineId}`);
  }

  getTemplates(): Observable<CollectTemplate[]> {
    return this.http.get<CollectTemplate[]>(`${this.base}/templates`);
  }

  createTemplate(dto: Partial<CollectTemplate>): Observable<CollectTemplate> {
    return this.http.post<CollectTemplate>(`${this.base}/templates`, dto);
  }

  getErpWarehouses(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/erp/warehouses`);
  }

  getErpLocations(warehouseCode: string): Observable<string[]> {
    const params = new HttpParams().set('warehouseCode', warehouseCode);
    return this.http.get<string[]>(`${this.base}/erp/locations`, { params });
  }

  generateReport(sessionId: number): Observable<InventoryReport> {
    return this.http.post<InventoryReport>(`${this.base}/sessions/${sessionId}/report`, {});
  }

  getReport(sessionId: number): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${this.base}/sessions/${sessionId}/report`);
  }

  exportCollect(sessionId: number): void {
    window.open(`${this.base}/sessions/${sessionId}/export/collect`, '_blank');
  }

  exportReport(sessionId: number): void {
    window.open(`${this.base}/sessions/${sessionId}/export/report`, '_blank');
  }
}