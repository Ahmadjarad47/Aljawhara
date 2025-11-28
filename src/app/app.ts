import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './home/navbar/navbar';
import { Footer } from './home/footer/footer';
import { ServiceAuth } from './auth/service-auth';
import { PerformanceService } from './core/services/performance.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('Aljawhara.new.Angular');
  protected readonly url = inject(Router);
  private readonly authService = inject(ServiceAuth);
  private readonly performanceService = inject(PerformanceService);

  ngOnInit(): void {
    // Initialize authentication state on app startup (non-blocking)
    // Use requestIdleCallback for better performance, fallback to setTimeout
    if (typeof window != 'undefined')
      if ('requestIdleCallback' in window) {
        requestIdleCallback(
          () => {
            this.authService.autoAuthUser();
          },
          { timeout: 2000 }
        );
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          this.authService.autoAuthUser();
        }, 0);
      }
  }

  hideNavbar() {
    return true ? this.url.url.includes('admin') || this.url.url.includes('user') : false;
  }
}
