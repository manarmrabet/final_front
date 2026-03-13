import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import{AuthService} from './services/auth/auth';
import { InactivityService } from './services/auth/inactivity';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private router = inject(Router);
  private readonly auth       = inject(AuthService);
  private readonly inactivity = inject(InactivityService);

  ngOnInit(): void {
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
      if (this.auth.currentUserValue && !this.auth.isLocked()) {
      this.inactivity.start();
    }
    });
  }
}