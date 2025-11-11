import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly EXPIRES_AT_KEY = 'expires_at';
  private readonly USER_KEY = 'user_data';

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<any>(null);

  constructor() {
    // Initialize with safe values for SSR
    this.tokenSubject.next(this.getToken());
    this.userSubject.next(this.getUser());
  }

  // Token management
  setToken(tokenData: TokenData): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.TOKEN_KEY, tokenData.token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken);
      localStorage.setItem(this.EXPIRES_AT_KEY, tokenData.expiresAt);
    }
    this.tokenSubject.next(tokenData.token);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  getExpiresAt(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.EXPIRES_AT_KEY);
    }
    return null;
  }

  isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    
    // Add 5 minute buffer before actual expiration
    return currentTime >= (expirationTime - 5 * 60 * 1000);
  }

  // User data management
  setUser(user: any): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
    this.userSubject.next(user);
  }

  getUser(): any {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  // Observable streams
  getTokenObservable(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  getUserObservable(): Observable<any> {
    return this.userSubject.asObservable();
  }

  // Authentication state
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  // Clear all auth data
  clearAuthData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.EXPIRES_AT_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  // Update token (for refresh)
  updateToken(tokenData: Partial<TokenData>): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (tokenData.token) {
        localStorage.setItem(this.TOKEN_KEY, tokenData.token);
        this.tokenSubject.next(tokenData.token);
      }
      if (tokenData.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken);
      }
      if (tokenData.expiresAt) {
        localStorage.setItem(this.EXPIRES_AT_KEY, tokenData.expiresAt);
      }
    }
  }
}
