// etiquette-service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable }  from '@angular/core';
import { Observable }  from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EtiquetteService {

  private readonly base = `${environment.baseUrl}/api/Etiquettepdf`;

  constructor(private readonly http: HttpClient) {}

  /**
   * GET /api/Etiquettepdf/{rcno}/{start}/{end}/{username}
   * start=0 && end=0 → toutes les étiquettes de la commande
   */
  generateEtiquette(
    orderEtiquette : string,
    start          : number = 0,
    end            : number = 0,
    username       : string = 'system'
  ): Observable<Blob> {
    const url = `${this.base}/${orderEtiquette}/${start}/${end}/${username}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}