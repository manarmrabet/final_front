import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductionLog, ProductionStats } from '../../models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private base = `${environment.baseUrl}/api/production`;
  constructor(private http: HttpClient) {}

  getAllLogs(): Observable<ProductionLog[]> {
    return this.http.get<any>(`${this.base}/logs`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getTodayLogs(): Observable<ProductionLog[]> {
    return this.http.get<any>(`${this.base}/logs/today`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getStats(): Observable<ProductionStats> {
    return this.http.get<any>(`${this.base}/stats`).pipe(
      map(res => res?.data ?? res)
    );
  }

  getMyLogs(): Observable<ProductionLog[]> {
    return this.http.get<any>(`${this.base}/logs/me`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }
}
