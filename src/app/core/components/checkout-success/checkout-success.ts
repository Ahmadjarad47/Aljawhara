import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';
import { OrderPaymentStatus, PaymentAttemptStatus as Attempt, PaymentInitializationStatus as Init } from '../../Models/checkout-payment';

type PaymentView = 'checking' | 'pending' | 'reconciliation' | 'ready' | 'paid' | 'cod'
  | 'failed' | 'expired' | 'rejected' | 'unknown' | 'unavailable' | 'review' | 'delayed';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.css',
})
export class CheckoutSuccessComponent implements OnInit, OnDestroy {
  private payments = inject(CheckoutPaymentService);
  private route = inject(ActivatedRoute);
  private subscription = new Subscription();
  private pollTimer?: ReturnType<typeof setTimeout>;
  private polls = 0;
  private orderId?: number;
  private preparing = false;
  private returnedFromGateway = false;
  private destroyed = false;
  currentLanguage = signal<'ar' | 'en'>(localStorage.getItem('language') === 'en' ? 'en' : 'ar');
  state = signal<PaymentView>('checking');
  busy = signal(false);
  status = signal<OrderPaymentStatus | null>(null);
  verifiedOrderId = signal<number | null>(null);

  readonly messages: Record<PaymentView, { ar: string; en: string }> = {
    checking: { ar: 'جارٍ التحقق من حالة الدفع', en: 'Checking payment status' },
    pending: { ar: 'جارٍ تجهيز الدفع', en: 'Preparing your payment' },
    reconciliation: { ar: 'الدفع قيد التحقق', en: 'Payment verification in progress' },
    ready: { ar: 'رابط الدفع جاهز', en: 'Your payment link is ready' },
    paid: { ar: 'تم تأكيد الدفع بنجاح', en: 'Payment confirmed' },
    cod: { ar: 'تم استلام طلبك — الدفع عند الاستلام', en: 'Order received — pay on delivery' },
    failed: { ar: 'لم تكتمل محاولة الدفع', en: 'The payment attempt did not complete' },
    expired: { ar: 'انتهت مهلة حجز المخزون', en: 'The stock reservation has expired' },
    rejected: { ar: 'رُفض طلب التحقق من الدفع', en: 'The payment verification request was rejected' },
    unknown: { ar: 'تعذر الوصول إلى بيانات الدفع', en: 'Payment information is unavailable' },
    unavailable: { ar: 'تعذر التحقق من الدفع حالياً', en: 'Unable to check payment right now' },
    review: { ar: 'تأكيد الدفع يحتاج متابعة', en: 'Payment confirmation needs attention' },
    delayed: { ar: 'تأكيد الدفع يستغرق وقتاً أطول', en: 'Payment confirmation is taking longer' },
  };

