import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { firstValueFrom } from 'rxjs';
import { PhoneInputComponent } from '../../phone/phone-input';
import { normalizePhone } from '../../phone/phone-number';
import { WhatsAppPreference, WhatsAppService } from '../../service/whatsapp.service';

@Component({
  selector: 'app-whatsapp-preferences', standalone: true, imports: [FormsModule, PhoneInputComponent],
  template: `
    <section class="whatsapp-settings" dir="rtl" aria-labelledby="whatsapp-settings-title">
      <h2 id="whatsapp-settings-title">إشعارات واتساب</h2>
      @if (loading()) { <p role="status">جارٍ تحميل التفضيلات...</p> }
      @else if (!loaded()) { <button type="button" class="btn btn-outline" (click)="load()">إعادة تحميل التفضيلات</button> }
      @else {
        <fieldset [disabled]="busy()">
          <label class="opt-in"><input type="checkbox" class="toggle toggle-sm" role="switch" [(ngModel)]="enabled" [ngModelOptions]="{standalone:true}" /> استلام فواتير وإشعارات طلباتي عبر واتساب</label>
          <app-phone-input [value]="phone" (valueChange)="editPhone($event)" [country]="country" (countryChange)="editCountry($event)" [disabled]="busy()" />
          <p role="status">{{verified() ? 'تم التحقق من الرقم' : 'الرقم غير متحقق منه؛ تحقق منه قبل تفعيل الإشعارات.'}}</p>
          <p class="hint">تأكيد الرقم يحدّث رقم الهاتف المسجّل في حسابك. تغيير الرقم يلغي الموافقة السابقة ويتطلب تحققاً وموافقة جديدة.</p>
          <div class="actions">
            <button type="button" class="btn btn-outline" [disabled]="!normalized() || busy()" (click)="sendCode()">إرسال رمز تحقق</button>
            @if (challengePhone && challengePhone === normalized()) {
              <label>رمز التحقق<input type="text" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [(ngModel)]="code" [ngModelOptions]="{standalone:true}" /></label>
              <button type="button" class="btn btn-outline" [disabled]="!validCode() || busy()" (click)="confirmCode()">تأكيد الرمز</button>
            }
            <button type="button" class="btn btn-primary" [disabled]="busy() || (enabled && !verified())" (click)="save()">حفظ</button>
            <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="revoke()">إلغاء الموافقة</button>
          </div>
        </fieldset>
      }
      @if (message()) { <p role="status">{{message()}}</p> }
      @if (error()) { <p class="error" role="alert">{{error()}}</p> }
    </section>
  `,
  styles: [`:host{display:block;margin-top:24px}.whatsapp-settings{padding:24px;border:1px solid #e7dfd4;border-radius:16px;background:var(--color-base-100,#fff)}h2{font-size:1.2rem;font-weight:700;margin-bottom:18px}fieldset{border:0;padding:0;min-width:0}.opt-in{display:flex;align-items:center;gap:10px;margin-bottom:18px}.actions{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-top:16px}.actions label{display:grid;gap:6px}.actions input{padding:10px;border:1px solid #d6d3d1;border-radius:8px;width:130px}p{margin-top:12px}.hint{font-size:.85rem;color:#6b6259}.error{color:#b42318}`],
})
export class WhatsAppPreferencesComponent implements OnInit {
  private api = inject(WhatsAppService);
  phoneVerified = output<void>();
  loading = signal(false); loaded = signal(false); busy = signal(false);
  error = signal(''); message = signal(''); preference: WhatsAppPreference | null = null;
  phone = ''; country: CountryCode = 'KW'; enabled = false; code = ''; challengePhone: string | null = null;
  ngOnInit() { void this.load(); }
  normalized() { return normalizePhone(this.phone, this.country); }
  verified() { return !!this.normalized() && this.preference?.phoneNumberConfirmed === true
    && normalizePhone(this.preference.phoneNumber) === this.normalized(); }
  validCode() { return /^[0-9]{6}$/.test(this.code); }
  private apply(value: WhatsAppPreference) {
    this.preference = value; this.phone = value.phoneNumber ?? ''; this.enabled = value.enabled;
    this.country = parsePhoneNumberFromString(this.phone)?.country ?? 'KW';
  }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.apply(await firstValueFrom(this.api.getPreferences())); this.loaded.set(true); }
    catch { this.error.set('تعذر تحميل تفضيلات واتساب. أعد المحاولة.'); }
    finally { this.loading.set(false); }
  }
  editPhone(phone: string) { this.phone = phone; this.edited(); }
  editCountry(country: CountryCode) { this.country = country; this.edited(); }
  private edited() {
    this.message.set(''); this.error.set('');
    if (!this.verified()) this.enabled = false;
    if (this.challengePhone !== this.normalized()) { this.challengePhone = null; this.code = ''; }
  }
  private async run(action: () => Promise<void>, failure: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { await action(); } catch { this.error.set(failure); }
    finally { this.busy.set(false); }
  }
  async sendCode() {
    const phone = this.normalized(); if (!phone) return;
    await this.run(async () => {
      // Revoke the old number before starting verification of a different number.
      if (this.preference?.enabled && normalizePhone(this.preference.phoneNumber) !== phone) {
        this.preference = await firstValueFrom(this.api.savePreferences(false, null));
        this.enabled = false;
      }
      await firstValueFrom(this.api.requestVerification(phone));
      this.challengePhone = phone; this.code = ''; this.message.set('تم قبول طلب إرسال رمز التحقق.');
    }, 'تعذر إرسال رمز التحقق. تحقق من الرقم وانتظر دقيقة قبل المحاولة مجدداً.');
  }
  async confirmCode() {
    const phone = this.normalized(); if (!phone || phone !== this.challengePhone || !this.validCode()) return;
    await this.run(async () => {
      this.apply(await firstValueFrom(this.api.confirmVerification(phone, this.code)));
      this.phoneVerified.emit();
      this.challengePhone = null; this.code = ''; this.message.set('تم التحقق من الرقم. اختر تفعيل الإشعارات ثم احفظ موافقتك.');
    }, 'رمز التحقق غير صحيح أو انتهت صلاحيته.');
  }
  async save() {
    if (this.enabled && !this.verified()) return;
    await this.run(async () => {
      this.apply(await firstValueFrom(this.api.savePreferences(this.enabled, this.enabled ? this.normalized() : null)));
      this.message.set('تم حفظ تفضيلات واتساب.');
    }, 'تعذر حفظ التفضيلات. أعد المحاولة.');
  }
  async revoke() { this.enabled = false; await this.save(); }
}
