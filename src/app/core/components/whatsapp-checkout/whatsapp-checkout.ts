import { Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceAuth } from '../../../auth/service-auth';
import { WhatsAppService, WhatsAppPreference } from '../../service/whatsapp.service';
import { normalizePhone } from '../../phone/phone-number';

@Component({
  selector: 'app-whatsapp-checkout', standalone: true, imports: [FormsModule],
  template: `
    <section dir="rtl" aria-labelledby="checkout-whatsapp-title">
      <h3 id="checkout-whatsapp-title">فاتورة واتساب (اختياري)</h3>
      <label><input type="checkbox" [ngModel]="checked()" (ngModelChange)="toggle($event)" [disabled]="!phone()" [ngModelOptions]="{standalone:true}" />
        أوافق على استلام تأكيد الدفع وفاتورة الطلب عبر واتساب على رقم هاتفي المسجّل لدى الجوهرة بلس.
      </label>
      <p>رقم واتساب هو رقم التوصيل: <bdi>{{phone() || 'أدخل رقم توصيل صالحاً واختر دولته أولاً'}}</bdi></p>
      <p role="status">{{accountStatus()}}</p>
      @if (savedMatches()) { <p>موافقتك المحفوظة صالحة لهذا الرقم. حدّد الخيار أعلاه لتسجيل موافقتك لهذا الطلب.</p> }
      <small>يمكنك إتمام الطلب دون تفعيل الإشعارات. إرسال الفاتورة مشروط بتأكيد الدفع.</small>
    </section>
  `,
  styles: [`section{margin-top:20px;padding-top:18px;border-top:1px solid #e7dfd4}h3{font-weight:700;margin-bottom:12px}label{display:flex;gap:10px;align-items:flex-start;line-height:1.8}input{margin-top:7px;accent-color:#9c7545;flex-shrink:0}p,small{display:block;margin-top:10px;font-size:.85rem;color:#665e54}bdi{font-weight:600}`],
})
export class WhatsAppCheckoutComponent implements OnInit {
  private api = inject(WhatsAppService); private auth = inject(ServiceAuth);
  phone = input<string | null>(null); optInChange = output<boolean>(); checked = signal(false);
  preference = signal<WhatsAppPreference | null>(null); accountStatus = signal('لا توجد موافقة حساب محمّلة.');
  constructor() { effect(() => { this.phone(); this.checked.set(false); this.optInChange.emit(false); }); }
  ngOnInit() {
    if (!this.auth.isAuthenticated) return;
    this.api.getPreferences().subscribe({ next: value => {
      this.preference.set(value);
      this.accountStatus.set(value.enabled && value.phoneNumberConfirmed && value.consentAtUtc
        ? `إشعارات الحساب مفعّلة للرقم ${value.phoneNumber}` : 'إشعارات واتساب غير مفعّلة في حسابك.');
    }, error: () => this.accountStatus.set('تعذر تحميل تفضيلات الحساب؛ يمكنك الموافقة لهذا الطلب من الخيار أعلاه.') });
  }
  savedMatches() { const p = this.preference(); return !!p?.enabled && !!p.phoneNumberConfirmed && !!p.consentAtUtc
    && !p.revokedAtUtc && normalizePhone(p.phoneNumber) === this.phone(); }
  toggle(value: boolean) { this.checked.set(value && !!this.phone()); this.optInChange.emit(this.checked()); }
}
