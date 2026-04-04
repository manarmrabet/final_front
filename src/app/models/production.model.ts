export interface ProductionLog {
  id:            number;
  lotCode:       string;
  itemCode:      string;
  warehouse:     string;
  location:      string;
  qtyBefore:     number;
  qtyRequested:  number;
  qtyAfter:      number;
  qtyDelta:      number;
  operationType: 'TOTALE' | 'PARTIELLE';
  status:        'SUCCESS' | 'FAILED';
  userId:        number;
  userName:      string;
  deviceInfo:    string;
  source:        'MOBILE' | 'WEB';
  createdAt:     string;
  notes:         string;
  stockVide:     boolean;
  errorMessage:  string;
}

export interface ProductionStats {
  totalOpsToday:  number;
  totalQtyToday:  number;
  failedToday:    number;
  recentLogs:     ProductionLog[];
  operatorStats:  { userId: number; userName: string; nbOps: number; totalQty: number }[];
}
