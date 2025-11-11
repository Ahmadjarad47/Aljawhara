import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { TokenService } from '../../services/token.service';
import { ServiceAuth } from '../../auth/service-auth';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(ServiceAuth);
  const router = inject(Router);

  // Skip token attachment for auth endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Add token to request
  const token = tokenService.getToken();
  if (token && !tokenService.isTokenExpired()) {
    req = addTokenToRequest(req, token);
  }

  return next(req).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(req, next, tokenService, authService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(request: any, token: string): any {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/login', '/register', '/refresh-token', '/forgot-password', '/reset-password'];
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

function handle401Error(request: any, next: any, tokenService: TokenService, authService: ServiceAuth, router: Router): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = tokenService.getRefreshToken();
    
    if (refreshToken) {
      return authService.refreshToken({ refreshToken }).pipe(
        switchMap((response: any) => {
          // Ensure backend response indicates success and contains a token
          if (!response?.success || !response?.data?.token) {
            isRefreshing = false;
            authService.logoutLocal();
            router.navigate(['/auth/login']);
            return throwError(() => new Error('Invalid refresh token response'));
          }
          isRefreshing = false;
          refreshTokenSubject.next(response.data?.token);
          
          // Retry the original request with new token
          return next(addTokenToRequest(request, response.data?.token));
        }),
        catchError((error) => {
          isRefreshing = false;
          authService.logoutLocal();
          router.navigate(['/auth/login']);
          return throwError(() => error);
        })
      );
    } else {
      isRefreshing = false;
      authService.logoutLocal();
      router.navigate(['/auth/login']);
      return throwError(() => new Error('No refresh token available'));
    }
  }

  // If already refreshing, wait for the new token
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(addTokenToRequest(request, token)))
  );
}
