// src/app/models/transfer.model.ts

export type TransferStatus = 'PENDING' | 'DONE' | 'ERROR' | 'CANCELLED';
export type TransferType   = 'PUTAWAY' | 'INTERNAL_RELOCATION' | 'REPLENISHMENT';

// ─── Requête de création de transfert ────────────────────────────────────────
export interface TransferRequest {
  erpItemCode:      string;
  sourceLocation:   string;
  destLocation:     string;
  sourceWarehouse?: string;   // t_cwar source (envoyé depuis carton scanné)
  destWarehouse?:   string;   // t_cwar dest   (résolu via getLocationInfo)
  quantity:         number;
  lotNumber?:       string;
  transferType?:    TransferType;
  notes?:           string;
}

// ─── Réponse de transfert ─────────────────────────────────────────────────────
export interface TransferResponse {
  id:               number;
  erpItemCode:      string;
  erpItemLabel:     string;
  lotNumber:        string | null;
  sourceLocation:   string;
  destLocation:     string;
  sourceWarehouse:  string | null;
  destWarehouse:    string | null;
  quantity:         number;
  unit:             string;
  status:           TransferStatus;
  transferType:     TransferType;
  operatorName:     string | null;
  validatedByName:  string | null;
  createdAt:        string;
  completedAt:      string | null;
  validatedAt:      string | null;
  notes:            string | null;
  errorMessage:     string | null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface TransferDashboard {
  countByStatus:      Record<TransferStatus, number>;
  totalToday:         number;
  totalThisWeek:      number;
  totalThisMonth:     number;
  topItems: {
    itemCode:  string;
    itemLabel: string;
    count:     number;
  }[];
  topOperators: {
    operatorName: string;
    count:        number;
  }[];
  topSourceLocations: {
    location: string;
    count:    number;
  }[];
}

// ─── Article ERP ──────────────────────────────────────────────────────────────
export interface ErpArticle {
  itemCode:    string;
  designation: string;
  unit:        string;   // t_cuni
  itemGroup:   string;
  itemType:    string;
}

// ─── Stock ERP (dbo_twhinr1401200) ───────────────────────────────────────────
export interface ErpStock {
  id:                  number;
  itemCode:            string;
  location:            string;
  lotNumber:           string | null;
  quantityAvailable:   number;   // t_qhnd uniquement (jamais t_qblk)
  warehouseCode:       string;
  entryDate:           string | null;
  lastTransactionDate: string | null;
  lineStatus:          string;
}

// ─── Emplacement ERP (dbo_twhwmd300310) ──────────────────────────────────────
// CORRECTION : remplace l'ancien ErpLocation qui avait locationType=string
// et ne reflétait pas le vrai ErpLocationDTO backend.
export interface ErpLocation {
  locationCode:  string;
  warehouseCode: string | null;   // t_cwar — null si emplacement inconnu
  description:   string | null;   // t_dsca
  zone:          string | null;   // t_zone
  locationType:  number | null;   // t_loct (entier ERP)
  active:        boolean;         // calculé depuis t_strt + t_oclo
  exists:        boolean;         // true si présent dans twhwmd300310
}

// ─── Paramètres de recherche ──────────────────────────────────────────────────
export interface TransferSearchParams {
  status?:    TransferStatus;
  itemCode?:  string;
  location?:  string;
  from?:      string;
  to?:        string;
  page?:      number;
  size?:      number;
}