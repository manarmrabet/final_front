// src/app/services/inventory.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  InventorySession, CreateSessionRequest,
  CollectLine, AddCollectLineRequest,
  InventoryReport
} from '../models/inventory.model';
import { API } from '../utils/api-endpoints';

@Injectable({ providedIn: 'root' })
export class InventoryService {

  constructor(private http: HttpClient) {}

  // ── Sessions ──────────────────────────────────────────────────────────────

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

  // ── Lignes ────────────────────────────────────────────────────────────────

  getLines(sessionId: number): Observable<CollectLine[]> {
    return this.http.get<CollectLine[]>(API.INVENTORY.SESSIONS.LINES(sessionId));
  }

  addLine(req: AddCollectLineRequest): Observable<CollectLine> {
    return this.http.post<CollectLine>(`${environment.baseUrl}/api/inventory/lines`, req);
  }

  deleteLine(lineId: number): Observable<void> {
    return this.http.delete<void>(`${environment.baseUrl}/api/inventory/lines/${lineId}`);
  }

  // ── Données ERP ───────────────────────────────────────────────────────────

  getErpWarehouses(): Observable<string[]> {
    return this.http.get<string[]>(API.INVENTORY.ERP.WAREHOUSES);
  }

  getErpLocations(warehouseCode: string): Observable<string[]> {
    return this.http.get<string[]>(API.INVENTORY.ERP.LOCATIONS(warehouseCode));
  }

  /**
   * Zones distinctes (t_zone) pour un magasin ERP.
   * Utilisé dans le sélecteur de zone du formulaire de création.
   */
  getErpZones(warehouseCode: string): Observable<string[]> {
    return this.http.get<string[]>(API.INVENTORY.ERP.ZONES(warehouseCode));
  }

  // ── Rapport ───────────────────────────────────────────────────────────────

  generateReport(sessionId: number): Observable<InventoryReport> {
    return this.http.post<InventoryReport>(API.INVENTORY.SESSIONS.REPORT(sessionId), {});
  }

  getReport(sessionId: number): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(API.INVENTORY.SESSIONS.REPORT(sessionId));
  }
}