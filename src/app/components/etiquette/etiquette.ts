// etiquette.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { animate, style, transition, trigger } from '@angular/animations';

import { EtiquetteService } from '../../services/etiquette/etiquette-service';

@Component({
  selector   : 'app-etiquette',
  standalone : true,
  imports    : [CommonModule, FormsModule],
  templateUrl: './etiquette.html',
  styleUrl   : './etiquette.scss',
  animations : [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('320ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EtiquetteComponent implements OnDestroy {

  // ── Form state ───────────────────────────────────────────────────
  orderNumber = '';
  start       = 0;
  end         = 0;

  // Récupération du username depuis localStorage (posé par l'AuthService)
  readonly username: string = localStorage.getItem('username') ?? 'system';

  // ── UI state ─────────────────────────────────────────────────────
  loading    = false;
  error      = '';
  pdfSafe    : SafeResourceUrl | null = null;
  labelCount = 0;

  private blobUrl = '';

  constructor(
    private readonly etiquetteService: EtiquetteService,
    private readonly sanitizer       : DomSanitizer
  ) {}

  // ── Actions ──────────────────────────────────────────────────────

  generate(): void {
    if (!this.orderNumber.trim()) {
      this.error = 'Veuillez saisir un numéro de commande (RCNO).';
      return;
    }

    if (this.start < 0 || this.end < 0) {
      this.error = 'Les valeurs De/À doivent être ≥ 0.';
      return;
    }

    if (this.end > 0 && this.start > this.end) {
      this.error = 'La valeur « De » ne peut pas dépasser « À ».';
      return;
    }

    this.loading    = true;
    this.error      = '';
    this.pdfSafe    = null;
    this.labelCount = 0;
    this.revokeBlob();

    this.etiquetteService
      .generateEtiquette(this.orderNumber.trim(), this.start, this.end, this.username)
      .subscribe({
        next : (blob: Blob) => {
          this.blobUrl    = URL.createObjectURL(blob);
          this.pdfSafe    = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
          this.labelCount = this.end === 0 ? 0 : this.end - Math.max(1, this.start) + 1;
          this.loading    = false;
        },
        error: (err) => {
          this.error   = err?.error?.message ?? 'Erreur lors de la génération du PDF.';
          this.loading = false;
        }
      });
  }

  download(): void {
    if (!this.blobUrl) return;
    const anchor   = document.createElement('a');
    anchor.href     = this.blobUrl;
    anchor.download = `Etiquettes_${this.orderNumber}.pdf`;
    anchor.click();
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnDestroy(): void { this.revokeBlob(); }

  private revokeBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = '';
    }
  }
}