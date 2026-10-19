import { ChangeDetectorRef, PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ProductService } from '../product/product-service';
import { HomePage } from './home-page';
import { environment } from '../../../environments/environment';

describe('HomePage browser state and server rendering', () => {
  let page: HomePage;
  let storage: Map<string, string>;
  let read: jasmine.Spy;
  let remove: jasmine.Spy;
  let products: jasmine.Spy;
  let httpGet: jasmine.Spy;

  function createPage(platform: 'browser' | 'server'): HomePage {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: WishlistService, useValue: { getWishlistItemsSignal: () => signal([]) } },
        { provide: CartService, useValue: {} },
        { provide: HttpClient, useValue: { get: httpGet } }
      ]
    });
    return TestBed.runInInjectionContext(() => new HomePage(
      {} as Router,
      { getProducts: products } as unknown as ProductService
    ));
  }

  beforeEach(() => {
    jasmine.clock().install();
    storage = new Map();
    read = spyOn(Storage.prototype, 'getItem').and.callFake(key => storage.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { storage.set(key, value); });
    remove = spyOn(Storage.prototype, 'removeItem').and.callFake(key => { storage.delete(key); });
    products = jasmine.createSpy('getProducts').and.returnValue(of([]));
    httpGet = jasmine.createSpy('get').and.returnValue(of([]));
  });

  afterEach(() => {
    page?.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('loads server data without touching browser storage, listeners, or timers', () => {
    const storageAccess = spyOnProperty(window, 'localStorage', 'get').and.throwError('No browser storage');
    const listen = spyOn(window, 'addEventListener');
    page = createPage('server');

    expect(() => page.ngOnInit()).not.toThrow();
    jasmine.clock().tick(6000);
    expect(storageAccess).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
    expect(page.countdown.seconds).toBe(30);
    expect(page.currentSlide).toBe(0);
    expect(page.currentLanguage()).toBe('ar');
    expect(products).toHaveBeenCalled();
    expect(httpGet).toHaveBeenCalledTimes(4);
    expect(page.isLoadingProducts).toBeFalse();
  });

  it('preserves language and wishlist visibility but replaces 581 cached products with the empty API result', () => {
    storage.set('language', 'en');
    storage.set('showWishlist', 'true');
    storage.set('home_featured_products', JSON.stringify({
      timestamp: Date.now(),
      data: Array.from({ length: 581 }, (_, id) => ({ id, title: 'Cup', titleAr: 'كوب', oldPrice: 2, newPrice: 1 }))
    }));
    page = createPage('browser');
    page.ngOnInit();

    expect(page.currentLanguage()).toBe('en');
    expect(page.showWishlist()).toBeTrue();
    expect(storage.has('showWishlist')).toBeFalse();
    expect(page.featuredProducts).toEqual([]);
    expect(products).toHaveBeenCalledTimes(1);
    expect(storage.has('home_featured_products')).toBeFalse();
  });

  it('clears rendered cards after a successful empty paginated response', () => {
    page = createPage('browser');
    products.and.returnValue(of([{ id: 1, title: 'Cup', oldPrice: 2, newPrice: 1 }]));
    page.loadFeaturedProducts();
    expect(page.featuredProducts.length).toBe(1);

    products.and.returnValue(of({ products: [], totalCount: 0 }));
    page.loadFeaturedProducts();
    expect(page.featuredProducts).toEqual([]);
  });

  it('ignores stale snapshots again on reload and preserves all customer storage', () => {
    const protectedKeys = ['auth_token', 'refresh_token', 'user_data', 'cart_items', 'wishlist_items', 'language', 'theme', 'checkout_data'];
    protectedKeys.forEach(key => storage.set(key, key === 'language' ? 'en' : 'keep-me'));
    for (const key of ['home_featured_products', 'home_categories_with_images', 'home_customer_satisfaction', 'home_latest_reviews']) {
      storage.set(key, JSON.stringify({ timestamp: Date.now() + 86400000, data: [{ id: 1 }] }));
    }
    page = createPage('browser');
    page.ngOnInit();
    expect(page.featuredProducts).toEqual([]);
    expect(page.categoriesWithImages).toEqual([]);
    page.ngOnDestroy();
    page = TestBed.runInInjectionContext(() => new HomePage({} as Router, { getProducts: products } as unknown as ProductService));
    page.ngOnInit();
    expect(products).toHaveBeenCalledTimes(2);
    expect(page.featuredProducts).toEqual([]);
    protectedKeys.forEach(key => expect(storage.get(key)).toBe(key === 'language' ? 'en' : 'keep-me'));
  });

  it('loads an empty catalog in a fresh private-session equivalent without writing catalog storage', () => {
    page = createPage('browser');
    page.ngOnInit();
    expect(products).toHaveBeenCalledTimes(1);
    expect(page.featuredProducts).toEqual([]);
    expect(page.productsLoadFailed).toBeFalse();
    expect(storage.has('home_featured_products')).toBeFalse();
    expect(storage.has('home_categories_with_images')).toBeFalse();
  });

  it('reports offline failures separately and never restores old cards', () => {
    page = createPage('browser');
    products.and.returnValue(of([{ id: 1, title: 'Cup', newPrice: 1 }]));
    page.loadFeaturedProducts();
    expect(page.featuredProducts.length).toBe(1);
    products.and.returnValue(throwError(() => new Error('offline')));
    page.loadFeaturedProducts();
    expect(page.featuredProducts).toEqual([]);
    expect(page.productsLoadFailed).toBeTrue();
    expect(page.isLoadingProducts).toBeFalse();
    products.and.returnValue(of([]));
    page.loadFeaturedProducts();
    expect(page.productsLoadFailed).toBeFalse();
  });

  it('cancels earlier featured requests so an older response cannot overwrite an empty catalog', () => {
    page = createPage('browser');
    const old = new Subject<any>();
    products.and.returnValue(old);
    page.loadFeaturedProducts();
    products.and.returnValue(of([]));
    page.loadFeaturedProducts();
    expect(old.observed).toBeFalse();
    old.next([{ id: 1, title: 'Stale', newPrice: 1 }]);
    expect(page.featuredProducts).toEqual([]);
  });

  it('invalidates the remaining hero cache when the API environment or cache schema changes', () => {
    storage.set('home_hero_slides', JSON.stringify({ timestamp: Date.now(), version: 2,
      apiUrl: 'https://old-api.test/api/', data: { heroSlidesAr: [{ title: 'Old database' }], heroSlidesEn: [] } }));
    page = createPage('browser');
    page.ngOnInit();
    expect(httpGet.calls.allArgs().some(args => args[0] === `${environment.apiUrl}Carousels`)).toBeTrue();
    expect(page.heroSlidesAr).toEqual([]);
  });

  it('updates language across tabs and in the same tab, then stops watching on destroy', () => {
    page = createPage('browser');
    page.ngOnInit();
    window.dispatchEvent(new StorageEvent('storage', { key: 'language', newValue: 'en' }));
    expect(page.currentLanguage()).toBe('en');

    storage.set('language', 'ar');
    jasmine.clock().tick(500);
    expect(page.currentLanguage()).toBe('ar');

    page.ngOnDestroy();
    read.calls.reset();
    storage.set('language', 'en');
    jasmine.clock().tick(6000);
    window.dispatchEvent(new StorageEvent('storage', { key: 'language', newValue: 'en' }));
    expect(page.currentLanguage()).toBe('ar');
    expect(read).not.toHaveBeenCalled();
    expect(page.countdown.seconds).toBe(30);
  });

  it('continues loading when browser storage is unavailable', () => {
    spyOnProperty(window, 'localStorage', 'get').and.throwError('Storage blocked');
    page = createPage('browser');

    expect(() => page.ngOnInit()).not.toThrow();
    expect(() => jasmine.clock().tick(500)).not.toThrow();
    expect(page.currentLanguage()).toBe('ar');
    expect(products).toHaveBeenCalled();
    expect(page.isLoadingProducts).toBeFalse();
  });

  it('falls back to the API when corrupt cache cleanup also fails', () => {
    storage.set('home_featured_products', '{invalid json');
    remove.and.throwError('Storage write blocked');
    page = createPage('browser');

    expect(() => page.ngOnInit()).not.toThrow();
    expect(products).toHaveBeenCalled();
    expect(page.isLoadingProducts).toBeFalse();
  });
});
