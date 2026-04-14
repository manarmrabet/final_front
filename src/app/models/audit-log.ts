export interface AuditLog {
  id: number;
  eventType: EventType;
  severity: Severity;
  userId: number;
  username: string;
  userFullName: string;
  userRole: string;
  userSite: string;
  ipAddress: string;
  httpMethod: string;
  endpoint: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  statusCode: number;
  errorMessage: string;
  stackTrace: string;
  durationMs: number;
  sessionId: string;
  createdAt: string;
}

export type EventType =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  | 'CREATE_FAILED'
  | 'ERROR' | 'EXPORT' | 'IMPORT';

export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditFilter {
  eventType?: EventType | null | '';
 severity?: Severity | null | '';
  userId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}


export interface AuditLog {
  id: number;
  eventType: EventType;
  severity: Severity;
  userId: number;
  username: string;
  userFullName: string;
  userRole: string;
  userSite: string;
  ipAddress: string;
  httpMethod: string;
  endpoint: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  statusCode: number;
  errorMessage: string;
  stackTrace: string;
  durationMs: number;
  sessionId: string;
  createdAt: string;
}



export interface ArchiveFile {
  filename: string;
  sizeBytes: number;
  archiveDate: string | null;   // ISO string depuis le backend
  recordCount: number;
}
