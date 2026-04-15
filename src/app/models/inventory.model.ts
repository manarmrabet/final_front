// src/app/models/inventory.model.ts

export type SessionStatus = 'EN_COURS' | 'VALIDEE' | 'CLOTUREE';
export type LineStatut     = 'CONFORME' | 'ECART' | 'MANQUANT' | 'SURPLUS';

/** Champs de collecte disponibles — ordre fixe */
export const COLLECT_FIELDS = ['ARTICLE', 'LOT', 'EMPLACEMENT', 'QUANTITE'] as const;
export type CollectField = typeof COLLECT_FIELDS[number];

export interface InventorySession {
  id:             number;
  name:           string;
  warehouseCode:  string;
  warehouseLabel: string;
  /** Zone ERP (t_zone) — null si non renseignée */
  warehouseZone?: string | null;
  /** Champs de collecte sélectionnés à la création */
  collectFields:  string[];
  status:         SessionStatus;
  createdBy:      string;
  createdAt:      string;
  validatedAt?:   string;
  totalLines:     number;
}

export interface CreateSessionRequest {
  name:           string;
  warehouseCode:  string;
  warehouseLabel?: string;
  /** Zone optionnelle */
  warehouseZone?: string;
  /** Champs cochés par l'utilisateur */
  collectFields:  string[];
}

export interface CollectLine {
  id:            number;
  sessionId:     number;
  locationCode:  string;
  locationLabel: string;
  values:        Record<string, string>;
  scannedBy:     string;
  scannedAt:     string;
}

export interface AddCollectLineRequest {
  sessionId:      number;
  locationCode:   string;
  locationLabel?: string;
  values:         Record<string, string>;
}

export interface ReportLine {
  locationCode:      string;
  itemCode:          string;
  designation:       string;
  lotNumber:         string;
  warehouseCode:     string;
  unit:              string;
  quantiteErp:       number;
  quantiteCollecte:  number;
  ecart:             number;
  statut:            LineStatut;
}

export interface InventoryReport {
  id:              number;
  sessionId:       number;
  sessionName:     string;
  warehouseCode:   string;
  warehouseZone?:  string | null;
  totalErp:        number;
  totalCollecte:   number;
  totalConforme:   number;
  totalEcart:      number;
  totalManquant:   number;
  totalSurplus:    number;
  generatedAt:     string;
  lines:           ReportLine[];
}