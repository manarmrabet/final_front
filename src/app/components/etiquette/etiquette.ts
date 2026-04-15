import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Vérifiez que ces lignes ne sont pas soulignées en rouge après le npm install
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EtiquetteService } from '../../services/etiquette/etiquette-service';

@Component({
  selector: 'app-etiquette',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule
  ],
  templateUrl: './etiquette.html',
  styleUrl: './etiquette.scss',
})
export class EtiquetteComponent implements OnDestroy {

  // ── Inputs ──────────────────────────────────────────────────────────
  orderNumber = '';
  start       = 0;
  end         = 0;
  username    = localStorage.getItem('username') ?? 'user';

  // ── État UI ─────────────────────────────────────────────────────────
  loading  = false;
  error    = '';
  pdfSafe: SafeResourceUrl | null = null;   // pour l'iframe
  private blobUrl = '';

  constructor(
    private svc:       EtiquetteService,
    private sanitizer: DomSanitizer
  ) {}

  generate(): void {
    if (!this.orderNumber.trim()) {
      this.error = 'Veuillez saisir un numéro de commande (RCNO).';
      return;
    }
    this.loading = true;
    this.error   = '';
    this.pdfSafe = null;
    this.revoke();

    this.svc.generateEtiquette(
      this.orderNumber.trim(), this.start, this.end, this.username
    ).subscribe({
      next: (blob: Blob) => {
        this.blobUrl = URL.createObjectURL(blob);
        // bypassSecurityTrustResourceUrl nécessaire pour l'iframe
        this.pdfSafe = this.sanitizer
          .bypassSecurityTrustResourceUrl(this.blobUrl);
        this.loading = false;
      },
      error: err => {
        this.error   = err?.error?.message
                       ?? 'Erreur lors de la génération du PDF.';
        this.loading = false;
      }
    });
  }

  /** Téléchargement forcé (en plus de la preview) */
  download(): void {
    if (!this.blobUrl) return;
    const a = Object.assign(document.createElement('a'), {
      href:     this.blobUrl,
      download: `Etiquettes_${this.orderNumber}.pdf`
    });
    a.click();
  }

  /** Libération mémoire à la destruction du composant */
  ngOnDestroy(): void { this.revoke(); }
  private revoke(): void {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
  }
}
