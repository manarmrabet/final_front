import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ReceptionLine,
  ReceptionOrder,
  ReceptionStats,
  ReceptionReport,
  ReceptionGroup,
} from '../../models/reception.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceptionService {
  private base = environment.baseUrl;

  constructor(private http: HttpClient) {}

  // ─── 1. Search by order number ───────────────────────────────────────────────
  searchByOrder(orderNumber: string): Observable<ReceptionLine[]> {
    return this.http.get<ReceptionLine[]>(
      `${this.base}/api/reception/by-order/${orderNumber}`
    );
  }

  // ─── 2. Search by date range ─────────────────────────────────────────────────
  searchByDateRange(
    startDate: string,
    endDate: string
  ): Observable<ReceptionOrder[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ReceptionOrder[]>(
      `${this.base}/api/reception/by-date-range`,
      { params }
    );
  }

  // ─── 3. Get reception detail ─────────────────────────────────────────────────
  getReceptionDetail(receptionNumber: string): Observable<ReceptionLine[]> {
    return this.http.get<ReceptionLine[]>(
      `${this.base}/api/reception/detail/${receptionNumber}`
    );
  }

  // ─── 4. Get stats ────────────────────────────────────────────────────────────
  getStats(startDate: string, endDate: string): Observable<ReceptionStats> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ReceptionStats>(`${this.base}/api/reception/stats`, {
      params,
    });
  }

  // ─── 5. Export PDF standard ──────────────────────────────────────────────────
  exportPdfByOrder(orderNumber: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/api/reception/export/pdf/order/${orderNumber}`,
      { responseType: 'blob' }
    );
  }

  // ─── 6. Export PDF valued ────────────────────────────────────────────────────
  exportPdfValued(orderNumber: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/api/reception/export/pdf/valued/${orderNumber}`,
      { responseType: 'blob' }
    );
  }

  // ─── 7. Export Excel by date range ───────────────────────────────────────────
  exportExcel(startDate: string, endDate: string): Observable<Blob> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get(`${this.base}/api/reception/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  // ─── 8. Export Excel bulk (multiple orders) ───────────────────────────────────
  exportExcelBulk(orderNumbers: string[]): Observable<Blob> {
    return this.http.post(
      `${this.base}/api/reception/export/excel/bulk`,
      { orderNumbers },
      { responseType: 'blob' }
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Group reception lines by supplier + order for report display */
  groupBySupplierAndOrder(lines: ReceptionLine[]): ReceptionGroup[] {
    const map = new Map<string, ReceptionGroup>();
    for (const line of lines) {
      const key = `${line.fournisseur}_${line.oa}_${line.numeroReception}`;
      if (!map.has(key)) {
        map.set(key, {
          supplierCode: line.fournisseur,
          supplierName: line.descFrs,
          orderNumber: line.oa,
          receptionNumber: line.numeroReception,
          lines: [],
          subTotalQtyOrdered: 0,
          subTotalQtyReceived: 0,
        });
      }
      const group = map.get(key)!;
      group.lines.push(line);
      group.subTotalQtyOrdered += line.qteCdee;
      group.subTotalQtyReceived += line.qteRecue;
    }
    return Array.from(map.values());
  }

  /** Calculate valorization totals */
  calculateValorization(lines: ReceptionLine[]): number {
    return lines.reduce(
      (sum, l) => sum + (l.prixUnitaire ?? 0) * l.qteRecue,
      0
    );
  }

  /** Build full report object */
  buildReport(lines: ReceptionLine[]): ReceptionReport {
    const groups = this.groupBySupplierAndOrder(lines);
    const now = new Date();
    return {
      exportDate: now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      devise: lines[0]?.devise ?? 'USD',
      supplier: lines[0]
        ? `${lines[0].fournisseur} - ${lines[0].descFrs}`
        : '',
      totalGroups: groups.length,
      groups,
      grandTotalQtyOrdered: lines.reduce((s, l) => s + l.qteCdee, 0),
      grandTotalQtyReceived: lines.reduce((s, l) => s + l.qteRecue, 0),
      grandTotalValue: this.calculateValorization(lines),
    };
  }

  /** Download helper */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}