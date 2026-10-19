import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Product } from './product';
import { ServiceCategory } from '../category/service-category';
import { Subcategory } from '../sub-category/subcategory';
import { ToastService } from '../../services/toast.service';
import { ImageCompressionService } from '../../services/image-compression.service';
import { ProductDto } from './product.models';
import { environment } from '../../../environments/environment.development';

describe('Product modal option submission', () => {
  let fixture: ComponentFixture<Product>;
  let http: HttpTestingController;
  let previousDirection: string;
  let previousLanguage: string;
  const url = `${environment.apiUrl}admin/products`;
  const page = { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 };

  beforeEach(async () => {
    previousDirection = document.documentElement.dir;
    previousLanguage = document.documentElement.lang;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    TestBed.configureTestingModule({ imports: [Product], providers: [provideZonelessChangeDetection(),
      provideHttpClient(), provideHttpClientTesting(),
      { provide: ServiceCategory, useValue: { getAllCategories: () => of([]) } },
      { provide: Subcategory, useValue: { getAllSubCategories: () => of([{ id: 1, name: 'Cups', nameAr: 'أكواب' }]) } },
      { provide: ImageCompressionService, useValue: {} },
      { provide: ToastService, useValue: { toasts$: signal([]), loading: () => 'test', error: () => {},
        updateToSuccess: () => {}, updateToError: () => {}, removeToast: () => {} } },
    ] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Product);
    fixture.componentInstance.newProduct = { title: 'Pack', titleAr: 'عبوة', description: 'Test', descriptionAr: 'اختبار',
      oldPrice: 0, newPrice: 1.5, isInStock: true, totalInStock: 25, subCategoryId: 1, productDetails: [], images: null };
    fixture.componentInstance.showAddModal.set(true);
    fixture.detectChanges();
    http.match(request => request.method === 'GET').forEach(request => request.flush(page));
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    document.documentElement.dir = previousDirection;
    document.documentElement.lang = previousLanguage;
  });

  async function enter(id: string, value: string) {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function nextStep() {
    fixture.nativeElement.querySelector('.wizard-next').click();
    await fixture.whenStable();
  }

  it('shows one short step at a time and preserves entries when going back', async () => {
    expect(fixture.nativeElement.querySelector('#create-product-name')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-product-options-editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.save-product')).toBeNull();
    await enter('create-product-name', 'أكواب ورقية');
    await nextStep();
    expect(fixture.nativeElement.querySelector('#create-product-name')).toBeNull();
    expect(fixture.nativeElement.querySelector('#create-product-stock')).not.toBeNull();
    fixture.nativeElement.querySelector('.wizard-back').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#create-product-name').value).toBe('أكواب ورقية');
    http.expectNone(request => request.method === 'POST');
  });

  it('explains missing information before advancing to pricing', async () => {
    fixture.componentInstance.newProduct.title = '';
    fixture.componentInstance.newProduct.titleAr = '';
    await nextStep();
    expect(fixture.componentInstance.productEditorStep()).toBe(0);
    expect(fixture.nativeElement.querySelector('.wizard-error').textContent).toContain('اسم المنتج');
  });

  it('creates a product with all directly entered choices without a separate add-variant step', async () => {
    fixture.componentInstance.newProduct.title = '';
    fixture.componentInstance.newProduct.description = '';
    await nextStep();
    fixture.nativeElement.querySelector('[value="options"]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#create-product-options-base-price')).toBeNull();
    await enter('create-product-options-choice-0-0', 'عبوة 10 قطع');
    await enter('create-product-options-price-0-0', '1.5');
    fixture.nativeElement.querySelector('.add-choice').click();
    await fixture.whenStable();
    await enter('create-product-options-choice-0-1', 'عبوة 20 قطعة');
    await enter('create-product-options-price-0-1', '2.5');
    await nextStep();
    expect(fixture.nativeElement.querySelector('.product-review').textContent).toContain('عبوة 20 قطعة');
    expect(fixture.nativeElement.querySelector('.product-review').textContent).toContain('2.500');
    fixture.nativeElement.querySelector('.save-product').click();
    await fixture.whenStable();
    const request = http.expectOne(request => request.url === url && request.method === 'POST');
    const body = request.request.body as FormData;
    expect(body.get('totalInStock')).toBe('25');
    expect(body.get('title')).toBe('عبوة');
    expect(body.get('description')).toBe('اختبار');
    expect(body.get('variants[0].name')).toBe('Options');
    expect(body.get('variants[0].values[1].value')).toBe('عبوة 20 قطعة');
    expect(body.get('variants[0].values[1].price')).toBe('2.5');
    request.flush({ id: 1 });
    http.match(request => request.method === 'GET').forEach(request => request.flush(page));
    await fixture.whenStable();
    expect(fixture.componentInstance.showAddModal()).toBeFalse();
  });

  it('keeps the modal open and explains incomplete options before making a request', async () => {
    await nextStep();
    fixture.nativeElement.querySelector('[value="options"]').click();
    await fixture.whenStable();
    await nextStep();
    http.expectNone(request => request.method === 'POST');
    expect(fixture.componentInstance.showAddModal()).toBeTrue();
    expect(fixture.componentInstance.productEditorStep()).toBe(1);
    expect(fixture.nativeElement.querySelector('.options-error').textContent).toContain('اسم كل خيار');
  });

  it('retains existing option IDs and stock when editing a price', async () => {
    fixture.componentInstance.showAddModal.set(false);
    fixture.componentInstance.editProductStart({ ...fixture.componentInstance.newProduct, id: 7,
      images: [], productDetails: [], variants: [{ id: 11, name: 'Size', nameAr: 'المقاس',
        values: [{ id: 21, value: 'Small', valueAr: 'صغير', price: 1.5 }] }],
    } as unknown as ProductDto);
    await fixture.whenStable();
    await nextStep();
    await enter('edit-product-options-price-0-0', '4.125');
    await nextStep();
    fixture.nativeElement.querySelector('.save-product').click();
    await fixture.whenStable();
    const request = http.expectOne(request => request.method === 'PUT' && request.url === `${url}/7`);
    const body = request.request.body as FormData;
    expect(body.get('totalInStock')).toBe('25');
    expect(body.get('variants[0].id')).toBe('11');
    expect(body.get('variants[0].values[0].id')).toBe('21');
    expect(body.get('variants[0].values[0].price')).toBe('4.125');
    expect(body.get('newPrice')).toBe('4.125');
    request.flush({ id: 7 });
    http.match(request => request.method === 'GET').forEach(request => request.flush(page));
    await fixture.whenStable();
  });
});
