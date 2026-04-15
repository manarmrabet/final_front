import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EtiquetteService {

  private readonly base = `${environment.baseUrl}/api/Etiquettepdf`;

  constructor(private http: HttpClient) {}

  /**
   * Appel direct du endpoint du rapport §2.1
   * start=0 & end=0 → toutes les étiquettes (rapport §2.3)
   */
  generateEtiquette(
    orderEtiquette: string,
    start = 0,
    end   = 0,
    username = 'system'
  ): Observable<Blob> {
    const url = `${this.base}/${orderEtiquette}/${start}/${end}/${username}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
