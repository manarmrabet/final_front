// src/app/services/anomaly.service.ts
// VERSION CORRIGÉE :
// checkMlHealth() appelle /api/ml/health sur Spring Boot (pas FastAPI directement)
// → évite l'erreur CORS du navigateur

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnomalyAlertDTO {
  transferId:    number;
  operateur:     string;
  article:       string;
  magasin:       number;
  emplacement:   string;
  qteAvant:      number;
  qteSortie:     number;
  qteApres:      number;
  source:        string;
  appareil:      string;
  anomalyScore:  number;
  isoFlag:       number;
  lofFlag:       number;
  mouvementDate: string;
  recipientEmail: string;
}

export interface MlHealth {
  status:        string;
  models_loaded: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnomalyService {

  constructor(private http: HttpClient) {}

  /**
   * ✅ CORRECTION CORS :
   * Appelle /api/ml/health sur Spring Boot qui proxie vers FastAPI.
   * Ne pas appeler http://localhost:8000/health directement depuis Angular
   * car le navigateur bloque la requête cross-origin.
   */
  checkMlHealth(): Observable<MlHealth> {
    return this.http.get<MlHealth>(`${environment.baseUrl}/api/ml/health`);
  }

  /** Liste des anomalies depuis Spring Boot (avec auth JWT) */
  getAnomalies(): Observable<AnomalyAlertDTO[]> {
    return this.http.get<AnomalyAlertDTO[]>(`${environment.baseUrl}/api/ml/anomalies`);
  }

  /** Déclenche manuellement le batch */
  triggerDetection(): Observable<string> {
    return this.http.post(
      `${environment.baseUrl}/api/ml/anomalies/trigger`,
      {},
      { responseType: 'text' }
    );
  }
}
