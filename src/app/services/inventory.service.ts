import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  InventorySession, CreateSessionRequest,
  CollectLine, AddCollectLineRequest,
  CollectTemplate, InventoryReport
} from '../models/inventory.model';
import { API } from '../utils/api-endpoints';

@Injectable({ providedIn: 'root' })
export class InventoryService {

  private base = `${environment.baseUrl}/api/inventory`;

  constructor(private http: HttpClient) {}

  getSessions(): Observable<InventorySession[]> {
    return this.http.get<InventorySession[]>(API.INVENTORY.SESSIONS.BASE);
  }

  getSession(id: number): Observable<InventorySession> {
    return this.http.get<InventorySession>(API.INVENTORY.SESSIONS.BY_ID(id));
  }

  createSession(req: CreateSessionRequest): Observable<InventorySession> {
    return this.http.post<InventorySession>(API.INVENTORY.SESSIONS.BASE, req);
  }

  validateSession(id: number): Observable<InventorySession> {
    return this.http.put<InventorySession>(API.INVENTORY.SESSIONS.VALIDATE(id), {});
  }

  getLines(sessionId: number): Observable<CollectLine[]> {
    return this.http.get<CollectLine[]>(API.INVENTORY.SESSIONS.LINES(sessionId));
  }

  addLine(req: AddCollectLineRequest): Observable<CollectLine> {
    return this.http.post<CollectLine>(`${this.base}/lines`, req);
  }

  deleteLine(lineId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/lines/${lineId}`);
  }

  getTemplates(): Observable<CollectTemplate[]> {
    return this.http.get<CollectTemplate[]>(API.INVENTORY.TEMPLATES);
  }

  createTemplate(dto: Partial<CollectTemplate>): Observable<CollectTemplate> {
    return this.http.post<CollectTemplate>(API.INVENTORY.TEMPLATES, dto);
  }

  getErpWarehouses(): Observable<string[]> {
    return this.http.get<string[]>(API.INVENTORY.ERP.WAREHOUSES);
  }

  getErpLocations(warehouseCode: string): Observable<string[]> {
    return this.http.get<string[]>(API.INVENTORY.ERP.LOCATIONS(warehouseCode));
  }

  generateReport(sessionId: number): Observable<InventoryReport> {
    return this.http.post<InventoryReport>(API.INVENTORY.SESSIONS.REPORT(sessionId), {});
  }

  getReport(sessionId: number): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(API.INVENTORY.SESSIONS.REPORT(sessionId));
  }

  // On garde ces méthodes vides car l'export est géré avec fetch dans le component
  exportCollect(sessionId: number): void {}
  exportReport(sessionId: number): void {}
}