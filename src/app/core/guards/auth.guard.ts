import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ServiceAuth } from '../../auth/service-auth';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(ServiceAuth);
  const router = inject(Router);

  // Check if user is authenticated synchronously first
  if (authService.isAuthenticated) {
    return true;
  }

  // If not authenticated, try to restore auth state and check again
  return authService.isAuthenticated$.pipe(
    map(isAuth => {
      if (isAuth) {
        return true;
      } else {
        // Store the attempted URL for redirecting after login
        router.navigate(['/auth/login'], { 
          queryParams: { returnUrl: state.url } 
        });
        return false;
      }
    }),
    catchError(() => {
      // If there's an error, redirect to login
      router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return of(false);
    })
  );
};







export const adminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(ServiceAuth);
  const router = inject(Router);

  // If not authenticated, redirect to login
  if (!authService.isAuthenticated) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Authenticated: verify admin role via API
  return authService.checkAdmin().pipe(
    map(isAdmin => {
      if (isAdmin) {
        return true;
      }
      router.navigate(['/']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/']);
      return of(false);
    })
  );
};
