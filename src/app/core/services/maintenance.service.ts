import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { map, Observable, of, skip, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServiceAuth } from '../../auth/service-auth';
import { TokenService } from '../../services/token.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly auth = inject(ServiceAuth);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly adminAccess = signal(false);

  readonly blocked = computed(() => environment.maintenance.enabled && !this.adminAccess());

  constructor() {
    this.tokens.getTokenObservable().pipe(skip(1), takeUntilDestroyed()).subscribe(token => {
      this.adminAccess.set(false);
      // Logging out on the home page must also close it, even if navigation to
      // that same URL would otherwise be ignored by the router.
      if (!token && environment.maintenance.enabled) {
        void this.router.navigate(['/maintenance']);
      }
    });
  }

  checkAccess(): Observable<boolean> {
    if (!environment.maintenance.enabled) return of(true);
    if (!this.isBrowser || !this.auth.isAuthenticated) {
      this.adminAccess.set(false);
      return of(false);
    }

    const token = this.tokens.getToken();
    return this.auth.checkAdmin().pipe(
      map(allowed => allowed && this.auth.isAuthenticated && token === this.tokens.getToken()),
      tap(allowed => this.adminAccess.set(allowed))
    );
  }
}
