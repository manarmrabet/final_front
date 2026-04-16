// resolvers/production-log.resolver.ts — NOUVEAU fichier
import { Injectable }        from '@angular/core';
import { Resolve }           from '@angular/router';
import { Observable, of }    from 'rxjs';
import { catchError }        from 'rxjs/operators';

import { ProductionService } from '../services/production/production';
import { ProductionLog } from '../models/production.model';
@Injectable({ providedIn: 'root' })
export class ProductionLogResolver implements Resolve<ProductionLog[]> {
  constructor(private svc: ProductionService) {}

  resolve(): Observable<ProductionLog[]> {
    return this.svc.getAllLogs().pipe(
      catchError(() => of([]))
    );
  }
}
