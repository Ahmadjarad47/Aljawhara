import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiceProduct } from './service-product';
import { ProductCreateWithFilesDto, ProductDto, ProductUpdateWithFilesDto } from './product.models';
import { ServiceCategory } from '../category/service-category';
import { Subcategory } from '../sub-category/subcategory';
import { ProductService } from '../../home/product/product-service';
import { catalogFreshnessInterceptor } from '../../core/interceptors/catalog-freshness.interceptor';
import { environment } from '../../../environments/environment';

describe('Catalog mutations and retained admin state', () => {
  let http: HttpTestingController;
  let admin: ServiceProduct;
  let catalog: ProductService;
  const url = `${environment.apiUrl}admin/products`;
  const empty = { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 10 };
  const product = { id: 1, title: 'Cup', titleAr: 'كوب', newPrice: 2, oldPrice: 3,
    description: 'Cup', descriptionAr: 'كوب', subCategoryId: 1, totalInStock: 4,
    isInStock: true, productDetails: [], images: null };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([catalogFreshnessInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    admin = TestBed.inject(ServiceProduct);
    catalog = TestBed.inject(ProductService);
  });
  afterEach(() => http.verify());

  it('reads fresh public products and prices after create, update, and delete operations', () => {
    admin.createProduct(product as unknown as ProductCreateWithFilesDto).subscribe();
    http.expectOne(request => request.method === 'POST' && request.url === url).flush(product);
    let result: any;
    catalog.getProducts().subscribe(value => result = value);
    http.expectOne(`${environment.apiUrl}Products`).flush([product]);
    expect(result[0].newPrice).toBe(2);

    admin.updateProduct(1, { ...product, newPrice: 9 } as unknown as ProductUpdateWithFilesDto).subscribe();
    http.expectOne(request => request.method === 'PUT' && request.url === `${url}/1`).flush({ ...product, newPrice: 9 });
    catalog.getProductById(1).subscribe(value => result = value);
    http.expectOne(`${environment.apiUrl}Products/1`).flush({ ...product, newPrice: 9, totalInStock: 0, isInStock: false });
    expect(result.newPrice).toBe(9);
    expect(result.isInStock).toBeFalse();
    expect(result.totalInStock).toBe(0);

    admin.deleteProduct(1).subscribe();
    http.expectOne(request => request.method === 'DELETE' && request.url === `${url}/1`).flush(null);
    catalog.getProducts().subscribe(value => result = value);
    http.expectOne(`${environment.apiUrl}Products`).flush({ products: [], totalCount: 0 });
    expect(result).toEqual({ products: [], totalCount: 0 });
  });

  it('replaces admin product arrays and totals with empty state and clears previous state on failure', () => {
    let products: ProductDto[] = [];
    let total = 0;
    admin.products$.subscribe(value => products = value);
    admin.pagination$.subscribe(value => total = value.totalCount);
    admin.getProducts().subscribe();
    http.expectOne(url).flush({ ...empty, items: [product], totalCount: 581, totalPages: 59 });
    expect(total).toBe(581);
    admin.getProducts().subscribe();
    http.expectOne(url).flush(empty);
    expect(products).toEqual([]);
    expect(total).toBe(0);
    admin.getProducts().subscribe();
    http.expectOne(url).flush({ ...empty, items: [product], totalCount: 581 });
    const error = jasmine.createSpy('error');
    admin.getProducts().subscribe({ error });
    http.expectOne(url).error(new ProgressEvent('error'));
    expect(error).toHaveBeenCalled();
    expect(products).toEqual([]);
    expect(total).toBe(0);
  });

  it('never replays an older completed admin observable after a database reset', () => {
    const retained = admin.getProducts();
    retained.subscribe();
    http.expectOne(url).flush({ ...empty, items: [product], totalCount: 581 });
    let received: any;
    retained.subscribe(value => received = value);
    expect(received).toBeUndefined();
    http.expectOne(url).flush(empty);
    expect(received.totalCount).toBe(0);
    expect(received.items).toEqual([]);
  });

  it('clears category and subcategory state when the new database returns no records', () => {
    const categories = TestBed.inject(ServiceCategory);
    const subcategories = TestBed.inject(Subcategory);
    let categoryItems: any[] = [];
    let subcategoryItems: any[] = [];
    categories.categories$.subscribe(value => categoryItems = value);
    subcategories.subCategories$.subscribe(value => subcategoryItems = value);
    categories.getCategories().subscribe();
    http.expectOne(`${environment.apiUrl}admin/categories`).flush({ ...empty, items: [{ id: 1 }], totalCount: 1 });
    subcategories.getSubCategories().subscribe();
    http.expectOne(`${environment.apiUrl}admin/categories/subcategories`).flush({ ...empty, items: [{ id: 2 }], totalCount: 1 });
    expect(categoryItems.length).toBe(1);
    expect(subcategoryItems.length).toBe(1);
    categories.getCategories().subscribe();
    http.expectOne(`${environment.apiUrl}admin/categories`).flush(empty);
    subcategories.getSubCategories().subscribe();
    http.expectOne(`${environment.apiUrl}admin/categories/subcategories`).flush(empty);
    expect(categoryItems).toEqual([]);
    expect(subcategoryItems).toEqual([]);
  });
});
