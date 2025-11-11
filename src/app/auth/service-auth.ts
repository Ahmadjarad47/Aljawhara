import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RegisterDto,
  LoginDto,
  VerifyAccountDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LoginResponseDto,
  ApiResponseDto,
  RefreshTokenDto,
  UserResponseDto
} from './auth.models';
import { TokenService } from '../services/token.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceAuth {
  private apiUrl = `${environment.apiUrl}Auth/`;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<UserResponseDto | null>(null);

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {
    // Initialize authentication state
    this.isAuthenticatedSubject.next(this.tokenService.isAuthenticated());
    this.currentUserSubject.next(this.tokenService.getUser());
  }

  // Observable streams for authentication state
  get isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentUser$(): Observable<UserResponseDto | null> {
    return this.currentUserSubject.asObservable();
  }

  get isAuthenticated(): boolean {
    return this.tokenService.isAuthenticated();
  }

  get currentUser(): UserResponseDto | null {
    return this.tokenService.getUser();
  }

  register(registerDto: RegisterDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}register`, registerDto);
  }

  login(loginDto: LoginDto): Observable<ApiResponseDto<LoginResponseDto>> {
    return this.http.post<ApiResponseDto<LoginResponseDto>>(`${this.apiUrl}login`, loginDto)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Store token and user data
            this.tokenService.setToken({
              token: response.data.token,
              refreshToken: response.data.refreshToken,
              expiresAt: response.data.expiresAt
            });
            this.tokenService.setUser(response.data.user);
            
            // Update authentication state
            this.isAuthenticatedSubject.next(true);
            this.currentUserSubject.next(response.data.user);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  verifyAccount(verifyDto: VerifyAccountDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}verify`, verifyDto);
  }

  resendVerification(resendDto: ResendVerificationDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}resend-verification`, resendDto);
  }

  forgotPassword(forgotPasswordDto: ForgotPasswordDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}forgot-password`, forgotPasswordDto);
  }

  resetPassword(resetPasswordDto: ResetPasswordDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}reset-password`, resetPasswordDto);
  }

  logout(): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(`${this.apiUrl}logout`, {})
      .pipe(
        tap(() => {
          // Clear local storage and update state regardless of API response
          this.tokenService.clearAuthData();
          this.isAuthenticatedSubject.next(false);
          this.currentUserSubject.next(null);
        }),
        catchError(error => {
          // Even if logout API fails, clear local data
          this.tokenService.clearAuthData();
          this.isAuthenticatedSubject.next(false);
          this.currentUserSubject.next(null);
          console.error('Logout error:', error);
          return throwError(() => error);
        })
      );
  }

  refreshToken(refreshTokenDto: RefreshTokenDto): Observable<ApiResponseDto<LoginResponseDto>> {
    return this.http.post<ApiResponseDto<LoginResponseDto>>(`${this.apiUrl}refresh-token`, refreshTokenDto)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Update token data
            this.tokenService.updateToken({
              token: response.data.token,
              refreshToken: response.data.refreshToken,
              expiresAt: response.data.expiresAt
            });
            
            // Update user data if provided
            if (response.data.user) {
              this.tokenService.setUser(response.data.user);
              this.currentUserSubject.next(response.data.user);
            }
          }
        }),
        catchError(error => {
          console.error('Token refresh error:', error);
          // If refresh fails, logout user
          this.tokenService.clearAuthData();
          this.isAuthenticatedSubject.next(false);
          this.currentUserSubject.next(null);
          return throwError(() => error);
        })
      );
  }

  // Check authentication status
  checkAuthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}isAuth`);
  }

  // Check if current user is admin via API
  checkAdmin(): Observable<boolean> {
    return this.http.get<{ isAdmin: boolean }>(`${this.apiUrl}isAdmin`).pipe(
      map(res => !!res?.isAdmin),
      catchError(() => of(false))
    );
  }

  // Manual logout (clear local data without API call)
  logoutLocal(): void {
    this.tokenService.clearAuthData();
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  // Auto-authenticate user on app startup
  autoAuthUser(): void {
    const isAuth = this.tokenService.isAuthenticated();
    const user = this.tokenService.getUser();
    
    this.isAuthenticatedSubject.next(isAuth);
    this.currentUserSubject.next(user);
  }
}