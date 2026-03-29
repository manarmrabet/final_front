// src/app/services/transfer/transfer.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, shareReplay, tap, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TransferRequest, TransferResponse, TransferDashboard,
  ErpArticle, ErpStock, TransferSearchParams
} from '../../models/transfer.model';
import { environment } from '../../../environments/environment';

// ─── Types de réponse backend ─────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

/**
 * PagedResponse — correspond exactement au record Java PagedResponse<T>
 * Structure : { content, page, size, totalElements, totalPages, first, last }
 *
 * FIX : avant on utilisait Page<T> Spring qui ne se sérialisait pas bien
 * et causait le blocage sur "Chargement..." côté Angular.
 */
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

  // ─── Cache articles ERP (shareReplay = 1 requête HTTP par code) ──────────
  private articleCache = new Map<string, Observable<ErpArticle>>();

  // ─── État dashboard partagé ───────────────────────────────────────────────
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

  /** Liste paginée — lit PagedResponse<TransferResponse> */
  getAll(page = 0, size = 20): Observable<PagedResponse<TransferResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PagedResponse<TransferResponse>>>(
      `${this.api}/api/transfers`, { params }
    ).pipe(map(r => r.data));
  }

  /** Recherche avec filtres — lit PagedResponse<TransferResponse> */
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

  /** Cache par code article — évite les appels répétés pour le même article */
  getArticleByCode(code: string): Observable<ErpArticle> {
    if (!this.articleCache.has(code)) {
      const req$ = this.http.get<ApiResponse<ErpArticle>>(
        `${this.api}/api/erp/articles/${code}`
      ).pipe(
        map(r => r.data),
        shareReplay(1),
        catchError(err => {
          this.articleCache.delete(code);
          throw err;
        })
      );
      this.articleCache.set(code, req$);
    }
    return this.articleCache.get(code)!;
  }

  searchArticles(query: string): Observable<ErpArticle[]> {
    return this.http.get<ApiResponse<ErpArticle[]>>(
      `${this.api}/api/erp/articles/search`,
      { params: new HttpParams().set('q', query) }
    ).pipe(map(r => r.data));
  }

  getStockByItem(itemCode: string): Observable<ErpStock[]> {
    return this.http.get<ApiResponse<ErpStock[]>>(
      `${this.api}/api/erp/stock/item/${itemCode}`
    ).pipe(map(r => r.data));
  }

  getStockByLocation(location: string): Observable<ErpStock[]> {
    return this.http.get<ApiResponse<ErpStock[]>>(
      `${this.api}/api/erp/stock/location/${location}`
    ).pipe(map(r => r.data));
  }
}