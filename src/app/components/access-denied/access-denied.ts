
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './access-denied.html',
  styleUrls: ['./access-denied.scss']
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);

  goToDashboard() {
    this.router.navigate(['/app/dashboard']);
  }
}
