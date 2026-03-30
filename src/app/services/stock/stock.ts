import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErpArticleSummary, ErpLotLine, PageResponse, StockDashboard } from '../../models/stock.model';

@Injectable({ providedIn: 'root' })
export class StockService {

  // baseUrl = http://localhost:8080  (sans /api car context-path n'est pas utilisé)
  // Le backend répond sur /api/erp/stock/...
  private base = `${environment.baseUrl}/web/erp/stock`;

  constructor(private http: HttpClient) {}

  // ── Article ───────────────────────────────────────────────────────────────
  /** GET /api/erp/stock/article-summary/{code} */
  getArticleSummary(code: string): Observable<ErpArticleSummary> {
    return this.http.get<ErpArticleSummary>(
      `${this.base}/article-summary/${encodeURIComponent(code.trim())}`
    );
  }

  // ── Lot ───────────────────────────────────────────────────────────────────
  /** GET /api/erp/stock/lot-details/{lotNumber} */
  getLotDetails(lotNumber: string): Observable<ErpLotLine[]> {
    return this.http.get<ErpLotLine[]>(
      `${this.base}/lot-details/${encodeURIComponent(lotNumber.trim())}`
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  /** GET /api/erp/stock/dashboard */
  getDashboard(): Observable<StockDashboard> {
    return this.http.get<StockDashboard>(`${this.base}/dashboard`);
  }

  getAllStockPaginated(page: number, size: number): Observable<PageResponse<ErpLotLine>> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());
  return this.http.get<PageResponse<ErpLotLine>>(`${this.base}/all`, { params });
}
}