  text(ar: string, en: string): string { return this.currentLanguage() === 'ar' ? ar : en; }
  title(): string {
    if (this.preparing) {
      if (['checking', 'pending', 'reconciliation'].includes(this.state())) return this.messages.pending[this.currentLanguage()];
      if (this.state() === 'review') return this.text('تجهيز الدفع يحتاج متابعة', 'Payment preparation needs attention');
      if (this.state() === 'delayed') return this.text('تجهيز رابط الدفع يستغرق وقتاً أطول', 'Your payment link is taking longer');
      if (this.state() === 'unavailable') return this.text('تعذر تجهيز الدفع حالياً', 'Unable to prepare payment right now');
    }
    return this.messages[this.state()][this.currentLanguage()];
  }
  isPreparingPayment(): boolean { return this.preparing; }
  isSuccess(): boolean { return this.state() === 'paid' || this.state() === 'cod'; }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const rawId = params.get('orderId');
    const parsedId = rawId === null ? this.payments.context()?.orderId : Number(rawId);
    if (parsedId && Number.isSafeInteger(parsedId) && parsedId > 0) this.orderId = parsedId;
    const invoiceId = params.get('invoice_id');
    // The return URL's payment value never determines success or failure.
    this.preparing = params.get('prepare') === '1' && !invoiceId;
    if (this.preparing) this.state.set('pending');
    if (invoiceId !== null) {
      if (!/^[1-9][0-9]*$/.test(invoiceId)) { this.state.set('rejected'); return; }
      this.returnedFromGateway = true;
      this.busy.set(true);
      this.subscription.add(this.payments.triggerCallback(invoiceId, params.get('payment') ?? undefined).subscribe({
        next: response => {
          this.busy.set(false);
          if (response.status === 200 || response.status === 202) this.checkStatus();
          else this.state.set('unavailable');
        },
        error: error => {
          this.busy.set(false);
          if (error.status === 404 || error.status === 400) {
            this.state.set(error.status === 404 ? 'unknown' : 'rejected');
          } else {
            // A slow/failed callback does not prevent the protected status endpoint
            // from recovering the payment through server-to-server verification.
            this.checkStatus();
          }
        },
      }));
    } else this.checkStatus();
  }

  checkStatus(): void {
    if (this.destroyed || this.busy()) return;
    if (!this.orderId) { this.state.set('unknown'); return; }
    clearTimeout(this.pollTimer);
    this.busy.set(true);
    this.subscription.add(this.payments.getStatus(this.orderId, this.returnedFromGateway).subscribe({
      next: status => { this.busy.set(false); this.applyStatus(status); },
      error: error => {
        this.busy.set(false);
        if (error.status === 404 || error.status === 403 || error.status === 401) {
          this.status.set(null);
          this.verifiedOrderId.set(null);
          this.state.set('unknown');
        } else {
          this.state.set('unavailable');
          this.schedulePoll();
        }
      },
    }));
  }

  private applyStatus(status: OrderPaymentStatus): void {
    this.status.set(status);
    this.verifiedOrderId.set(status.orderId);
    if (status.initializationStatus === Init.Paid) { this.state.set('paid'); return; }
    if (status.initializationStatus === Init.NotApplicable) { this.state.set('cod'); return; }
    if (this.preparing && this.canOpenPayment()) {
      this.state.set('ready');
      this.openPayment();
      return;
    }
    if (this.needsReview(status.verificationReasonCode)) {
      this.state.set('review');
      return;
    }
    if (status.initializationStatus === Init.RequiresReconciliation || status.attemptStatus === Attempt.RequiresReconciliation) {
      this.state.set('reconciliation');
      this.schedulePoll();
      return;
    }
    if (this.reservationExpired()) { this.state.set('expired'); return; }
    if (status.initializationStatus === Init.Failed) { this.state.set('failed'); return; }
    if (status.initializationStatus === Init.Ready && status.paymentUrl) {
      this.state.set('ready');
      if (this.preparing) this.openPayment();
      else this.schedulePoll();
      return;
    }
    this.state.set('pending');
    this.schedulePoll();
  }

  private schedulePoll(): void {
    if (this.destroyed) return;
    if (this.polls >= 30) { this.state.set('delayed'); return; }
    const delay = Math.min(3000 + this.polls++ * 1000, 15000);
    this.pollTimer = setTimeout(() => this.checkStatus(), delay);
  }

  private needsReview(reason?: string | null): boolean {
    if (!reason) return false;
    return ['MERCHANT_VENDOR_ID_NOT_CONFIGURED', 'PAID_TRANSITIONS_NOT_CERTIFIED',
      'DISCOUNT_SEMANTICS_NOT_CERTIFIED', 'FINALIZATION_REJECTED',
      'VERIFIED_AFTER_RESERVATION_RELEASE', 'VERIFIED_DURING_CONCURRENT_ORDER_TRANSITION',
      'INVOICE_ID_MISMATCH', 'VENDOR_ID_MISMATCH', 'MERCHANT_REFERENCE_MISMATCH',
      'CURRENCY_MISMATCH', 'AMOUNT_FIELDS_MISMATCH', 'KWD_SCALE_INVALID',
      'MISSING_REQUIRED_FIELD', 'MISSING_PAYMENT_TRANSACTION_EVIDENCE',
      'REFUND_OR_PARTIAL_REFUND_REQUIRES_RECONCILIATION'].includes(reason);
  }

  reservationExpired(): boolean {
    const expires = this.status()?.reservationExpiresAtUtc;
    return !!expires && Date.parse(expires) <= Date.now();
  }

  canRetry(): boolean {
    const status = this.status();
    const expires = status?.reservationExpiresAtUtc;
    return this.state() === 'failed' && status?.initializationStatus === Init.Failed
      && [Attempt.Failed, Attempt.Cancelled, Attempt.Expired].includes(status.attemptStatus!)
      && !!status.paymentAttemptId && !!expires && Date.parse(expires) > Date.now();
  }

  retryPayment(): void {
    if (!this.canRetry() || this.busy() || !this.orderId) return;
    this.busy.set(true);
    // Recheck immediately before retry so an already-paid or live attempt is never replaced.
    this.subscription.add(this.payments.getStatus(this.orderId).subscribe({
      next: status => {
        this.applyStatus(status);
        if (!this.canRetry()) { this.busy.set(false); return; }
        this.subscription.add(this.payments.retryPayment(status.orderId, status.paymentAttemptId!).subscribe({
          next: nextStatus => {
            this.busy.set(false);
            this.preparing = true;
            this.returnedFromGateway = false;
            this.polls = 0;
            this.applyStatus(nextStatus);
          },
          error: () => { this.busy.set(false); this.checkStatus(); },
        }));
      },
      error: () => { this.busy.set(false); this.state.set('unavailable'); },
    }));
  }

  openPayment(): void {
    const status = this.status();
    if (!status?.paymentUrl || !this.canOpenPayment()) return;
    const url = new URL(status.paymentUrl, window.location.origin);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    window.location.assign(url.href);
  }

  private canOpenPayment(): boolean {
    const status = this.status();
    if (!status?.paymentUrl || this.reservationExpired()) return false;
    if (status.initializationStatus === Init.Ready && status.attemptStatus !== Attempt.Paid) return true;
    // Resume the same invoice if an earlier pre-payment check failed before
    // contacting Sadad. Never resume uncertain creation or rejected payment evidence.
    return this.preparing && status.initializationStatus === Init.RequiresReconciliation
      && status.attemptStatus === Attempt.RequiresReconciliation
      && ['MERCHANT_VENDOR_ID_NOT_CONFIGURED', 'DISCOUNT_SEMANTICS_NOT_CERTIFIED'].includes(status.verificationReasonCode ?? '');
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.pollTimer);
    this.subscription.unsubscribe();
  }
}
