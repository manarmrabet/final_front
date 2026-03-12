import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditFilter, AuditLog, EventType, Severity } from '../../../models/audit-log';
import{PageResponse, ApiResponse}from '../../../models/shared';
import { AuditService } from '../../../services/audit/audit';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, NgClass],
  templateUrl: './audit-list.html',
  styleUrls: ['./audit-list.scss']
})
export class AuditListComponent implements OnInit {
  private auditService = inject(AuditService);

  logs          = signal<AuditLog[]>([]);
  totalElements = signal(0);
  totalPages    = signal(0);
  loading       = signal(false);
  selectedLog   = signal<AuditLog | null>(null);

  filters: AuditFilter = { eventType: '' as any, severity: '' as any, page: 0, size: 20 };

  eventTypes: EventType[] = ['LOGIN','LOGOUT','LOGIN_FAILED','CREATE_FAILED','CREATE','UPDATE','DELETE','ERROR','EXPORT','IMPORT'];
  severities: Severity[]  = ['INFO','WARNING','ERROR','CRITICAL'];

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  ngOnInit(): void { this.loadLogs(); }

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
      error: (err: any) => { console.error('Erreur chargement logs', err); this.loading.set(false); }
    });
  }

  applyFilters(): void { this.filters.page = 0; this.loadLogs(); }
  resetFilters(): void { this.filters = { eventType: '' as any, severity: '' as any, page: 0, size: 20 }; this.loadLogs(); }
  onPageChange(page: number): void { this.filters.page = page; this.loadLogs(); }
  openDetail(log: AuditLog): void  { this.selectedLog.set(log); }
  closeDetail(): void              { this.selectedLog.set(null); }

  getSeverityClass(s: Severity): string {
    return ({ INFO:'badge-info', WARNING:'badge-warning', ERROR:'badge-error', CRITICAL:'badge-critical' })[s] ?? '';
  }
 getEventClass(eventType: EventType): string {
    const map: Record<string, string> = {
      LOGIN:        'event-login',
      LOGOUT:       'event-logout',
      LOGIN_FAILED: 'event-failed',
      CREATE:       'event-create',
      UPDATE:       'event-update',
      DELETE:       'event-delete',
      CREATE_FAILED:  'event-failed',
      ERROR:        'event-error',
      EXPORT:       'event-export',
      IMPORT:       'event-import'
      
    };
    return map[eventType] ?? '';
  }

  getEventIcon(eventType: EventType): string {
    const map: Record<string, string> = {
      LOGIN:        '🔑',
      LOGOUT:       '🚪',
      LOGIN_FAILED: '🚫',
      CREATE:       '➕',
      UPDATE:       '✏️',
      DELETE:       '🗑️',
      CREATE_FAILED:  '⚠️',
      ERROR:        '❌',
      EXPORT:       '📤',
      IMPORT:       '📥'
      
    };
    return map[eventType] ?? '📋';
  }
}