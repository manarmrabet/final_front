import { environment } from '../../environments/environment';

const BASE = environment.baseUrl;

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
};