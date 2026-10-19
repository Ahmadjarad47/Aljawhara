import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Product } from './product';
import { ProductService } from './product-service';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';

describe('Catalog rendering freshness', () => {
  let fixture: ComponentFixture<Product>;
  let http: HttpTestingController;
  let api: string;
  const oldProducts = Array.from({ length: 581 }, (_, id) => ({
    id, title: `Old product ${id}`, titleAr: `Old product ${id}`, newPrice: 10,
    oldPrice: 12, isInStock: true, totalInStock: 5, averageRating: 0,
  }));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Product],
      providers: [
        provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: CartService, useValue: {} },
        { provide: WishlistService, useValue: { getWishlistItems: () => [] } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ProductService).api;
    fixture = TestBed.createComponent(Product);
    fixture.detectChanges();
    http.match(request => request.url.endsWith('Categories')).forEach(request => request.flush([]));
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function listRequest() {
    return http.expectOne(request => request.url === `${api}Products`);
  }

  it('replaces 581 old products and pagination totals with a successful empty response', async () => {
    listRequest().flush({ products: oldProducts, totalCount: 581 });
    await fixture.whenStable();
    expect(fixture.componentInstance.totalCount()).toBe(581);
    expect(fixture.nativeElement.textContent).toContain('Old product 0');

    fixture.componentInstance.loadProducts({ pageNumber: 1 });
    listRequest().flush({ products: [], totalCount: 0 });
    await fixture.whenStable();
    expect(fixture.componentInstance.totalCount()).toBe(0);
    expect(fixture.componentInstance.getTotalPages()).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Old product 0');
    expect(fixture.nativeElement.textContent).toContain(fixture.componentInstance.t('noProductsFound'));
    expect(fixture.componentInstance.errorMessage()).toBe('');
  });

  it('honors zero totals and empty arrays for either API casing', async () => {
    listRequest().flush({ Products: oldProducts, TotalCount: 581 });
    fixture.componentInstance.loadProducts({});
    listRequest().flush({ products: [], totalCount: 0, Products: oldProducts, TotalCount: 581 });
    await fixture.whenStable();
    expect(fixture.componentInstance.totalCount()).toBe(0);
    fixture.componentInstance.loadProducts({});
    listRequest().flush({ Products: [], TotalCount: 0 });
    await fixture.whenStable();
    expect(fixture.componentInstance.totalCount()).toBe(0);
  });

  it('cancels an older page request when filters change, including a zero price bound', async () => {
    const old = listRequest();
    fixture.componentInstance.loadProducts({ pageNumber: 2, categoryId: 7, minPrice: 0, maxPrice: 0, searchTerm: 'cup' });
    expect(old.cancelled).toBeTrue();
    const latest = listRequest();
    expect(latest.request.params.get('pageNumber')).toBe('2');
    expect(latest.request.params.get('categoryId')).toBe('7');
    expect(latest.request.params.get('searchTerm')).toBe('cup');
    expect(latest.request.params.get('minPrice')).toBe('0');
    expect(latest.request.params.get('maxPrice')).toBe('0');
    latest.flush({ products: [], totalCount: 0 });
    await fixture.whenStable();
    expect(fixture.componentInstance.totalCount()).toBe(0);
  });

  for (const status of [0, 503]) {
    it(`clears obsolete products and shows an error rather than an empty-success message on status ${status}`, async () => {
      listRequest().flush({ products: oldProducts.slice(0, 1), totalCount: 581 });
      fixture.componentInstance.loadProducts({});
      const request = listRequest();
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush('Unavailable', { status, statusText: 'Service Unavailable' });
      await fixture.whenStable();
      expect(fixture.componentInstance.totalCount()).toBe(0);
      expect(fixture.nativeElement.textContent).not.toContain('Old product 0');
      expect(fixture.nativeElement.textContent).toContain(fixture.componentInstance.t('failedToLoadProducts'));
      expect(fixture.nativeElement.textContent).not.toContain(fixture.componentInstance.t('noProductsFound'));
    });
  }
});
