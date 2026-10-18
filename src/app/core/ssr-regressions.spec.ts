import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ServiceAuth } from '../auth/service-auth';
import { Navbar } from '../home/navbar/navbar';
import { HomePage } from '../home/home-page/home-page';
import { Product } from '../home/product/product';
import { ProductService } from '../home/product/product-service';
import { Cart } from './components/cart/cart';
import { OrderSummaryComponent } from './components/order-summary/order-summary';
import { CartService } from './service/cart-service';
import { CouponService } from './service/coupon-service';
import { WishlistService } from './service/wishlist-service';

describe('Cart, products, and navbar SSR regressions', () => {
  let productService: { getProducts: jasmine.Spy; getCategories: jasmine.Spy };

  beforeEach(() => {
    productService = {
      getProducts: jasmine.createSpy('getProducts').and.returnValue(of([])),
      getCategories: jasmine.createSpy('getCategories').and.returnValue(of([]))
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: ProductService, useValue: productService },
        { provide: CouponService, useValue: {} },
        { provide: CartService, useValue: {
          getCartItemsSignal: () => signal([]),
          getAppliedCouponSignal: () => signal(null),
          getCouponValidationResultSignal: () => signal(null),
          getTotalPrice: () => 0, getCartItemCount: () => 0,
          getDiscountAmount: () => 0, hasAppliedCoupon: () => false,
          getTotalPriceWithDiscount: () => 0
        } },
        { provide: WishlistService, useValue: {
          getWishlistItems: () => [], getWishlistItemsSignal: () => signal([])
        } },
        { provide: ServiceAuth, useValue: {
          isAuthenticated: false, currentUser: null,
          isAuthenticated$: of(false), currentUser$: of(null)
        } }
      ]
    });
  });

  for (const component of [Product, Cart, OrderSummaryComponent]) {
    it(`renders ${component.name} on the server with unavailable browser storage`, async () => {
      const storage = spyOnProperty(window, 'localStorage', 'get').and.throwError('No browser storage');
      const interval = spyOn(window, 'setInterval').and.callThrough();
      const fixture = TestBed.createComponent<any>(component);

      expect(() => fixture.detectChanges()).not.toThrow();
      await fixture.whenStable();
      expect(() => fixture.checkNoChanges()).not.toThrow();
      expect(fixture.componentInstance.currentLanguage()).toBe('ar');
      expect(storage).not.toHaveBeenCalled();
      expect(interval).not.toHaveBeenCalled();
      if (component === Product) {
        expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('المنتجات');
        expect(productService.getProducts).toHaveBeenCalled();
        expect(productService.getCategories).toHaveBeenCalled();
      }
      expect(() => fixture.destroy()).not.toThrow();
    });

    it(`keeps ${component.name} working when browser storage is blocked`, async () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'browser' });
      spyOnProperty(window, 'localStorage', 'get').and.throwError('Storage blocked');
      const fixture = TestBed.createComponent<any>(component);

      expect(() => fixture.detectChanges()).not.toThrow();
      await fixture.whenStable();
      expect(() => fixture.checkNoChanges()).not.toThrow();
      expect(fixture.componentInstance.currentLanguage()).toBe('ar');
      fixture.destroy();
    });

    it(`restores English in ${component.name} and removes its language listener on destroy`, async () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'browser' });
      spyOn(Storage.prototype, 'getItem').and.returnValue('en');
      const remove = spyOn(window, 'removeEventListener').and.callThrough();
      const fixture = TestBed.createComponent<any>(component);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.currentLanguage()).toBe('en');
      expect(() => fixture.checkNoChanges()).not.toThrow();
      fixture.destroy();
      expect(remove).toHaveBeenCalledWith('storage', jasmine.any(Function));
    });
  }

  it('starts navbar categories during SSR initialization and unsubscribes at teardown', async () => {
    const categories = new Subject<[]>();
    productService.getCategories.and.returnValue(categories);
    const timeout = spyOn(window, 'setTimeout').and.callThrough();
    // An empty template isolates the request lifecycle from browser navigation directives.
    TestBed.overrideComponent(Navbar, { set: { template: '' } });
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(productService.getCategories).toHaveBeenCalledTimes(1);
    expect(timeout.calls.allArgs().some(args => args[1] === 100)).toBeFalse();
    expect(categories.observed).toBeTrue();
    fixture.destroy();
    expect(categories.observed).toBeFalse();
    expect(productService.getCategories).toHaveBeenCalledTimes(1);
  });

  it('renders delayed home API responses without a zoneless change detection error', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mobile-category-skeleton')).not.toBeNull();

    http.expectOne(request => request.url.endsWith('categories-with-images')).flush([
      { id: 1, name: 'Paper', nameAr: 'ورقيات' }
    ]);
    http.match(() => true).forEach(request => request.flush([]));
    await fixture.whenStable();

    expect(() => fixture.checkNoChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('.mobile-category-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-category-title').textContent).toContain('ورقيات');
    http.verify();
    fixture.destroy();
  });
});
