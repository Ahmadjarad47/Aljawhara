import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { StepperComponent } from './stepper';
import { ServiceStepper, StepperStep } from './service-stepper';
import { CartService } from '../service/cart-service';
import { ShippingService } from '../service/shipping.service';
import { ServiceAuth } from '../../auth/service-auth';
import { UserAddressDto } from '../Models/shipping';
import { environment } from '../../../environments/environment.development';
import { environment as paymentEnvironment } from '../../../environments/environment';
import { createAddressForm, toOrderShippingAddress } from './shipping-address';

const addressUrl = `${environment.apiUrl}Auth/addresses`;
const ordersUrl = `${paymentEnvironment.apiUrl}Orders`;

// Exercise the actual single-page form, persistence and order requests together.
describe('Single-page checkout', () => {
  let fixture: ComponentFixture<StepperComponent>;
  let checkout: StepperComponent;
  let http: HttpTestingController;
  let state: ServiceStepper;
  let cart: CartService;
  let navigate: jasmine.Spy;
  let authenticated: boolean;
  let previousStorage: Record<string, string | null>;
  let previousSession: Record<string, string>;
  const storageKeys = ['cart_items', 'applied_coupon', 'checkout_data', 'checkout_step', 'language'];

  const minimalAddress = {
    fullName: 'بدر', phoneNumber: '67070814', addressLine1: 'عبدالله مبارك', isDefault: true,
  };

  beforeEach(() => {
    previousSession = Object.fromEntries(Object.keys(sessionStorage).filter(key => key.startsWith('checkout_'))
      .map(key => [key, sessionStorage.getItem(key)!]));
    Object.keys(previousSession).forEach(key => sessionStorage.removeItem(key));
    previousStorage = Object.fromEntries(storageKeys.map(key => [key, localStorage.getItem(key)]));
    storageKeys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem('language', 'ar');
    localStorage.setItem('cart_items', JSON.stringify([
      { id: 'item-1', productId: 10, name: 'رول سفرة طعام', image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', price: 2.5, quantity: 1,
        selectedVariants: { 2: 4 } },
    ]));
    authenticated = false;
    TestBed.configureTestingModule({
      imports: [StepperComponent],
      providers: [
        provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ServiceAuth, useValue: { get isAuthenticated() { return authenticated; } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    state = TestBed.inject(ServiceStepper);
    cart = TestBed.inject(CartService);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    Object.keys(sessionStorage).filter(key => key.startsWith('checkout_')).forEach(key => sessionStorage.removeItem(key));
    Object.entries(previousSession).forEach(([key, value]) => sessionStorage.setItem(key, value));
    for (const key of storageKeys) {
      const value = previousStorage[key];
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  async function render(addresses: UserAddressDto[] = []): Promise<void> {
    fixture = TestBed.createComponent(StepperComponent);
    checkout = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}shipping`).flush({ currency: 'KWD', defaultFee: 2, freeShippingThreshold: 20, version: 1,
      areas: [{ city: 'الخيران', fee: 6 }, { city: 'المطلاع', fee: 4 }] });
    if (authenticated) http.expectOne(addressUrl).flush({ success: true, data: addresses });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function setInput(id: string, value: string): Promise<void> {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function fillRequired(): Promise<void> {
    for (const [id, value] of Object.entries(minimalAddress)) {
      if (id === 'isDefault') continue;
      const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value as string;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function confirmButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.confirm-order');
  }

  it('renders delivery, payment and summary together with exactly nine address inputs', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('.checkout-page').dir).toBe('rtl');
    expect(fixture.nativeElement.querySelectorAll('#shipping-address input').length).toBe(9);
    expect(fixture.nativeElement.querySelectorAll('#shipping-address input[required]').length).toBe(3);
    expect(fixture.nativeElement.querySelector('#payment-heading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#summary-heading')).not.toBeNull();
    for (const name of ['city', 'state', 'postalCode', 'country', 'addressLine2']) {
      expect(fixture.nativeElement.querySelector(`[name="${name}"]`)).toBeNull();
    }
    expect(confirmButton().disabled).toBeTrue();
  });

  it('enables confirmation with only name, an eight-digit mobile and address line 1', async () => {
    await render();
    await fillRequired();
    expect(checkout.shipping()!.isFormValid()).toBeTrue();
    expect(confirmButton().disabled).toBeFalse();
    await setInput('fullName', '   ');
    fixture.detectChanges();
    expect(confirmButton().disabled).toBeTrue();
    await setInput('fullName', 'بدر');
    await setInput('phoneNumber', 'invalid');
    fixture.detectChanges();
    expect(confirmButton().disabled).toBeTrue();
  });

  it('creates one guest order through the visible confirm button without an address-save request', async () => {
    await render();
    await fillRequired();
    confirmButton().click();
    await fixture.whenStable();
    const request = http.expectOne(ordersUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
    const body = JSON.parse(JSON.stringify(request.request.body));
    expect(body.shippingAddress.fullName).toBe('بدر');
    expect(body.shippingAddress.phone).toBe('67070814');
    expect(body.shippingAddress.street).toBe('عبدالله مبارك');
    expect(body.shippingAddress.city).toBeNull();
    expect(body.shippingAddress.state).toBeNull();
    for (const key of ['postalCode', 'country', 'addressLine2', 'phoneNumber', 'addressLine1']) {
      expect(key in body.shippingAddress).toBeFalse();
    }
    expect(body.items[0].selectedVariants).toEqual({ 2: 4 });
    expect(confirmButton().disabled).toBeTrue();
    await checkout.confirmOrder();
    http.expectNone(ordersUrl);
    http.expectNone(addressUrl);
    request.flush({ orderId: 91, paymentInitializationStatus: 0 });
    await fixture.whenStable();
    expect(cart.getCartItems()).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(['/checkout/success'], { queryParams: { orderId: 91, prepare: '1' } });
  });

  it('saves a signed-in address with only required fields before creating the order', async () => {
    authenticated = true;
    await render();
    await fillRequired();
    const confirmation = checkout.confirmOrder();
    const saved = http.expectOne(addressUrl);
    expect(saved.request.method).toBe('POST');
    const payload = JSON.parse(JSON.stringify(saved.request.body));
    expect(payload.fullName).toBe('بدر');
    expect(payload.phoneNumber).toBe('67070814');
    expect(payload.addressLine1).toBe('عبدالله مبارك');
    expect(payload.city).toBeNull();
    expect(payload.state).toBeNull();
    for (const key of ['postalCode', 'country', 'addressLine2']) {
      expect(key in payload).toBeFalse();
    }
    http.expectNone(ordersUrl);
    saved.flush({ success: true, data: { ...minimalAddress, id: 7, createdAt: '', updatedAt: '' } });
    await fixture.whenStable();
    http.expectOne(ordersUrl).flush({ orderId: 91, paymentInitializationStatus: 0 });
    await confirmation;
    expect(navigate).toHaveBeenCalledWith(['/checkout/success'], { queryParams: { orderId: 91, prepare: '1' } });
  });

  it('populates saved fields and updates them with street distinct from alSharee', async () => {
    authenticated = true;
    const savedAddress: UserAddressDto = {
      ...minimalAddress, id: 7, createdAt: '', updatedAt: '', city: null, state: null, postalCode: null, country: null,
      alQataa: '8', alSharee: '809', alJada: '16', alManzil: '16', alDor: '2', alShakka: '5',
    };
    await render([savedAddress]);
    for (const field of checkout.shipping()!.optionalFields) {
      expect((fixture.nativeElement.querySelector(`#${field.key}`) as HTMLInputElement).value).toBe(savedAddress[field.key]!);
    }
    expect(confirmButton().disabled).toBeFalse();
    await setInput('addressLine1', 'عنوان محدث');
    const confirmation = checkout.confirmOrder();
    const update = http.expectOne(addressUrl);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.id).toBe(7);
    update.flush({ success: true, data: { ...savedAddress, addressLine1: 'عنوان محدث' } });
    await fixture.whenStable();
    const order = http.expectOne(ordersUrl);
    expect(order.request.body.shippingAddress.street).toBe('عنوان محدث');
    expect(order.request.body.shippingAddress.alSharee).toBe('809');
    expect(order.request.body.shippingAddress.alShakka).toBe('5');
    expect(order.request.body.shippingAddress.city).toBeNull();
    order.flush({ orderId: 91, paymentInitializationStatus: 0 });
    await confirmation;
  });

  it('only changes selection when choosing either payment method and submits once on confirmation', async () => {
    await render();
    await fillRequired();
    for (const value of ['on_delivery', 'now', 'on_delivery']) {
      (fixture.nativeElement.querySelector(`input[value="${value}"]`) as HTMLInputElement).click();
      await fixture.whenStable();
      http.expectNone(ordersUrl);
    }
    expect(state.checkoutData().paymentTiming).toBe('on_delivery');
    confirmButton().click();
    await fixture.whenStable();
    http.expectOne(ordersUrl).flush({ orderId: 91, paymentInitializationStatus: 0 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps address and cart after an order error and allows retry', async () => {
    await render();
    await fillRequired();
    const confirmation = checkout.confirmOrder();
    await fixture.whenStable();
    http.expectOne(ordersUrl).flush('Rejected', { status: 400, statusText: 'Bad Request' });
    await confirmation;
    fixture.detectChanges();
    expect(cart.getCartItems().length).toBe(1);
    expect(checkout.shipping()!.formData.fullName).toBe('بدر');
    expect(checkout.payment()!.error()).toBeTruthy();
    expect(confirmButton().disabled).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stops submission when saving the address fails', async () => {
    authenticated = true;
    await render();
    await fillRequired();
    const confirmation = checkout.confirmOrder();
    http.expectOne(addressUrl).flush({ success: false });
    await confirmation;
    http.expectNone(ordersUrl);
    expect(checkout.shipping()!.error()).toBeTruthy();
    expect(cart.getCartItems().length).toBe(1);
  });

  it('restores cached checkout data and retains legacy metadata for delivery fees', async () => {
    state.updateCheckoutData({
      address: { ...minimalAddress, id: 7, city: 'الخيران', country: 'Kuwait', createdAt: '', updatedAt: '' },
      selectedAddressId: 7,
    });
    await render();
    expect(checkout.shipping()!.formData.fullName).toBe('بدر');
    expect(checkout.deliveryFee()).toBe(6);
    expect(checkout.total()).toBe(8.5);
    expect(state.isStepComplete(StepperStep.SHIPPING)).toBeTrue();
  });

  it('does not consider an address ID alone sufficient to bypass shipping validation', () => {
    state.updateCheckoutData({ selectedAddressId: 7 });
    expect(state.isStepComplete(StepperStep.SHIPPING)).toBeFalse();
  });

  it('uses server settings and recalculates shipping when cart quantities change', async () => {
    await render();
    await fillRequired();
    const settings = TestBed.inject(ShippingService);
    settings.load().subscribe();
    http.expectOne(`${environment.apiUrl}shipping`).flush({ currency: 'KWD', defaultFee: 4.125,
      freeShippingThreshold: 10, version: 2, areas: [] });
    expect(checkout.deliveryFee()).toBe(4.125);
    cart.updateQuantity('item-1', 4);
    expect(checkout.deliveryFee()).toBe(0);
    expect(checkout.total()).toBe(10);
  });

  it('blocks confirmation when shipping settings cannot be loaded', async () => {
    fixture = TestBed.createComponent(StepperComponent);
    checkout = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}shipping`).flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    await new Promise(resolve => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();
    await fillRequired();
    expect(checkout.deliveryFee()).toBeNull();
    expect(checkout.shipping()!.error()).toBeTruthy();
    expect(confirmButton().disabled).toBeTrue();
    await checkout.confirmOrder();
    http.expectNone(ordersUrl);
  });

  it('selects a combined governorate/area, recalculates delivery, and sends matching geography', async () => {
    await render();
    await fillRequired();
    await setInput('addressLine1', 'الاحمدي خيران');
    const option = fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement;
    option.click();
    await fixture.whenStable();
    expect(checkout.shipping()!.formData.addressLine1).toBe('محافظة الأحمدي — الخيران');
    expect(checkout.deliveryFee()).toBe(6);
    expect(checkout.total()).toBe(8.5);
    const confirmation = checkout.confirmOrder();
    await fixture.whenStable();
    const order = http.expectOne(ordersUrl);
    expect(order.request.body.shippingAddress.street).toBe('محافظة الأحمدي — الخيران');
    expect(order.request.body.shippingAddress.city).toBe('الخيران');
    expect(order.request.body.shippingAddress.state).toBe('محافظة الأحمدي');
    order.flush({ orderId: 91, paymentInitializationStatus: 0 });
    await confirmation;
  });

  it('resets the previous city and delivery fee when a selected location is manually changed', async () => {
    state.updateCheckoutData({
      address: { ...minimalAddress, id: 7, city: 'الخيران', state: 'محافظة الأحمدي', createdAt: '', updatedAt: '' },
    });
    await render();
    expect(checkout.deliveryFee()).toBe(6);
    await setInput('addressLine1', 'عنوان آخر');
    expect(checkout.deliveryFee()).toBe(2);
    expect(checkout.shipping()!.formData.city).toBeNull();
    expect(checkout.shipping()!.formData.state).toBeNull();
  });

  it('maps null/omitted geography and all optional address fields without fabricating values', () => {
    const form = createAddressForm({ ...minimalAddress, alSharee: ' 809 ', alDor: ' 2 ' });
    const dto = toOrderShippingAddress(form);
    expect(dto.street).toBe(minimalAddress.addressLine1);
    expect(dto.alSharee).toBe('809');
    expect(dto.alDor).toBe('2');
    expect(dto.country).toBeUndefined();
    expect(dto.postalCode).toBeUndefined();
  });
});


