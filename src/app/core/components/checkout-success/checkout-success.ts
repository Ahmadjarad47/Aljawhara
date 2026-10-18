import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';
import { OrderPaymentStatus, PaymentAttemptStatus as Attempt, PaymentInitializationStatus as Init } from '../../Models/checkout-payment';

type PaymentView = 'checking' | 'pending' | 'reconciliation' | 'ready' | 'paid' | 'cod'
  | 'failed' | 'expired' | 'rejected' | 'unknown' | 'unavailable';

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
  };

  text(ar: string, en: string): string { return this.currentLanguage() === 'ar' ? ar : en; }
  title(): string { return this.messages[this.state()][this.currentLanguage()]; }
  isSuccess(): boolean { return this.state() === 'paid' || this.state() === 'cod'; }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const rawId = params.get('orderId');
    const parsedId = rawId === null ? this.payments.context()?.orderId : Number(rawId);
    if (parsedId && Number.isSafeInteger(parsedId) && parsedId > 0) this.orderId = parsedId;
    const invoiceId = params.get('invoice_id');
    // The return URL's payment value never determines success or failure.
    this.preparing = params.get('prepare') === '1' && !invoiceId;
    if (invoiceId !== null) {
      if (!/^[1-9][0-9]*$/.test(invoiceId)) { this.state.set('rejected'); return; }
      this.busy.set(true);
      this.subscription.add(this.payments.triggerCallback(invoiceId, params.get('payment') ?? undefined).subscribe({
        next: response => {
          this.busy.set(false);
          if (response.status === 200 || response.status === 202) this.checkStatus();
          else this.state.set('unavailable');
        },
        error: error => {
          this.busy.set(false);
          this.state.set(error.status === 404 ? 'unknown' : error.status === 400 ? 'rejected' : 'unavailable');
        },
      }));
    } else this.checkStatus();
  }

  checkStatus(): void {
    if (this.destroyed || this.busy()) return;
    if (!this.orderId) { this.state.set('unknown'); return; }
    clearTimeout(this.pollTimer);
    this.busy.set(true);
    this.subscription.add(this.payments.getStatus(this.orderId).subscribe({
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
    if (this.destroyed || this.polls >= 30) return;
    const delay = Math.min(3000 + this.polls++ * 1000, 15000);
    this.pollTimer = setTimeout(() => this.checkStatus(), delay);
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
    if (status?.initializationStatus !== Init.Ready || !status.paymentUrl || this.reservationExpired()) return;
    const url = new URL(status.paymentUrl, window.location.origin);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    window.location.assign(url.href);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.pollTimer);
    this.subscription.unsubscribe();
  }
}
