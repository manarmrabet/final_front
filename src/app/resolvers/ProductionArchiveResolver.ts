import { Injectable }          from '@angular/core';
import { Resolve }             from '@angular/router';
import { Observable, of }      from 'rxjs';
import { catchError }          from 'rxjs/operators';
import { ProductionService, ProductionArchiveFileDTO }
       from '../services/production/production';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ProductionArchiveResolver
 *
 *  Charge la liste des archives CSV AVANT le montage du composant.
 *  Angular attend la résolution de ce resolver avant d'afficher la route
 *  → le composant reçoit les données immédiatement via ActivatedRoute.data
 *  → isLoading = false dès le premier rendu → plus de skeleton infini.
 *
 *  Même pattern exact que ProductionLogResolver (déjà fonctionnel).
 *
 *  En cas d'erreur HTTP (ex: 500, réseau), retourne [] pour ne pas
 *  bloquer la navigation.
 * ══════════════════════════════════════════════════════════════════════════
 */
@Injectable({ providedIn: 'root' })
export class ProductionArchiveResolver
       implements Resolve<ProductionArchiveFileDTO[]> {

  constructor(private svc: ProductionService) {}

  resolve(): Observable<ProductionArchiveFileDTO[]> {
    return this.svc.getArchives().pipe(
      // ✅ En cas d'erreur : retourne tableau vide, ne bloque pas la navigation
      catchError(() => of([]))
    );
  }
}
