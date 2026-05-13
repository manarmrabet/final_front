import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditFilter, AuditLog, ArchiveFile, ArchiveFilter, ArchiveLogEntry, EventType, Severity } from '../../../models/audit-log';
import { PageResponse, ApiResponse } from '../../../models/shared';
import { AuditService } from '../../../services/audit/audit';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, NgClass, LucideAngularModule],
  templateUrl: './audit-list.html',
  styleUrls: ['./audit-list.scss']
})
export class AuditListComponent implements OnInit {
  private auditService = inject(AuditService);

  // --- Signaux existants ---
  logs = signal<AuditLog[]>([]);
  totalElements = signal(0);
  totalPages = signal(0);
  loading = signal(false);
  selectedLog = signal<AuditLog | null>(null);

  // --- Signaux archives ---
  archives = signal<ArchiveFile[]>([]);
  viewMode = signal<'live' | 'archive'>('live');

  // --- Signaux recherche dans archives ---
  archiveLogs     = signal<ArchiveLogEntry[]>([]);
  archiveLoading  = signal(false);
  selectedArchive = signal<string | null>(null);
  archiveViewMode = signal<'list' | 'search'>('list');

  archiveFilters: ArchiveFilter = {};

  filters: AuditFilter = { eventType: '' as any, severity: '' as any, page: 0, size: 20 };

  eventTypes: EventType[] = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'CREATE_FAILED', 'CREATE', 'UPDATE', 'DELETE', 'ERROR', 'EXPORT', 'IMPORT'];
  severities: Severity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  ngOnInit(): void {
    this.loadLogs();
  }

  // ── Temps réel ────────────────────────────────────────────────────────────

  loadLogs(): void {
    this.loading.set(true);
    this.auditService.getLogs(this.filters).subscribe({
      next: (response: ApiResponse<PageResponse<AuditLog>>) => {
        const page = response.data;
        if (page) {
          this.logs.set(page.content);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(page.totalPages);
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Erreur chargement logs', err);
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void { this.filters.page = 0; this.loadLogs(); }
  resetFilters(): void { this.filters = { eventType: '' as any, severity: '' as any, page: 0, size: 20 }; this.loadLogs(); }
  onPageChange(page: number): void { this.filters.page = page; this.loadLogs(); }
  openDetail(log: AuditLog): void { this.selectedLog.set(log); }
  closeDetail(): void { this.selectedLog.set(null); }

  // ── Archives ──────────────────────────────────────────────────────────────

  loadArchives(): void {
    this.loading.set(true);
    this.archives.set([]);
    this.auditService.getArchives().subscribe({
      next: (res) => {
        const data = res.data ?? [];
        this.loading.set(false);
        this.archives.set([...data]);
      },
      error: (err) => {
        console.error('Erreur chargement archives', err);
        this.loading.set(false);
      }
    });
  }

  switchView(mode: 'live' | 'archive'): void {
    this.viewMode.set(mode);
    if (mode === 'archive') {
      this.loadArchives();
    } else {
      this.loadLogs();
    }
  }

  downloadArchive(filename: string): void {
    this.auditService.downloadArchive(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement de l\'archive', err);
      }
    });
  }

  selectArchive(filename: string): void {
    this.selectedArchive.set(
      this.selectedArchive() === filename ? null : filename
    );
  }

  searchInArchives(): void {
    this.archiveLoading.set(true);
    this.auditService
      .searchArchives(this.selectedArchive(), this.archiveFilters)
      .subscribe({
        next: (res) => {
          this.archiveLogs.set(res.data ?? []);
          this.archiveLoading.set(false);
          this.archiveViewMode.set('search');
        },
        error: (err) => {
          console.error('Erreur recherche archives', err);
          this.archiveLoading.set(false);
        }
      });
  }

  resetArchiveFilters(): void {
    this.archiveFilters = {};
    this.selectedArchive.set(null);
    this.archiveLogs.set([]);
    this.archiveViewMode.set('list');
  }

  // ── Classes CSS — logs temps réel (typés EventType / Severity) ────────────

  getSeverityClass(s: Severity): string {
    return ({ INFO: 'badge-info', WARNING: 'badge-warning', ERROR: 'badge-error', CRITICAL: 'badge-critical' })[s] ?? '';
  }

  getEventClass(eventType: EventType): string {
    const map: Record<string, string> = {
      LOGIN: 'event-login', LOGOUT: 'event-logout', LOGIN_FAILED: 'event-failed',
      CREATE: 'event-create', UPDATE: 'event-update', DELETE: 'event-delete',
      CREATE_FAILED: 'event-failed', ERROR: 'event-error',
      EXPORT: 'event-export', IMPORT: 'event-import'
    };
    return map[eventType] ?? '';
  }

  // ── Classes CSS — logs archives (string brut venant du CSV) ──────────────
  // ✅ Ces méthodes acceptent string et évitent le "as any" dans le template

  getArchiveSeverityClass(s: string): string {
    const map: Record<string, string> = {
      INFO: 'badge-info', WARNING: 'badge-warning',
      ERROR: 'badge-error', CRITICAL: 'badge-critical'
    };
    return map[s] ?? '';
  }

  getArchiveEventClass(eventType: string): string {
    const map: Record<string, string> = {
      LOGIN: 'event-login', LOGOUT: 'event-logout', LOGIN_FAILED: 'event-failed',
      CREATE: 'event-create', UPDATE: 'event-update', DELETE: 'event-delete',
      CREATE_FAILED: 'event-failed', ERROR: 'event-error',
      EXPORT: 'event-export', IMPORT: 'event-import'
    };
    return map[eventType] ?? '';
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  getEventIcon(eventType: EventType): string {
    const map: Record<string, string> = {
      LOGIN: '🔑', LOGOUT: '🚪', LOGIN_FAILED: '🚫', CREATE: '➕',
      UPDATE: '✏️', DELETE: '🗑️', CREATE_FAILED: '⚠️', ERROR: '❌',
      EXPORT: '📤', IMPORT: '📥'
    };
    return map[eventType] ?? '📋';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
  }
}
