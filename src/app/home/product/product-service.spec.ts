import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { map } from 'rxjs';
import { ProductService } from './product-service';
import { CategoryDto, SubCategoryDto } from './product.models';

describe('ProductService category requests', () => {
  let service: ProductService;
  let http: HttpTestingController;
  const metadata = {
    createdAt: '2026-10-18T00:00:00Z', updatedAt: null,
    createdBy: 'test', updatedBy: null, isActive: true
  };
  const categories: CategoryDto[] = [{
    ...metadata, id: 1, name: 'Paper', nameAr: 'ورقيات',
    description: '', descriptionAr: '', productCount: 2,
    subCategories: [{
      ...metadata, id: 2, name: 'Cups', nameAr: 'أكواب',
      description: '', descriptionAr: '', productCount: 2,
      categoryId: 1, categoryName: 'Paper', categoryNameAr: 'ورقيات'
    }]
  }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends one request for the navbar and all four desktop/mobile filter subscriptions', () => {
    const categories$ = service.getCategories();
    const subCategories$ = categories$.pipe(map(categories => categories.flatMap(c => c.subCategories)));
    const received: CategoryDto[][] = [];
    const receivedSubCategories: SubCategoryDto[][] = [];

    service.getCategories(true).subscribe(value => received.push(value));
    categories$.subscribe(value => received.push(value));
    categories$.subscribe(value => received.push(value));
    subCategories$.subscribe(value => receivedSubCategories.push(value));
    subCategories$.subscribe(value => receivedSubCategories.push(value));

    const request = http.expectOne(`${service.api}Categories?includeSubCategories=true`);
    request.flush(categories);

    expect(received).toEqual([categories, categories, categories]);
    expect(receivedSubCategories).toEqual([categories[0].subCategories, categories[0].subCategories]);
  });

  it('reuses the response for later consumers and language changes within five minutes', () => {
    service.getCategories().subscribe();
    http.expectOne(`${service.api}Categories?includeSubCategories=true`).flush(categories);

    let received: CategoryDto[] | undefined;
    service.getCategories().subscribe(value => received = value);

    expect(received).toEqual(categories);
    http.expectNone(request => request.url.endsWith('Categories'));
  });

  it('keeps requests with and without subcategories separate', () => {
    let withSubCategories: CategoryDto[] | undefined;
    let withoutSubCategories: CategoryDto[] | undefined;
    service.getCategories(true).subscribe(value => withSubCategories = value);
    service.getCategories(false).subscribe(value => withoutSubCategories = value);

    http.expectOne(`${service.api}Categories?includeSubCategories=true`).flush(categories);
    http.expectOne(`${service.api}Categories?includeSubCategories=false`).flush([]);
    expect(withSubCategories).toEqual(categories);
    expect(withoutSubCategories).toEqual([]);
  });

  it('fetches fresh categories for consumers after the cache expires', () => {
    const now = spyOn(Date, 'now').and.returnValue(1000);
    service.getCategories().subscribe();
    http.expectOne(`${service.api}Categories?includeSubCategories=true`).flush([]);

    now.and.returnValue(1000 + 5 * 60 * 1000);
    let received: CategoryDto[] | undefined;
    service.getCategories().subscribe(value => received = value);
    expect(received).toBeUndefined();
    http.expectOne(`${service.api}Categories?includeSubCategories=true`).flush([]);
    expect(received).toEqual([]);
  });

  it('allows a failed request to be retried instead of caching its error', () => {
    const onError = jasmine.createSpy('onError');
    service.getCategories().subscribe({ error: onError });
    http.expectOne(`${service.api}Categories?includeSubCategories=true`)
      .flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });
    expect(onError).toHaveBeenCalledTimes(1);

    let received: CategoryDto[] | undefined;
    service.getCategories().subscribe(value => received = value);
    http.expectOne(`${service.api}Categories?includeSubCategories=true`).flush([]);
    expect(received).toEqual([]);
  });

  it('cancels shared categories when the SSR injector is destroyed', () => {
    const categories$ = service.getCategories();
    const first = categories$.subscribe();
    const second = categories$.subscribe();
    const request = http.expectOne(`${service.api}Categories?includeSubCategories=true`);

    TestBed.resetTestingModule();

    expect(request.cancelled).toBeTrue();
    expect(first.closed).toBeTrue();
    expect(second.closed).toBeTrue();
    expect(() => categories$.subscribe()).not.toThrow();
  });
});
