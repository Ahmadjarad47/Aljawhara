import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Shipping } from './shipping';
import { environment } from '../../../environments/environment.development';

describe('Admin shipping settings', () => {
  let fixture: ComponentFixture<Shipping>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}admin/shipping`;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Shipping], providers: [provideZonelessChangeDetection(),
      provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Shipping);
    fixture.detectChanges();
    http.expectOne(url).flush({ currency: 'KWD', defaultFee: 2, freeShippingThreshold: 20, version: 1,
      governorates: [{ state: 'محافظة الأحمدي', areas: [{ city: 'الخيران', fee: 6 }] }] });
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  async function input(name: string, value: string) {
    const element = fixture.nativeElement.querySelector(`[name="${name}"], #shipping-${name}`) as HTMLInputElement;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('saves edited fees, added and removed areas, and a disabled free-shipping offer from the form', async () => {
    await input('defaultFee', '4.125');
    fixture.nativeElement.querySelector('button.btn-error').click();
    await fixture.whenStable();
    const add = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('إضافة منطقة')) as HTMLButtonElement;
    add.click();
    await fixture.whenStable();
    await input('city-0-0', 'الفحيحيل');
    await input('fee-0-0', '7.375');
    const toggle = fixture.nativeElement.querySelector('[name="freeShippingEnabled"]') as HTMLInputElement;
    toggle.click();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ currency: 'KWD', defaultFee: 4.125, freeShippingThreshold: null,
      version: 1, governorates: [{ state: 'محافظة الأحمدي', areas: [{ city: 'الفحيحيل', fee: 7.375 }] }] });
    request.flush({ ...request.request.body, version: 2 });
    await fixture.whenStable();
    expect(fixture.componentInstance.success()).toBeTrue();
    expect(fixture.componentInstance.settings!.version).toBe(2);
  });

  it('preserves an unsaved edit and explains a conflicting update', async () => {
    await input('defaultFee', '9');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
    http.expectOne(url).flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.componentInstance.settings!.defaultFee).toBe(9);
    expect(fixture.componentInstance.error()).toContain('عدّل مسؤول آخر');
    expect(fixture.componentInstance.saving()).toBeFalse();
  });

  it('groups areas under their governorates and saves independent fees inside the same governorate', async () => {
    const ahmadi = fixture.nativeElement.querySelector('[data-governorate="محافظة الأحمدي"]') as HTMLElement;
    expect(ahmadi.querySelector('h3')!.textContent).toContain('محافظة الأحمدي');
    expect(ahmadi.querySelector('datalist option[value="الفحيحيل"]')).not.toBeNull();
    (Array.from(ahmadi.querySelectorAll('button')).find(button => button.textContent?.includes('إضافة منطقة'))!).click();
    await fixture.whenStable();
    await input('city-0-1', 'الفحيحيل');
    await input('fee-0-1', '3.125');
    const select = fixture.nativeElement.querySelector('#new-shipping-governorate') as HTMLSelectElement;
    select.value = 'محافظة الجهراء';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    (Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('إضافة محافظة')) as HTMLButtonElement).click();
    await fixture.whenStable();
    const jahra = fixture.nativeElement.querySelector('[data-governorate="محافظة الجهراء"]') as HTMLElement;
    (Array.from(jahra.querySelectorAll('button')).find(button => button.textContent?.includes('إضافة منطقة'))!).click();
    await fixture.whenStable();
    await input('city-1-0', 'المطلاع');
    await input('fee-1-0', '4.625');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
    const request = http.expectOne(url);
    expect(request.request.body.governorates).toEqual([
      { state: 'محافظة الأحمدي', areas: [{ city: 'الخيران', fee: 6 }, { city: 'الفحيحيل', fee: 3.125 }] },
      { state: 'محافظة الجهراء', areas: [{ city: 'المطلاع', fee: 4.625 }] },
    ]);
    request.flush({ ...request.request.body, version: 2 });
    await fixture.whenStable();
  });
});
