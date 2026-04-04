// src/app/services/transfer/Archive.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ArchiveFile {
  fileName:  string;
  period:    string;   // Ex : "Mars 2025"
  createdAt: string;   // Ex : "01/04/2025 02:00"
  sizeKb:    number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

@Injectable({ providedIn: 'root' })
export class ArchiveService {

  private readonly api = environment.baseUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Récupère la liste des fichiers CSV d'archives disponibles.
   * GET /api/transfers/archives/files
   */
  listFiles(): Observable<ArchiveFile[]> {
    return this.http
      .get<ApiResponse<ArchiveFile[]>>(`${this.api}/api/transfers/archives/files`)
      .pipe(map(r => r.data));
  }

  /**
   * Télécharge un fichier CSV via fetch (pour envoyer le token JWT).
   * GET /api/transfers/archives/files/{fileName}
   */
  downloadFile(fileName: string): void {
    const url   = `${this.api}/api/transfers/archives/files/${encodeURIComponent(fileName)}`;
    const token =
      localStorage.getItem('jwt_token')    ||
      localStorage.getItem('token')        ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('auth_token')   ||
      sessionStorage.getItem('jwt_token');

    if (!token) {
      alert('Vous devez être connecté pour télécharger une archive.');
      return;
    }

    fetch(url, {
      method:  'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'text/csv;charset=UTF-8'
      }
    })
    .then(async response => {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} — ${text || response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a           = document.createElement('a');
      a.href            = downloadUrl;
      a.download        = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    })
    .catch(error => {
      console.error('❌ Erreur téléchargement archive :', error);
      alert(`Erreur lors du téléchargement :\n${error.message}`);
    });
  }
}