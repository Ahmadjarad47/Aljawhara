import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ServiceAuth } from '../../auth/service-auth';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ProductService } from '../product/product-service';
import { ProductDto } from '../product/product.models';
import { ProductDetail } from './product-detail';

describe('Product detail rendering and choices', () => {
  const product = {
    id: 1, title: 'Bottle', titleAr: 'بطل بلاستك',
    description: 'Bottle description', descriptionAr: 'وصف المنتج',
    categoryName: 'Bottles', categoryNameAr: 'بطل', subCategoryId: 0,
    images: [], productDetails: [], ratings: [], averageRating: 0, totalReviews: 0,
    newPrice: 1.25, oldPrice: 1.5, isInStock: true, totalInStock: 36,
    variants: [{ id: 2, name: 'Package', nameAr: 'سعر الكرتون', values: [
      { id: 3, value: '20', valueAr: '20', price: 13 }
    ] }]
  } as unknown as ProductDto;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideZonelessChangeDetection(), provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ActivatedRoute, useValue: { params: of({ id: 1 }) } },
        { provide: ProductService, useValue: { getProductById: () => of(product) } },
        { provide: CartService, useValue: { getItemByProductId: () => undefined, isProductInCart: () => false } },
        { provide: WishlistService, useValue: { isProductInWishlist: () => false } },
        { provide: ServiceAuth, useValue: { isAuthenticated: false } }
      ]
    });
  });

  it('renders on the server without browser storage and shows empty ratings honestly', async () => {
    const storage = spyOnProperty(window, 'localStorage', 'get').and.throwError('No browser storage');
    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(() => fixture.checkNoChanges()).not.toThrow();
    expect(storage).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('بطل بلاستك');
    expect(fixture.nativeElement.querySelectorAll('.detail-stars .is-filled').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.gallery-placeholder')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.specification-description').textContent).toContain('وصف المنتج');
    fixture.destroy();
  });

  it('updates the selected package price and hides an invalid base-price discount', async () => {
    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.variant-options button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.current-price').textContent).toContain('13.000');
    expect(fixture.nativeElement.querySelector('.variant-options button').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('.old-price')).toBeNull();
    expect(fixture.nativeElement.querySelector('.detail-discount')).toBeNull();
    fixture.destroy();
  });

  it('keeps exactly one information tab open when switching tabs', async () => {
    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    tabs[1].click();
    fixture.detectChanges();
    tabs[2].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[role="tab"][aria-selected="true"]').length).toBe(1);
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(fixture.componentInstance.showReviews).toBeFalse();
    expect(fixture.componentInstance.showSpecifications).toBeFalse();
    expect(fixture.componentInstance.showShippingInfo).toBeTrue();
    fixture.destroy();
  });
});
