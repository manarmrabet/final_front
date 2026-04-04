// src/app/models/inventory.model.ts

export type SessionStatus = 'EN_COURS' | 'VALIDEE' | 'CLOTUREE';
export type LineStatut = 'CONFORME' | 'ECART' | 'MANQUANT' | 'SURPLUS';

export interface InventorySession {
  id: number;
  name: string;
  warehouseCode: string;
  warehouseLabel: string;
  status: SessionStatus;
  createdBy: string;
  createdAt: string;
  validatedAt?: string;
  totalLines: number;
}

export interface CreateSessionRequest {
  name: string;
  warehouseCode: string;
  warehouseLabel?: string;
}

export interface CollectLine {
  id: number;
  sessionId: number;
  locationCode: string;
  locationLabel: string;
  values: Record<string, string>;
  scannedBy: string;
  scannedAt: string;
}

export interface AddCollectLineRequest {
  sessionId: number;
  locationCode: string;
  locationLabel?: string;
  values: Record<string, string>;
}

export interface CollectTemplate {
  id: number;
  name: string;
  fields: string[];
  active: boolean;
}

export interface ReportLine {
  locationCode: string;
  itemCode: string;
  designation: string;
  lotNumber: string;
  warehouseCode: string;
  unit: string;
  quantiteErp: number;
  quantiteCollecte: number;
  ecart: number;
  statut: LineStatut;
}

export interface InventoryReport {
  id: number;
  sessionId: number;
  sessionName: string;
  warehouseCode: string;
  totalErp: number;
  totalCollecte: number;
  totalConforme: number;
  totalEcart: number;
  totalManquant: number;
  totalSurplus: number;
  generatedAt: string;
  lines: ReportLine[];
}