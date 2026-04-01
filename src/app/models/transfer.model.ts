// src/app/models/transfer.model.ts

export type TransferStatus = 'PENDING' | 'DONE' | 'ERROR' | 'CANCELLED';
export type TransferType   = 'PUTAWAY' | 'INTERNAL_RELOCATION' | 'REPLENISHMENT';

export interface TransferRequest {
  erpItemCode:    string;
  sourceLocation: string;
  destLocation:   string;
  quantity:       number;
  lotNumber?:     string;
  transferType?:  TransferType;
  notes?:         string;
}

export interface TransferResponse {
  id:              number;
  erpItemCode:     string;
  erpItemLabel:    string;
  lotNumber:       string | null;
  sourceLocation:  string;
  destLocation:    string;
  sourceWarehouse?: string;     // ← à ajouter
  destWarehouse?: string;
  quantity:        number;
  unit:            string;
  status:          TransferStatus;
  transferType:    TransferType;
  operatorName:    string | null;
  validatedByName: string | null;
  createdAt:       string;
  completedAt:     string | null;
  validatedAt:     string | null;
  notes:           string | null;
  errorMessage:    string | null;
}

export interface TransferDashboard {
  countByStatus:      Record<TransferStatus, number>;
  totalToday:         number;
  totalThisWeek:      number;
  totalThisMonth:     number;   // nouveau
  topItems: {
    itemCode:  string;
    itemLabel: string;
    count:     number;
  }[];
  topOperators: {                // nouveau
    operatorName: string;
    count:        number;
  }[];
  topSourceLocations: {          // nouveau
    location: string;
    count:    number;
  }[];
}

export interface ErpArticle {
  itemCode:    string;
  designation: string;
  unit:        string;   // t_cuni — NE PAS utiliser storageUnit
  itemGroup:   string;
  itemType:    string;
}

export interface ErpStock {
  id:                  number;
  itemCode:            string;
  location:            string;
  lotNumber:           string | null;
  quantityAvailable:   number;
  warehouseCode:       string;
  entryDate:           string;
  lastTransactionDate: string;
  lineStatus:          string;
}

export interface TransferSearchParams {
  status?:    TransferStatus;
  itemCode?:  string;
  location?:  string;
  from?:      string;
  to?:        string;
  page?:      number;
  size?:      number;
}