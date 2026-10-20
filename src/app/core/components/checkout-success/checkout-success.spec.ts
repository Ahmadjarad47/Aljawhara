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

  function expectStatus(verify?: boolean) {
    const request = http.expectOne(request => request.url === `${api}/8/payment-status`);
    if (verify !== undefined) expect(request.request.params.get('verify')).toBe(verify ? 'true' : null);
    return request;
  }

  it('prepares the invoice and redirects to Sadad without starting payment verification', () => {
    render({ orderId: '8', prepare: '1' });
    component.currentLanguage.set('ar');
    const redirect = spyOn(component, 'openPayment');
    expectStatus(false).flush({ orderId: 8, initializationStatus: 1, attemptStatus: 0 });
    fixture.detectChanges();
    expect(component.title()).toBe('جارٍ تجهيز الدفع');
    expect(fixture.nativeElement.textContent).toContain('سيتم تحويلك إلى سداد لإتمام الدفع');
    expect(fixture.nativeElement.textContent).not.toContain('سيتم تأكيد الدفع بعد التحقق');
    expect(component.isSuccess()).toBeFalse();
    jasmine.clock().tick(3000);
    expectStatus(false).flush({ orderId: 8, initializationStatus: 2, attemptStatus: 2,
      paymentUrl: 'https://sadad.test/pay/9001', reservationExpiresAtUtc: expires() });
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(component.state()).toBe('ready');
    expect(component.isSuccess()).toBeFalse();
    http.expectNone(request => request.url.includes('payment-callback') || request.url.includes('webhook'));
  });

  for (const initializationStatus of [2, 3]) {
    it(`opens the existing invoice in prepare mode when an earlier precondition check left status ${initializationStatus}`, () => {
      render({ orderId: '8', prepare: '1' });
      const redirect = spyOn(component, 'openPayment');
      expectStatus(false).flush({ orderId: 8, initializationStatus, attemptStatus: initializationStatus,
        paymentUrl: 'https://sadad.test/pay/9001', verificationReasonCode: 'MERCHANT_VENDOR_ID_NOT_CONFIGURED',
        reservationExpiresAtUtc: expires() });
      expect(redirect).toHaveBeenCalledTimes(1);
      expect(component.state()).toBe('ready');
      expect(component.isSuccess()).toBeFalse();
      http.expectNone(request => request.url.endsWith('payment-attempts'));
    });
  }

  for (const reason of ['PAID_TRANSITIONS_NOT_CERTIFIED', 'AMOUNT_FIELDS_MISMATCH']) {
    it(`does not redirect to pay again when prepare mode sees ${reason}`, () => {
      render({ orderId: '8', prepare: '1' });
      component.currentLanguage.set('ar');
      const redirect = spyOn(component, 'openPayment');
      expectStatus(false).flush({ orderId: 8, initializationStatus: 3, attemptStatus: 3,
        paymentUrl: 'https://sadad.test/pay/9001', verificationReasonCode: reason,
        reservationExpiresAtUtc: expires() });
      expect(redirect).not.toHaveBeenCalled();
      expect(component.state()).toBe('review');
      expect(component.title()).toBe('تجهيز الدفع يحتاج متابعة');
      expect(component.isSuccess()).toBeFalse();
    });
  }

  it('does not open an expired payment invoice while preparing', () => {
    render({ orderId: '8', prepare: '1' });
    const redirect = spyOn(component, 'openPayment');
    expectStatus(false).flush({ orderId: 8, initializationStatus: 2, attemptStatus: 2,
      paymentUrl: 'https://sadad.test/pay/9001', reservationExpiresAtUtc: new Date(Date.now() - 1).toISOString() });
    expect(component.state()).toBe('expired');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('does not show success for payment=success or callback 202 and polls until Paid=5', () => {
    render({ orderId: '8', invoice_id: '123456789012345678', payment: 'success' });
    expect(component.isSuccess()).toBeFalse();
    const callback = http.expectOne(request => request.url.endsWith('/payment-callback'));
    expect(callback.request.params.get('invoice_id')).toBe('123456789012345678');
    callback.flush({ updated: false }, { status: 202, statusText: 'Accepted' });
    expectStatus(true).flush({ orderId: 8, initializationStatus: 3, attemptStatus: 3 });
    expect(component.state()).toBe('reconciliation');
    expect(component.canRetry()).toBeFalse();
    jasmine.clock().tick(3000);
    expectStatus(true).flush({ orderId: 8, initializationStatus: 5, attemptStatus: 4 });
    expect(component.state()).toBe('paid');
    expect(component.isSuccess()).toBeTrue();
    jasmine.clock().tick(60000);
    http.expectNone(request => request.url === `${api}/8/payment-status`);
    http.expectNone(request => request.url.includes('webhook') || request.url.endsWith('payment-attempts'));
  });

  it('accepts callback 200 for already-paid but still reads the protected order status', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'failed' });
    http.expectOne(request => request.url.endsWith('/payment-callback')).flush({ updated: true }, { status: 200, statusText: 'OK' });
    expect(component.isSuccess()).toBeFalse();
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.state()).toBe('paid');
  });

  for (const code of [400, 404]) {
    it(`handles rejected/unknown callback ${code} without showing order details or polling`, () => {
      render({ orderId: '8', invoice_id: '90', payment: 'success' });
      http.expectOne(request => request.url.endsWith('/payment-callback')).flush({}, { status: code, statusText: 'Rejected' });
      expect(component.state()).toBe(code === 404 ? 'unknown' : 'rejected');
      expect(component.verifiedOrderId()).toBeNull();
      expect(component.isSuccess()).toBeFalse();
      http.expectNone(request => request.url === `${api}/8/payment-status`);
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
    expectStatus().flush({ orderId: 8, initializationStatus: 0 });
    expect(component.state()).toBe('cod');
    expect(component.canRetry()).toBeFalse();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('keeps Ready distinct from Paid on the gateway return', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'success' });
    http.expectOne(request => request.url.endsWith('/payment-callback')).flush({}, { status: 202, statusText: 'Accepted' });
    expectStatus().flush({ orderId: 8, initializationStatus: 2,
      attemptStatus: 2, paymentUrl: 'https://example.test/pay', reservationExpiresAtUtc: expires() });
    expect(component.state()).toBe('ready');
    expect(component.isSuccess()).toBeFalse();
    component.retryPayment();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('rechecks a failed terminal attempt before retry and stops if it is now paid', () => {
    render();
    expectStatus().flush({ orderId: 8, paymentAttemptId: 9,
      initializationStatus: 4, attemptStatus: 5, reservationExpiresAtUtc: expires() });
    expect(component.canRetry()).toBeTrue();
    component.retryPayment();
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.isSuccess()).toBeTrue();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('retries only a terminal failure with an active reservation and a new idempotency key', () => {
    render();
    const failed = { orderId: 8, paymentAttemptId: 9, initializationStatus: 4, attemptStatus: 5,
      reservationExpiresAtUtc: expires() };
    expectStatus().flush(failed);
    component.retryPayment();
    expectStatus().flush(failed);
    const retry = http.expectOne(`${api}/8/payment-attempts`);
    expect(retry.request.headers.get('Idempotency-Key')).toBeTruthy();
    retry.flush({ orderId: 8, initializationStatus: 1, attemptStatus: 0, reservationExpiresAtUtc: expires() });
    expect(component.state()).toBe('pending');
    expect(component.canRetry()).toBeFalse();
  });

  it('does not retry active attempts or promise inventory after expiry', () => {
    render();
    expectStatus().flush({ orderId: 8, initializationStatus: 4,
      attemptStatus: 5, paymentAttemptId: 9, reservationExpiresAtUtc: new Date(Date.now() - 1).toISOString() });
    expect(component.state()).toBe('expired');
    expect(component.canRetry()).toBeFalse();
    component.retryPayment();
    http.expectNone(`${api}/8/payment-attempts`);
  });

  it('continues polling for Pending/Dispatching and cancels the timer on destruction', () => {
    render();
    expectStatus().flush({ orderId: 8, initializationStatus: 1, attemptStatus: 1 });
    expect(component.canRetry()).toBeFalse();
    fixture.destroy();
    jasmine.clock().tick(60000);
    http.expectNone(request => request.url === `${api}/8/payment-status`);
  });

  it('recovers from a timed-out callback through protected status verification', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'success' });
    const callback = http.expectOne(request => request.url.endsWith('/payment-callback'));
    expect(component.busy()).toBeTrue();
    jasmine.clock().tick(20000);
    expect(callback.cancelled).toBeTrue();
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.busy()).toBeFalse();
    expect(component.isSuccess()).toBeTrue();
  });

  it('recovers from a temporary callback error without leaving the refresh button disabled', () => {
    render({ orderId: '8', invoice_id: '90', payment: 'success' });
    http.expectOne(request => request.url.endsWith('/payment-callback')).flush({}, { status: 503, statusText: 'Unavailable' });
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.busy()).toBeFalse();
    expect(component.isSuccess()).toBeTrue();
  });

  for (const reason of ['MERCHANT_VENDOR_ID_NOT_CONFIGURED', 'PAID_TRANSITIONS_NOT_CERTIFIED', 'AMOUNT_FIELDS_MISMATCH']) {
    it(`shows an actionable review state for ${reason} without spinning indefinitely`, () => {
      render();
      expectStatus().flush({ orderId: 8, initializationStatus: 3,
        attemptStatus: 3, verificationReasonCode: reason });
      fixture.detectChanges();
      expect(component.state()).toBe('review');
      expect(component.isSuccess()).toBeFalse();
      expect(component.canRetry()).toBeFalse();
      expect(component.busy()).toBeFalse();
      expect(fixture.nativeElement.querySelector('.loading-spinner')).toBeNull();
      jasmine.clock().tick(60000);
      http.expectNone(request => request.url === `${api}/8/payment-status`);
      component.checkStatus();
      expectStatus().flush({ orderId: 8, initializationStatus: 5 });
      expect(component.isSuccess()).toBeTrue();
    });
  }

  it('ends automatic waiting after a bounded number of polls and allows a manual refresh', () => {
    render();
    const pending = { orderId: 8, initializationStatus: 3, attemptStatus: 3 };
    expectStatus().flush(pending);
    for (let index = 0; index < 30; index++) {
      jasmine.clock().tick(15000);
      expectStatus().flush(pending);
    }
    fixture.detectChanges();
    expect(component.state()).toBe('delayed');
    expect(component.busy()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.loading-spinner')).toBeNull();
    jasmine.clock().tick(60000);
    http.expectNone(request => request.url === `${api}/8/payment-status`);
    component.checkStatus();
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.isSuccess()).toBeTrue();
  });

  it('releases the busy state when a status request hangs', () => {
    render();
    const status = expectStatus();
    jasmine.clock().tick(20000);
    expect(status.cancelled).toBeTrue();
    expect(component.busy()).toBeFalse();
    expect(component.state()).toBe('unavailable');
    jasmine.clock().tick(3000);
    expectStatus().flush({ orderId: 8, initializationStatus: 5 });
    expect(component.isSuccess()).toBeTrue();
  });
});
