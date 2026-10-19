import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { catalogFreshnessInterceptor, isCatalogUrl } from './catalog-freshness.interceptor';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../../services/token.service';
import { ServiceAuth } from '../../auth/service-auth';
import { environment } from '../../../environments/environment';

describe('Catalog network freshness policy', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(), provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, catalogFreshnessInterceptor])),
      provideHttpClientTesting(),
      { provide: TokenService, useValue: { getToken: () => 'saved-token', isTokenExpired: () => false } },
      { provide: ServiceAuth, useValue: {} },
    ] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const path of ['Products', 'Products/7', 'Products/subcategory/1/random', 'Categories',
    'admin/products', 'admin/products/in-stock', 'admin/products/7/stock',
    'admin/categories', 'admin/categories/subcategories', 'Inventory',
    'Carousels/categories-with-images', 'Carousels/customer-satisfaction', 'Carousels/latest-third-reviews']) {
    it(`bypasses existing HTTP/SSR caches for ${path} while preserving authentication`, () => {
      const url = environment.apiUrl + path;
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.cache).toBe('no-store');
      expect(request.request.transferCache).toBeFalse();
      expect(request.request.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0');
      expect(request.request.headers.get('Authorization')).toBe('Bearer saved-token');
      request.flush([]);
    });
  }

  it('does not apply the catalog policy to checkout, payments, orders, or static assets', () => {
    for (const path of ['Orders', 'Orders/7/payment-status', 'auth/login', 'Carousels', 'logo.png']) {
      const url = environment.apiUrl + path;
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.cache).toBeUndefined();
      expect(request.request.transferCache).toBeUndefined();
      request.flush({});
    }
  });

  it('scopes the matcher to the configured API and rejects lookalike origins and paths', () => {
    expect(isCatalogUrl('https://new-api.test/api/Products', 'https://new-api.test/api/')).toBeTrue();
    expect(isCatalogUrl('https://old-api.test/api/Products', 'https://new-api.test/api/')).toBeFalse();
    expect(isCatalogUrl('https://new-api.test/api/ProductsExtra', 'https://new-api.test/api/')).toBeFalse();
    expect(isCatalogUrl('https://new-api.test.evil/api/Products', 'https://new-api.test/api/')).toBeFalse();
  });
});
