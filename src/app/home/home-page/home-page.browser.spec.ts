import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { HomePage } from './home-page';

describe('Home catalog with real Chrome browser storage', () => {
  let fixture: ComponentFixture<HomePage>;
  let http: HttpTestingController;
  const keys = ['home_featured_products', 'home_categories_with_images', 'home_customer_satisfaction',
    'home_latest_reviews', 'home_hero_slides', 'language', 'cart_items', 'wishlist_items', 'auth_token', 'theme'];
  let saved: (string | null)[];

  beforeEach(() => {
    saved = keys.map(key => localStorage.getItem(key));
    keys.forEach(key => localStorage.removeItem(key));
    TestBed.configureTestingModule({ imports: [HomePage], providers: [
      provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: CartService, useValue: {} },
      { provide: WishlistService, useValue: { getWishlistItemsSignal: () => signal([]) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    keys.forEach((key, index) => {
      if (saved[index] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, saved[index]!);
    });
  });

  async function render() {
    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    // Includes the catalog request even when a valid legacy snapshot exists.
    http.expectOne(request => request.url.endsWith('/Products')).flush({ products: [], totalCount: 0 });
    http.match(() => true).forEach(request => request.flush([]));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.product-card').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('لا توجد منتجات حالياً');
  }

  it('discards an actual 581-product localStorage snapshot on initial load and after recreation', async () => {
    const stale = JSON.stringify({ timestamp: Date.now(), data: Array.from({ length: 581 }, (_, id) => ({
      id, title: `Old ${id}`, newPrice: 99, totalInStock: 99,
    })) });
    localStorage.setItem('home_featured_products', stale);
    for (const key of ['cart_items', 'wishlist_items', 'auth_token', 'theme']) localStorage.setItem(key, 'preserve');
    await render();
    expect(localStorage.getItem('home_featured_products')).toBeNull();
    fixture.destroy();
    await render();
    for (const key of ['cart_items', 'wishlist_items', 'auth_token', 'theme']) expect(localStorage.getItem(key)).toBe('preserve');
  });

  it('renders the same empty state with fresh storage', async () => {
    await render();
    expect(localStorage.getItem('home_featured_products')).toBeNull();
  });
});
