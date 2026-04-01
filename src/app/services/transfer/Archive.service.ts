// src/app/services/transfer/archive.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TransferResponse } from '../../models/transfer.model';
import { PagedResponse } from './transfer.service';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

export interface ArchiveSearchParams {
  status?:   string;
  itemCode?: string;
  location?: string;
  from?:     string;
  to?:       string;
  page?:     number;
  size?:     number;
}

@Injectable({ providedIn: 'root' })
export class ArchiveService {

  private readonly api = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Recherche paginée dans les archives.
   * Endpoint : GET /api/transfers/archives/search
   */
  search(params: ArchiveSearchParams): Observable<PagedResponse<TransferResponse>> {
    let p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);

    if (params.status)   p = p.set('status',   params.status);
    if (params.itemCode) p = p.set('itemCode', params.itemCode);
    if (params.location) p = p.set('location', params.location);
    if (params.from)     p = p.set('from',     params.from);
    if (params.to)       p = p.set('to',       params.to);

    return this.http
      .get<ApiResponse<PagedResponse<TransferResponse>>>(
        `${this.api}/api/transfers/archives/search`, { params: p }
      )
      .pipe(map(r => r.data));
  }

  /**
   * Déclenche le téléchargement CSV des archives via le navigateur.
   * Endpoint : GET /api/transfers/archives/export/csv
   *
   * Utilise window.open pour déclencher le téléchargement natif
   * (le backend renvoie Content-Disposition: attachment).
   */
  // src/app/services/transfer/archive.service.ts

/**
 * Export CSV avec gestion robuste du token JWT
 */
downloadCsv(params: ArchiveSearchParams): void {
  let p = new HttpParams();

  if (params.status)   p = p.set('status', params.status);
  if (params.itemCode) p = p.set('itemCode', params.itemCode);
  if (params.location) p = p.set('location', params.location);
  if (params.from)     p = p.set('from', params.from);
  if (params.to)       p = p.set('to', params.to);

  const baseUrl = `${this.api}/api/transfers/archives/export/csv`;
  const url = p.toString() ? `${baseUrl}?${p.toString()}` : baseUrl;

  // === RÉCUPÉRATION DU TOKEN (à adapter selon ton authentification) ===
  const token = 
    localStorage.getItem('jwt_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('jwt_token');

  if (!token) {
    console.error('❌ Aucun token JWT trouvé dans localStorage/sessionStorage');
    console.log('Clés disponibles dans localStorage:', Object.keys(localStorage));
    alert('Vous devez être connecté pour exporter les archives.');
    return;
  }

  console.log('✅ Token trouvé, longueur:', token.length);

  // Téléchargement via fetch avec Authorization header
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/csv;charset=UTF-8'
    }
  })
  .then(async response => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status} - ${text || response.statusText}`);
    }
    return response.blob();
  })
  .then(blob => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const filename = `transferts_archives_${new Date().toISOString().slice(0,10)}.csv`;
    
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    console.log(`✅ Fichier CSV téléchargé : ${filename}`);
  })
  .catch(error => {
    console.error('❌ Erreur export CSV:', error);
    alert(`Erreur lors du téléchargement :\n${error.message}`);
  });
}
}