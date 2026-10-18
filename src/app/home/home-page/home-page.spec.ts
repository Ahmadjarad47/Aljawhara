import { ChangeDetectorRef, PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ProductService } from '../product/product-service';
import { HomePage } from './home-page';

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

  it('restores language, wishlist visibility, and cached products in the browser', () => {
    storage.set('language', 'en');
    storage.set('showWishlist', 'true');
    storage.set('home_featured_products', JSON.stringify({
      timestamp: Date.now(),
      data: [{ id: 1, title: 'Cup', titleAr: 'كوب', oldPrice: 2, newPrice: 1 }]
    }));
    page = createPage('browser');
    page.ngOnInit();

    expect(page.currentLanguage()).toBe('en');
    expect(page.showWishlist()).toBeTrue();
    expect(storage.has('showWishlist')).toBeFalse();
    expect(page.featuredProducts[0].name).toBe('Cup');
    expect(products).not.toHaveBeenCalled();
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
