import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ServiceAuth } from '../../auth/service-auth';
import { TokenService } from '../../services/token.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { ShoppingPreview } from '../Models/ai-shopping';
import { AIShoppingService } from './ai-shopping.service';

export const previewFixture: ShoppingPreview = {
  conversationId: '11111111-1111-4111-8111-111111111111', recommendationId: '22222222-2222-4222-8222-222222222222',
  version: 1, message: 'جهزتلك قائمة مناسبة', status: 'ready', currency: 'KWD', estimatedTotal: 0.500,
  unavailableNeeds: [], requiresConfirmation: true, expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
  recommendations: [{ productId: 7, variantId: null, productName: 'أكواب ورقية', imageUrl: '/cups.png', unitPrice: .500,
    currency: 'KWD', unitsPerPackage: 10, recommendedPackageQuantity: 1, lineTotal: .500, reason: 'لخمسة أشخاص', needKeys: ['cups'] }],
};

describe('AI Shopping HTTP integration', () => {
  let api: AIShoppingService;
  let http: HttpTestingController;
  let token: string | null;
  let changes: BehaviorSubject<string | null>;
  beforeEach(() => {
    token = null; changes = new BehaviorSubject<string | null>(null);
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]),
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: TokenService, useValue: { getToken: () => token, getTokenObservable: () => changes, isTokenExpired: () => false } },
      { provide: ServiceAuth, useValue: { logoutLocal: jasmine.createSpy(), refreshToken: jasmine.createSpy() } },
    ] });
    api = TestBed.inject(AIShoppingService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));

  async function startGuest() {
    const response = api.chat('نزهة لخمسة');
    http.expectOne(r => r.url.endsWith('/ai-shopping/sessions')).flush({ token: 'signed-guest-capability' });
    await Promise.resolve();
    const request = http.expectOne(r => r.url.endsWith('/ai-shopping/chat'));
    expect(request.request.headers.get('X-AI-Shopping-Session')).toBe('signed-guest-capability');
    expect(request.request.headers.get('Cache-Control')).toBe('no-store');
    expect(request.request.body.conversationId).toBeNull();
    request.flush(previewFixture);
    api.preview.set(await response);
  }

  it('sends guest capabilities and conversation versions to the real contract', async () => {
    await startGuest();
    const result = api.chat('صرنا ثمانية');
    const request = http.expectOne(r => r.url.endsWith('/ai-shopping/chat'));
    expect(request.request.body.conversationId).toBe(previewFixture.conversationId);
    expect(request.request.body.expectedVersion).toBe(1);
    request.flush({ ...previewFixture, version: 2 }); await result;
  });

  it('prepares only approved quantities without sending browser prices', async () => {
    await startGuest();
    const result = api.prepareCart([{ productId: 7, quantity: 2 }]);
    const request = http.expectOne(r => r.url.endsWith('/prepare-cart'));
    expect(request.request.body).toEqual({ expectedVersion: 1, approved: true, currentCart: [{ productId: 7, quantity: 2 }] });
    request.flush({ status: 'prepared' }); await result;
  });

  it('does not retry a paid chat after a provider failure', async () => {
    token = 'user-token'; changes.next(token);
    const result = api.chat('نزهة');
    http.expectOne(r => r.url.endsWith('/ai-shopping/chat')).flush({ code: 'AI_PROVIDER_UNAVAILABLE' }, { status: 503, statusText: 'Unavailable' });
    await expectAsync(result).toBeRejected();
    http.expectNone(r => r.url.endsWith('/ai-shopping/chat'));
  });

  it('does not redirect an expired guest capability to account login and can create a new session', async () => {
    await startGuest(); const navigate = spyOn(TestBed.inject(Router), 'navigate');
    const result = api.chat('طلب جديد');
    http.expectOne(r => r.url.endsWith('/ai-shopping/chat')).flush({ code: 'INVALID_SHOPPING_SESSION' }, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(result).toBeRejected(); expect(navigate).not.toHaveBeenCalled();
    api.reset();
    const next = api.chat('نزهة');
    http.expectOne(r => r.url.endsWith('/ai-shopping/sessions')).flush({ token: 'new-capability' });
    await Promise.resolve(); http.expectOne(r => r.url.endsWith('/ai-shopping/chat')).flush(previewFixture);
    await next;
  });

  it('clears guest conversations and cancels requests when the account changes', async () => {
    await startGuest();
    const result = api.chat('متابعة');
    const rejected = expectAsync(result).toBeRejected();
    const pending = http.expectOne(r => r.url.endsWith('/ai-shopping/chat'));
    token = 'new-user-token'; changes.next(token);
    expect(pending.cancelled).toBeTrue(); expect(api.preview()).toBeNull(); await rejected;
  });
});
