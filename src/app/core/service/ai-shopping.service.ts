import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subject, takeUntil, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../../services/token.service';
import { PreparedBrowserCart, ShoppingPreview } from '../Models/ai-shopping';

@Injectable({ providedIn: 'root' })
export class AIShoppingService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tokens = this.browser ? inject(TokenService) : null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly identityChanged = new Subject<void>();
  private readonly base = `${environment.apiUrl.replace(/\/$/, '')}/ai-shopping`;
  private guestToken: string | null = null;
  private scope = '';
  readonly identityEpoch = signal(0);
  readonly preview = signal<ShoppingPreview | null>(null);

  constructor() {
    this.tokens?.getTokenObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncIdentity());
  }

  reset(): void {
    this.identityChanged.next();
    this.guestToken = null;
    this.preview.set(null);
    this.identityEpoch.update(x => x + 1);
  }

  async chat(message: string): Promise<ShoppingPreview> {
    this.syncIdentity();
    const previous = this.preview();
    return this.request('/chat', {
      message,
      conversationId: previous?.conversationId ?? null,
      expectedVersion: previous?.version ?? null,
    });
  }

  recalculate(items: { productId: number; packageQuantity: number }[]): Promise<ShoppingPreview> {
    const preview = this.requirePreview();
    return this.request(`/conversations/${preview.conversationId}/recalculate`, { expectedVersion: preview.version, items });
  }

  load(): Promise<ShoppingPreview> {
    return this.request(`/conversations/${this.requirePreview().conversationId}`, undefined);
  }

  prepareCart(currentCart: { productId: number; quantity: number }[]): Promise<PreparedBrowserCart> {
    const preview = this.requirePreview();
    return this.request(`/conversations/${preview.conversationId}/recommendations/${preview.recommendationId}/prepare-cart`, {
      expectedVersion: preview.version, approved: true, currentCart,
    });
  }

  private requirePreview(): ShoppingPreview {
    this.syncIdentity();
    const preview = this.preview();
    if (!preview) throw new Error('CONVERSATION_NOT_FOUND');
    return preview;
  }

  private syncIdentity(): void {
    const token = this.tokens?.getToken();
    let subject = token ?? 'guest';
    if (token) {
      try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
        subject = `user:${claims.sub ?? claims.nameid ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? token}`;
      } catch { /* Invalid tokens are rejected by the API; this key only clears local UI state. */ }
    }
    if (this.scope !== subject) {
      this.scope = subject;
      this.guestToken = null;
      this.reset();
    }
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    if (!this.browser) throw new Error('BROWSER_REQUIRED');
    this.syncIdentity();
    const epoch = this.identityEpoch();
    const token = this.tokens?.getToken();
    if (!token && !this.guestToken) {
      const session = await firstValueFrom(this.http.post<{ token: string }>(`${this.base}/sessions`, null,
        { transferCache: false, cache: 'no-store' }).pipe(timeout(60000), takeUntil(this.identityChanged)));
      if (epoch !== this.identityEpoch()) throw new Error('SESSION_CHANGED');
      this.guestToken = session.token;
    }
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : { 'X-AI-Shopping-Session': this.guestToken! });
    const options = { headers, transferCache: false, cache: 'no-store' as const };
    const response = await firstValueFrom((body === undefined
      ? this.http.get<T>(`${this.base}${path}`, options)
      : this.http.post<T>(`${this.base}${path}`, body, options))
      .pipe(timeout(60000), takeUntil(this.identityChanged)));
    if (epoch !== this.identityEpoch()) throw new Error('SESSION_CHANGED');
    return response;
  }
}
