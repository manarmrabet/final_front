// src/app/components/transfer-archives/transfer-archives.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { RouterModule }                          from '@angular/router';
import { ArchiveService, ArchiveFile }           from '../../services/transfer/Archive.service';

@Component({
  selector:    'app-transfer-archives',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './transfer-archives.html',
  styleUrls:   ['./transfer-archives.scss']
})
export class TransferArchivesComponent implements OnInit {

  files:   ArchiveFile[] = [];
  loading  = false;
  error:   string | null = null;

  constructor(
    private readonly archiveService: ArchiveService,
    private readonly cdr:            ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;
    this.error   = null;
    this.cdr.detectChanges();

    this.archiveService.listFiles().subscribe({
      next: files => {
        this.files   = files;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error   = err?.error?.message ?? err?.message ?? 'Erreur réseau';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  download(file: ArchiveFile): void {
    this.archiveService.downloadFile(file.fileName);
  }

  formatSize(kb: number): string {
    if (kb < 1024) return `${kb} Ko`;
    return `${(kb / 1024).toFixed(1)} Mo`;
  }
}