import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';
import { normalizePhone } from '../../phone/phone-number';

@Component({
  selector: 'app-whatsapp-invoice-retry', standalone: true, imports: [FormsModule],
  template: `
    <section dir="rtl" style="padding:20px;border:1px solid #e7dfd4;border-radius:12px;margin-block:16px">
      <h3>طلب فاتورة واتساب لطلب سابق</h3>
      <p>إذا لم تُرسل الفاتورة بسبب غياب الموافقة، يمكنك طلبها دون دفع جديد. يخضع الطلب للتحقق من الدفع ومنع تكرار الإرسال.</p>
      <label style="display:flex;gap:10px;margin-block:12px"><input type="checkbox" [ngModel]="consent()" (ngModelChange)="consent.set($event)" [disabled]="busy() || queued() || !destination()" [ngModelOptions]="{standalone:true}" />
        أوافق الآن على استلام فاتورة هذا الطلب عبر واتساب على رقم التوصيل <bdi>{{destination() || phone()}}</bdi>
      </label>
      <button type="button" class="btn btn-outline" [disabled]="!consent() || !destination() || busy() || queued()" (click)="retry()">طلب إرسال الفاتورة</button>
      @if (message()) { <p role="status">{{message()}}</p> }
    </section>
  `,
})
export class WhatsAppInvoiceRetryComponent {
  private payments = inject(CheckoutPaymentService);
  orderId = input.required<number>(); phone = input(''); consent = signal(false);
  busy = signal(false); queued = signal(false); message = signal('');
  constructor() { effect(() => { this.orderId(); this.phone(); this.consent.set(false); this.queued.set(false); this.message.set(''); }); }
  destination() { return normalizePhone(this.phone()); }
  async retry() {
    const phone = this.destination();
    if (!this.consent() || !phone || this.busy() || this.queued()) return;
    this.busy.set(true); this.message.set('');
    try {
      await firstValueFrom(this.payments.retryWhatsAppInvoice(this.orderId(), phone));
      this.queued.set(true); this.message.set('تم تسجيل الموافقة وإدراج الفاتورة للإرسال. لم يتم تأكيد تسليمها بعد.');
    } catch { this.message.set('تعذر قبول الطلب. قد تكون الفاتورة أُرسلت سابقاً أو غير مؤهلة لإعادة الإرسال؛ لم يتم تأكيد إرسالها.'); }
    finally { this.busy.set(false); }
  }
}
