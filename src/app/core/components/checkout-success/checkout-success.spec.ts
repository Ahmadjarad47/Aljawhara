import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { CheckoutSuccessComponent } from './checkout-success';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';
import { environment } from '../../../../environments/environment';

const api = `${environment.apiUrl}Orders`;
describe('Verified checkout payment result', () => {
  let fixture: ComponentFixture<CheckoutSuccessComponent>;
  let component: CheckoutSuccessComponent;
  let http: HttpTestingController;
  let payments: CheckoutPaymentService;
  let savedSession: Record<string, string>;
  const expires = () => new Date(Date.now() + 600000).toISOString();

  beforeEach(() => {
    jasmine.clock().install();
    savedSession = Object.fromEntries(Object.keys(sessionStorage).filter(key => key.startsWith('checkout_'))
      .map(key => [key, sessionStorage.getItem(key)!]));
    Object.keys(savedSession).forEach(key => sessionStorage.removeItem(key));
  });
  afterEach(() => {
    fixture?.destroy();
    http.verify();
    jasmine.clock().uninstall();
    Object.keys(sessionStorage).filter(key => key.startsWith('checkout_')).forEach(key => sessionStorage.removeItem(key));
    Object.entries(savedSession).forEach(([key, value]) => sessionStorage.setItem(key, value));
  });

  function render(params: Record<string, string> = { orderId: '8' }): void {
    TestBed.configureTestingModule({
      imports: [CheckoutSuccessComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }],
    });
    http = TestBed.inject(HttpTestingController);
    payments = TestBed.inject(CheckoutPaymentService);
    fixture = TestBed.createComponent(CheckoutSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('does not show success for payment=success or callback 202 and polls until Paid=5', () => {
    render({ orderId: '8', invoice_id: '123456789012345678', payment: 'success' });
    expect(component.isSuccess()).toBeFalse();
    const callback = http.expectOne(request => request.url.endsWith('/payment-callback'));
    expect(callback.request.params.get('invoice_id')).toBe('123456789012345678');
    callback.flush({ updated: false }, { status: 202, statusText: 'Accepted' });
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 3, attemptStatus: 3 });
    expect(component.state()).toBe('reconciliation');
    expect(component.canRetry()).toBeFalse();
    jasmine.clock().tick(3000);
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 5, attemptStatus: 4 });
    expect(component.state()).toBe('paid');
    expect(component.isSuccess()).toBeTrue();
    jasmine.clock().tick(60000);
    http.expectNone(`${api}/8/payment-status`);
    http.expectNone(request => request.url.includes('webhook') || request.url.endsWith('payment-attempts'));
  });

  it('accepts callback 200 for already-paid but still reads the protected order status', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'failed' });
    http.expectOne(request => request.url.endsWith('/payment-callback')).flush({ updated: true }, { status: 200, statusText: 'OK' });
    expect(component.isSuccess()).toBeFalse();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 5 });
    expect(component.state()).toBe('paid');
  });

  for (const code of [400, 404]) {
    it(`handles rejected/unknown callback ${code} without showing order details or polling`, () => {
      render({ orderId: '8', invoice_id: '90', payment: 'success' });
      http.expectOne(request => request.url.endsWith('/payment-callback')).flush({}, { status: code, statusText: 'Rejected' });
      expect(component.state()).toBe(code === 404 ? 'unknown' : 'rejected');
      expect(component.verifiedOrderId()).toBeNull();
      expect(component.isSuccess()).toBeFalse();
      http.expectNone(`${api}/8/payment-status`);
    });
  }

  it('does not trust directly opening the success route without a saved order', () => {
    render({ payment: 'success' });
    expect(component.state()).toBe('unknown');
    expect(component.isSuccess()).toBeFalse();
    http.expectNone(request => request.url.includes('Orders'));
  });

  it('shows COD confirmation only from NotApplicable and creates no payment attempt', () => {
    render();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 0 });
    expect(component.state()).toBe('cod');
    expect(component.canRetry()).toBeFalse();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('keeps Ready distinct from Paid on the gateway return', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'success' });
    http.expectOne(request => request.url.endsWith('/payment-callback')).flush({}, { status: 202, statusText: 'Accepted' });
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 2,
      attemptStatus: 2, paymentUrl: 'https://example.test/pay', reservationExpiresAtUtc: expires() });
    expect(component.state()).toBe('ready');
    expect(component.isSuccess()).toBeFalse();
    component.retryPayment();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('rechecks a failed terminal attempt before retry and stops if it is now paid', () => {
    render();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, paymentAttemptId: 9,
      initializationStatus: 4, attemptStatus: 5, reservationExpiresAtUtc: expires() });
    expect(component.canRetry()).toBeTrue();
    component.retryPayment();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 5 });
    expect(component.isSuccess()).toBeTrue();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('retries only a terminal failure with an active reservation and a new idempotency key', () => {
    render();
    const failed = { orderId: 8, paymentAttemptId: 9, initializationStatus: 4, attemptStatus: 5,
      reservationExpiresAtUtc: expires() };
    http.expectOne(`${api}/8/payment-status`).flush(failed);
    component.retryPayment();
    http.expectOne(`${api}/8/payment-status`).flush(failed);
    const retry = http.expectOne(`${api}/8/payment-attempts`);
    expect(retry.request.headers.get('Idempotency-Key')).toBeTruthy();
    retry.flush({ orderId: 8, initializationStatus: 1, attemptStatus: 0, reservationExpiresAtUtc: expires() });
    expect(component.state()).toBe('pending');
    expect(component.canRetry()).toBeFalse();
  });

  it('does not retry active attempts or promise inventory after expiry', () => {
    render();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 4,
      attemptStatus: 5, paymentAttemptId: 9, reservationExpiresAtUtc: new Date(Date.now() - 1).toISOString() });
    expect(component.state()).toBe('expired');
    expect(component.canRetry()).toBeFalse();
    component.retryPayment();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('continues polling for Pending/Dispatching and cancels the timer on destruction', () => {
    render();
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 1, attemptStatus: 1 });
    expect(component.canRetry()).toBeFalse();
    fixture.destroy();
    jasmine.clock().tick(60000);
    http.expectNone(`${api}/8/payment-status`);
  });
});
