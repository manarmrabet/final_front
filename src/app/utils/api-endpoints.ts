import { environment } from '../../environments/environment';

const BASE = `${environment.baseUrl}/api`;

export const API = {
  AUTH: {
    LOGIN:  `${BASE}/auth/signin`,
    LOGOUT: `${BASE}/auth/logout`,
    ME:     `${BASE}/auth/me`,
  },
  USERS: {
    BASE:   `${BASE}/users`,
    BY_ID:  (id: number) => `${BASE}/users/${id}`,
    TOGGLE: (id: number) => `${BASE}/users/${id}/toggle`,
  },
  ROLES: {
    BASE:   `${BASE}/roles`,
    BY_ID:  (id: number) => `${BASE}/roles/${id}`,
  },
  SITES: {
    BASE:   `${BASE}/sites`,
    BY_ID:  (id: number) => `${BASE}/sites/${id}`,
  },
  MENU: {
    BASE:    `${BASE}/menu-items`,
    BY_ROLE: (role: string) => `${BASE}/menu-items/role/${role}`,
  },
  AUDIT: {
    BASE:   `${BASE}/audit-logs`,
    BY_ID:  (id: number) => `${BASE}/audit-logs/${id}`,
    EXPORT: `${BASE}/audit-logs/export`,
  },

  // ====================== INVENTORY ======================
  INVENTORY: {
    BASE: `${BASE}/inventory`,
    SESSIONS: {
      BASE: `${BASE}/inventory/sessions`,
      BY_ID: (id: number) => `${BASE}/inventory/sessions/${id}`,
      LINES: (sessionId: number) => `${BASE}/inventory/sessions/${sessionId}/lines`,
      EXPORT_COLLECT: (sessionId: number) => `${BASE}/inventory/sessions/${sessionId}/export/collect`,
      EXPORT_REPORT: (sessionId: number) => `${BASE}/inventory/sessions/${sessionId}/export/report`,
      REPORT: (sessionId: number) => `${BASE}/inventory/sessions/${sessionId}/report`,
      VALIDATE: (sessionId: number) => `${BASE}/inventory/sessions/${sessionId}/validate`,
    },
    TEMPLATES: `${BASE}/inventory/templates`,
    ERP: {
      WAREHOUSES: `${BASE}/inventory/erp/warehouses`,
      LOCATIONS: (warehouseCode: string) => `${BASE}/inventory/erp/locations?warehouseCode=${warehouseCode}`,
    },
  },

  // ====================== RECEPTION ======================
  RECEPTION: {
    SEARCH_BY_ORDER: (orderNumber: string) =>
      `${BASE}/reception/by-order/${orderNumber}`,

    SEARCH_BY_DATE_RANGE: `${BASE}/reception/by-date-range`,

    GET_RECEPTION_DETAIL: (receptionNumber: string) =>
      `${BASE}/reception/detail/${receptionNumber}`,

    GET_STATS: `${BASE}/reception/stats`,

    EXPORT_PDF_BY_ORDER: (orderNumber: string) =>
      `${BASE}/reception/export/pdf/order/${orderNumber}`,

    EXPORT_PDF_VALUED: (orderNumber: string) =>
      `${BASE}/reception/export/pdf/valued/${orderNumber}`,

    EXPORT_EXCEL: `${BASE}/reception/export/excel`,

    EXPORT_EXCEL_BULK: `${BASE}/reception/export/excel/bulk`,
  },
};