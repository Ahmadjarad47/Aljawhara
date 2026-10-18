import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheckoutPaymentService } from './checkout-payment.service';
import { environment } from '../../../environments/environment';
import { OrderCreateDto } from '../../admin/order/order.models';

const api = `${environment.apiUrl}Orders`;
describe('Checkout payment contract', () => {
  let service: CheckoutPaymentService;
  let http: HttpTestingController;
  let savedSession: Record<string, string>;
  const dto: OrderCreateDto = { items: [{ productId: 1, name: 'Item', image: '', price: 2, quantity: 1 }],
    shippingAddress: { fullName: 'Name', phone: '67070814', street: 'Address' }, couponCode: null, paymentMethod: 4 };

  beforeEach(() => {
    savedSession = Object.fromEntries(Object.keys(sessionStorage).filter(key => key.startsWith('checkout_'))
      .map(key => [key, sessionStorage.getItem(key)!]));
    Object.keys(savedSession).forEach(key => sessionStorage.removeItem(key));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CheckoutPaymentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    Object.keys(sessionStorage).filter(key => key.startsWith('checkout_')).forEach(key => sessionStorage.removeItem(key));
    Object.entries(savedSession).forEach(([key, value]) => sessionStorage.setItem(key, value));
  });

  it('reuses a random idempotency key for a lost order response, even after service recreation', () => {
    service.createOrder(dto).subscribe({ error: () => {} });
    const first = http.expectOne(api);
    const key = first.request.headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    first.flush('', { status: 503, statusText: 'Unavailable' });
    service = TestBed.runInInjectionContext(() => new CheckoutPaymentService());
    service.createOrder(dto).subscribe();
    const retry = http.expectOne(api);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({ orderId: 8, paymentInitializationStatus: 1, guestAccessToken: 'guest-secret' });
    expect(service.context()?.orderId).toBe(8);
    expect(sessionStorage.getItem('checkout_order_request')).toBeNull();
  });

  it('uses a new key when the actual checkout request changes', () => {
    service.createOrder(dto).subscribe({ error: () => {} });
    const first = http.expectOne(api);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush('', { status: 400, statusText: 'Rejected' });
    service.createOrder({ ...dto, paymentMethod: 2 }).subscribe();
    const changed = http.expectOne(api);
    expect(changed.request.headers.get('Idempotency-Key')).not.toBe(key);
    expect(changed.request.body.paymentMethod).toBe(2);
    changed.flush({ orderId: 9, paymentInitializationStatus: 0 });
  });

  it('keeps a guest token across reloads and uses it only for its own order', () => {
    service.remember({ orderId: 8, paymentInitializationStatus: 1, guestAccessToken: 'guest-secret' });
    service = TestBed.runInInjectionContext(() => new CheckoutPaymentService());
    service.getStatus(8).subscribe();
    const status = http.expectOne(`${api}/8/payment-status`);
    expect(status.request.headers.get('X-Guest-Order-Token')).toBe('guest-secret');
    expect(status.request.headers.get('Cache-Control')).toBe('no-store');
    expect(status.request.transferCache).toBeFalse();
    status.flush({ orderId: 8, initializationStatus: 5, attemptStatus: 4 });
    expect(service.context(8)?.guestAccessToken).toBe('guest-secret');
    service.getStatus(9).subscribe();
    const other = http.expectOne(`${api}/9/payment-status`);
    expect(other.request.headers.has('X-Guest-Order-Token')).toBeFalse();
    other.flush({ orderId: 9, initializationStatus: 1 });
  });

  it('reuses a retry key only for the same terminal attempt and sends no webhook request', () => {
    service.retryPayment(8, 3).subscribe({ error: () => {} });
    const first = http.expectOne(`${api}/8/payment-attempts`);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush('', { status: 503, statusText: 'Unavailable' });
    service.retryPayment(8, 3).subscribe();
    const second = http.expectOne(`${api}/8/payment-attempts`);
    expect(second.request.headers.get('Idempotency-Key')).toBe(key);
    second.flush({ orderId: 8, initializationStatus: 1 });
    service.retryPayment(8, 4).subscribe();
    const third = http.expectOne(`${api}/8/payment-attempts`);
    expect(third.request.headers.get('Idempotency-Key')).not.toBe(key);
    third.flush({ orderId: 8, initializationStatus: 1 });
    http.expectNone(request => request.url.includes('webhook'));
  });
});
