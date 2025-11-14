import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { catchError, filter, take, switchMap, retryWhen, concatMap } from 'rxjs/operators';
import { TokenService } from '../../services/token.service';
import { ServiceAuth } from '../../auth/service-auth';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

// Maximum retry attempts for network errors
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000; // Initial delay in milliseconds

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

  // Add security headers to all requests
  req = addSecurityHeaders(req);

  return next(req).pipe(
    // Retry logic for network errors (5xx, timeout, network failures)
    // Note: 401 errors are handled separately and should not be retried
    retryWhen(errors =>
      errors.pipe(
        concatMap((error, index) => {
          // Don't retry on 401, 403, 404, or 429 errors
          if (error instanceof HttpErrorResponse) {
            if ([401, 403, 404, 429].includes(error.status)) {
              return throwError(() => error);
            }
          }
          
          const retryable = isRetryableError(error);
          if (retryable && index < MAX_RETRY_ATTEMPTS) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = RETRY_DELAY_MS * Math.pow(2, index);
            return timer(delay);
          }
          return throwError(() => error);
        })
      )
    ),
    catchError(error => {
      if (error instanceof HttpErrorResponse) {
        // Handle 401 Unauthorized - token refresh
        if (error.status === 401) {
          return handle401Error(req, next, tokenService, authService, router);
        }
        
        // Handle 403 Forbidden - insufficient permissions
        if (error.status === 403) {
          // Optionally redirect or show error message
          console.error('Access forbidden: Insufficient permissions');
        }
        
        // Handle 429 Too Many Requests - rate limiting
        if (error.status === 429) {
          console.error('Rate limit exceeded. Please try again later.');
        }
        
        // Handle network errors
        if (!error.status) {
          console.error('Network error: Unable to reach server');
        }
      }
      
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function addSecurityHeaders(request: HttpRequest<any>): HttpRequest<any> {
  const headers: { [key: string]: string } = {
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Add cache headers for GET requests (mobile performance optimization)
  if (request.method === 'GET' && !request.url.includes('/auth/')) {
    // Cache static resources longer
    if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot)$/i)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      // Cache API responses for a short time (mobile data savings)
      headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600';
    }
  }

  return request.clone({
    setHeaders: headers
  });
}

function isRetryableError(error: any): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return true; // Network errors are retryable
  }
  
  // Retry on server errors (5xx) and specific client errors
  return error.status === 0 || // Network error
         error.status === 500 || // Internal server error
         error.status === 502 || // Bad gateway
         error.status === 503 || // Service unavailable
         error.status === 504;   // Gateway timeout
}

function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/login', '/register', '/refresh-token', '/forgot-password', '/reset-password'];
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

function handle401Error(request: HttpRequest<any>, next: any, tokenService: TokenService, authService: ServiceAuth, router: Router): Observable<any> {
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
