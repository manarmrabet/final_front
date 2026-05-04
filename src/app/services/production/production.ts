import { Injectable }  from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';
import { map }         from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductionLog, ProductionStats } from '../../models/production.model';

// ── Type archive exporté — utilisé par production-archive.ts ─────────────
export interface ProductionArchiveFileDTO {
  fileName:    string;        // production_backup_20260502_020001.csv
  sizeBytes:   number;        // octets
  archiveDate: string | null; // ISO LocalDateTime
  lineCount:   number;        // lignes hors en-tête
}

// ── Types union pour typage strict (évite les any) ────────────────────────
type LogsResponse  = ProductionLog[]   | { data: ProductionLog[] };
type StatsResponse = ProductionStats   | { data: ProductionStats };
type ArchivesResponse = ProductionArchiveFileDTO[] | { data: ProductionArchiveFileDTO[] };

@Injectable({ providedIn: 'root' })
export class ProductionService {

  private base        = `${environment.baseUrl}/api/production`;
  // ✅ URL séparée pour les archives (tiret, pas slash) — évite le conflit côté backend
  private archiveBase = `${environment.baseUrl}/api/production-archives`;

  constructor(private http: HttpClient) {}

  // ── Logs existants ────────────────────────────────────────────────────────

  getAllLogs(): Observable<ProductionLog[]> {
    return this.http.get<LogsResponse>(`${this.base}/logs`).pipe(
      map((res): ProductionLog[] =>
        Array.isArray(res) ? res : (res as { data: ProductionLog[] }).data ?? []
      )
    );
  }

  getTodayLogs(): Observable<ProductionLog[]> {
    return this.http.get<LogsResponse>(`${this.base}/logs/today`).pipe(
      map((res): ProductionLog[] =>
        Array.isArray(res) ? res : (res as { data: ProductionLog[] }).data ?? []
      )
    );
  }

  getMyLogs(): Observable<ProductionLog[]> {
    return this.http.get<LogsResponse>(`${this.base}/logs/me`).pipe(
      map((res): ProductionLog[] =>
        Array.isArray(res) ? res : (res as { data: ProductionLog[] }).data ?? []
      )
    );
  }

  getStats(): Observable<ProductionStats> {
    return this.http.get<StatsResponse>(`${this.base}/stats`).pipe(
      map((res): ProductionStats =>
        'data' in (res as object)
          ? (res as { data: ProductionStats }).data
          : (res as ProductionStats)
      )
    );
  }

  // ── Archives CSV ──────────────────────────────────────────────────────────

  /**
   * Liste tous les CSV d'archive disponibles sur le serveur.
   * GET /api/production-archives
   * Répond avec ApiResponse<List<ProductionArchiveFileDTO>>
   */
  getArchives(): Observable<ProductionArchiveFileDTO[]> {
    return this.http.get<{ data: ProductionArchiveFileDTO[] }>(`${this.archiveBase}`).pipe(
      map(res => res?.data ?? [])
    );
  }

  /**
   * Télécharge un CSV en Blob.
   * GET /api/production-archives/download/{fileName}
   */
  downloadArchive(fileName: string): Observable<Blob> {
    return this.http.get(
      `${this.archiveBase}/download/${encodeURIComponent(fileName)}`,
      { responseType: 'blob' }
    );
  }

  /**
   * Déclenche l'archivage immédiatement (dev/test).
   * POST /api/production-archives/trigger
   */
  triggerArchive(): Observable<{ data: { message: string; file?: string } }> {
    return this.http.post<{ data: { message: string; file?: string } }>(
      `${this.archiveBase}/trigger`, {}
    );
  }
}
