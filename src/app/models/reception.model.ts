export interface ReceptionLine {
  fournisseur: string;
  descFrs: string;
  daeFact: string;
  lg: string;
  oa: string;
  cwar: string;
  article: string;
  description: string;
  qteCdee: number;
  qteRecue: number;
  dino: string;
  emplacement: string;
  dateReception: string;
  numeroReception: string;
  devise: string;
  prixUnitaire?: number;
  valeurTotale?: number;
}

export interface ReceptionOrder {
  orderNumber: string;
  date: string;
  supplier: string;
  supplierCode: string;
  totalQty: number;
  devise: string;
  lines: ReceptionLine[];
}

export interface ReceptionSearchByOrder {
  orderNumber: string;
}

export interface ReceptionSearchByDate {
  startDate: string;
  endDate: string;
}

export interface ReceptionStats {
  totalOrders: number;
  totalQuantityOrdered: number;
  totalQuantityReceived: number;
  totalValue: number;
  receiptRate: number;
  supplierCount: number;
}

export interface ReceptionGroup {
  supplierCode: string;
  supplierName: string;
  orderNumber: string;
  receptionNumber: string;
  lines: ReceptionLine[];
  subTotalQtyOrdered: number;
  subTotalQtyReceived: number;
  subTotalValue?: number;
}

export interface ReceptionReport {
  exportDate: string;
  devise: string;
  supplier: string;
  totalGroups: number;
  groups: ReceptionGroup[];
  grandTotalQtyOrdered: number;
  grandTotalQtyReceived: number;
  grandTotalValue?: number;
}

export type ExportFormat = 'PDF_STANDARD' | 'PDF_VALUED' | 'EXCEL';
export type ReportType = 'BY_ORDER' | 'BY_DATE' | 'BY_SUPPLIER' | 'SUMMARY';
export type SearchMode = 'ORDER' | 'DATE_RANGE';

export interface QuickDateRange {
  label: string;
  start: string;
  end: string;
}