export type StockStatus = 'AVAILABLE' | 'BLOCKED' | 'PARTIAL_BLOCK' | 'EMPTY';

// ── Article Summary (GET /api/erp/stock/article-summary/{code}) ───────────
export interface ErpArticleSummary {
  itemCode:       string;
  designation:    string;
  searchName: string;
  mainLot:        string;
  mainWarehouse:  string;
  totalQtyOnHand: number;
  unit:           string;
  lastDate:       string;
  itemCategory:   string;
  lots:           ErpStockLine[];
}

// ── Stock line (dans lots[] de ErpArticleSummary) ─────────────────────────
export interface ErpStockLine {
  id:                  number;
  itemCode:            string;
  location:            string;
  lotNumber:           string;
  warehouseCode:       string;
  quantityAvailable:   number;
  quantityBlocked:     number;
  entryDate:           string;
  lastTransactionDate: string;
  status:              StockStatus;
}

// ── Lot line (GET /api/erp/stock/lot-details/{lotNumber}) ─────────────────
export interface ErpLotLine {
  id:                  number;
  lotNumber:           string;
  itemCode:            string;
  designation:         string;
  searchName: string;
  unit:                string;
  category:            string;
  location:            string;
  warehouseCode:       string;
  quantityAvailable:   number;
  quantityBlocked:     number;
  entryDate:           string;
  lastTransactionDate: string;
  status:              StockStatus;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface StockDashboard {
  byWarehouse: { warehouse: string; itemCount: number; totalQty: number }[];
  byLocation:  { location:  string; itemCount: number; totalQty: number }[];
  byCategory:  { category:  string; itemCount: number }[];
  topItems:    { itemCode: string; designation: string; totalQty: number; unit: string }[];

  totalQty:       number;   // quantité totale calculée backend
  totalArticles:  number;   //  nb de codes articles distincts
  totalLocations: number;   // nb d'emplacements distincts
}


export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
