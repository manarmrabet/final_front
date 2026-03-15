import { Injectable } from '@angular/core';

export interface DraftEntry {
  data:      Record<string, unknown>;
  context:   string;
  savedAt:   string;
}

@Injectable({ providedIn: 'root' })
export class FormDraftService {
  private readonly PREFIX = 'form_draft_';

  save(key: string, data: Record<string, unknown>, context?: string): void {
    try {
      sessionStorage.setItem(this.PREFIX + key, JSON.stringify({
        data,
        context: context ?? window.location.pathname,
        savedAt: new Date().toISOString(),
      } as DraftEntry));
    } catch (e) {
      console.warn('[FormDraft] Impossible de sauvegarder:', e);
    }
  }

  restore(key: string): DraftEntry | null {
    try {
      const raw = sessionStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  hasDraft(key: string): boolean {
    return sessionStorage.getItem(this.PREFIX + key) !== null;
  }

  clear(key: string): void {
    sessionStorage.removeItem(this.PREFIX + key);
  }

  clearAll(): void {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  }

  hasAny(): boolean {
    return Object.keys(sessionStorage).some(k => k.startsWith(this.PREFIX));
  }
}