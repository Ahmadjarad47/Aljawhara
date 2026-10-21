import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { WhatsAppInvoiceRetryComponent } from './whatsapp-invoice-retry';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';

describe('Historical WhatsApp invoice retry', () => {
  it('requires fresh consent, queues once, and does not claim delivery after acceptance', async () => {
    const retry = jasmine.createSpy().and.returnValue(of(null));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: CheckoutPaymentService, useValue: { retryWhatsAppInvoice: retry } }] });
    const fixture = TestBed.createComponent(WhatsAppInvoiceRetryComponent);
    fixture.componentRef.setInput('orderId', 47); fixture.componentRef.setInput('phone', '+4915112345678');
    fixture.detectChanges(); await fixture.whenStable();
    await fixture.componentInstance.retry(); expect(retry).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('input') as HTMLInputElement).click(); await fixture.whenStable();
    await fixture.componentInstance.retry(); await fixture.componentInstance.retry();
    expect(retry).toHaveBeenCalledOnceWith(47, '+4915112345678');
    expect(fixture.componentInstance.queued()).toBeTrue();
    expect(fixture.componentInstance.message()).toContain('لم يتم تأكيد تسليمها بعد'); fixture.destroy();
  });
});
