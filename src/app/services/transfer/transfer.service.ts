// src/app/services/transfer/transfer.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, shareReplay, tap, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TransferRequest, TransferResponse, TransferDashboard,
  ErpArticle, ErpStock, ErpLocation, TransferSearchParams
} from '../../models/transfer.model';
import { environment } from '../../../environments/environment';

// ─── Types internes ───────────────────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

export interface PagedResponse<T> {
  content:       T[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
  first:         boolean;
  last:          boolean;
}

@Injectable({ providedIn: 'root' })
export class TransferService {

  private readonly api = environment.baseUrl;

  // ─── Cache articles ERP ───────────────────────────────────────────────────
  private articleCache = new Map<string, Observable<ErpArticle>>();

  // ─── Cache emplacements ERP ───────────────────────────────────────────────
  // Évite les appels répétés lors du scan des emplacements destination
  private locationCache = new Map<string, Observable<ErpLocation>>();

  // ─── État dashboard ───────────────────────────────────────────────────────
  private dashboardSubject = new BehaviorSubject<TransferDashboard | null>(null);
  dashboard$ = this.dashboardSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ═════════════════════════════════════════════════════════════════════════
  // TRANSFERTS
  // ═════════════════════════════════════════════════════════════════════════

  createTransfer(request: TransferRequest): Observable<TransferResponse> {
    return this.http.post<ApiResponse<TransferResponse>>(
      `${this.api}/api/transfers`, request
    ).pipe(
      map(r => r.data),
      tap(() => this.refreshDashboard())
    );
  }

  createBatch(requests: TransferRequest[]): Observable<TransferResponse[]> {
    return this.http.post<ApiResponse<TransferResponse[]>>(
      `${this.api}/api/transfers/batch`, requests
    ).pipe(
      map(r => r.data),
      tap(() => this.refreshDashboard())
    );
  }

  getAll(page = 0, size = 20): Observable<PagedResponse<TransferResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PagedResponse<TransferResponse>>>(
      `${this.api}/api/transfers`, { params }
    ).pipe(map(r => r.data));
  }

  search(params: TransferSearchParams): Observable<PagedResponse<TransferResponse>> {
    let p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    if (params.status)   p = p.set('status',   params.status);
    if (params.itemCode) p = p.set('itemCode', params.itemCode);
    if (params.location) p = p.set('location', params.location);
    if (params.from)     p = p.set('from',     params.from);
    if (params.to)       p = p.set('to',       params.to);
    return this.http.get<ApiResponse<PagedResponse<TransferResponse>>>(
      `${this.api}/api/transfers/search`, { params: p }
    ).pipe(map(r => r.data));
  }

  getById(id: number): Observable<TransferResponse> {
    return this.http.get<ApiResponse<TransferResponse>>(
      `${this.api}/api/transfers/${id}`
    ).pipe(map(r => r.data));
  }

  validate(id: number): Observable<TransferResponse> {
    return this.http.put<ApiResponse<TransferResponse>>(
      `${this.api}/api/transfers/${id}/validate`, {}
    ).pipe(map(r => r.data), tap(() => this.refreshDashboard()));
  }

  cancel(id: number, reason = ''): Observable<TransferResponse> {
    const params = new HttpParams().set('reason', reason);
    return this.http.put<ApiResponse<TransferResponse>>(
      `${this.api}/api/transfers/${id}/cancel`, null, { params }
    ).pipe(map(r => r.data), tap(() => this.refreshDashboard()));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════════════════════

  getDashboard(): Observable<TransferDashboard> {
    return this.http.get<ApiResponse<TransferDashboard>>(
      `${this.api}/api/transfers/dashboard`
    ).pipe(
      map(r => r.data),
      tap(d => this.dashboardSubject.next(d))
    );
  }

  refreshDashboard(): void {
    this.getDashboard().subscribe({ error: () => {} });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DONNÉES ERP
  // ═════════════════════════════════════════════════════════════════════════

  /** Cache par code article */
  getArticleByCode(code: string): Observable<ErpArticle> {
    if (!this.articleCache.has(code)) {
      const req$ = this.http.get<ApiResponse<ErpArticle>>(
        `${this.api}/api/transfers/erp/articles/${code}`
      ).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError(err => { this.articleCache.delete(code); throw err; })
      );
      this.articleCache.set(code, req$);
    }
    return this.articleCache.get(code)!;
  }

  searchArticles(query: string): Observable<ErpArticle[]> {
    return this.http.get<ApiResponse<ErpArticle[]>>(
      `${this.api}/api/transfers/erp/articles/search`,
      { params: new HttpParams().set('q', query) }
    ).pipe(map(r => r.data));
  }

  getStockByItem(itemCode: string): Observable<ErpStock[]> {
    return this.http.get<ApiResponse<ErpStock[]>>(
      `${this.api}/api/transfers/erp/stock/item/${itemCode}`
    ).pipe(map(r => r.data));
  }

  getStockByLocation(location: string): Observable<ErpStock[]> {
    return this.http.get<ApiResponse<ErpStock[]>>(
      `${this.api}/api/transfers/erp/stock/location/${location}`
    ).pipe(map(r => r.data));
  }

  /**
   * Récupère le stock par numéro de lot (t_clot).
   * Retourne t_qhnd — jamais t_qblk.
   */
  getStockByLot(lotNumber: string): Observable<ErpStock[]> {
    const encoded = encodeURIComponent(lotNumber.trim());
    return this.http.get<ApiResponse<ErpStock[]>>(
      `${this.api}/api/transfers/erp/stock/lot/${encoded}`
    ).pipe(map(r => r.data));
  }

  /**
   * Récupère les informations d'un emplacement depuis dbo_twhwmd300310.
   *
   * CORRECTION : utilise le nouveau ErpLocationDTO (exists + active depuis twhwmd300310).
   * Cache mis en place pour éviter les appels répétés lors du scan destination.
   *
   * Retourne :
   *   - locationCode, warehouseCode (t_cwar fiable)
   *   - active (t_strt + t_oclo), exists (présence dans twhwmd300310)
   */
  getLocationInfo(locationCode: string): Observable<ErpLocation> {
    const encoded = encodeURIComponent(locationCode.trim());
    if (!this.locationCache.has(locationCode)) {
      const req$ = this.http.get<ApiResponse<ErpLocation>>(
        `${this.api}/api/transfers/erp/location/${encoded}`
      ).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError(err => { this.locationCache.delete(locationCode); throw err; })
      );
      this.locationCache.set(locationCode, req$);
    }
    return this.locationCache.get(locationCode)!;
  }

  /** Vide le cache des emplacements (utile après un mouvement) */
  clearLocationCache(): void {
    this.locationCache.clear();
  }

  /** Vide le cache des articles */
  clearArticleCache(): void {
    this.articleCache.clear();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Affiche "Magasin / Emplacement" en utilisant les champs du backend.
   */
  getLocationParts(
    warehouse: string | null | undefined,
    location:  string | null | undefined
  ): { warehouse: string; emplacement: string } {
    const wh  = warehouse?.trim() || '—';
    const loc = location?.trim()  || '';
    if (loc && loc.toUpperCase() !== wh.toUpperCase()) {
      return { warehouse: wh, emplacement: loc };
    }
    return { warehouse: wh, emplacement: '—' };
  }
}