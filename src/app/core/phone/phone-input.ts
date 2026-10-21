import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';
import { formatPhoneInput, normalizePhone } from './phone-number';

@Component({
  selector: 'app-phone-input', standalone: true, imports: [FormsModule],
  template: `
    <div class="phone-fields" dir="rtl">
      <label>الدولة ورمز الاتصال
        <select [ngModel]="country()" (ngModelChange)="selectCountry($event)" [disabled]="disabled()" [ngModelOptions]="{standalone: true}">
          @for (item of countries; track item.code) { <option [value]="item.code">{{item.label}}</option> }
        </select>
      </label>
      <label>{{label()}}
        <input [id]="fieldId()" type="tel" dir="ltr" inputmode="tel" autocomplete="tel" maxlength="40"
          [required]="required()" [ngModel]="value()" (ngModelChange)="change($event)" [disabled]="disabled()"
          [ngModelOptions]="{standalone: true}" [attr.aria-describedby]="fieldId() + '-hint'" [attr.aria-invalid]="value() && !normalized() ? true : null" />
      </label>
    </div>
    @if (normalized(); as phone) { <small [id]="fieldId() + '-hint'" dir="ltr" class="normalized">{{phone}}</small> }
    @else if (value()) { <small [id]="fieldId() + '-hint'" class="phone-error" role="alert">أدخل رقماً صالحاً للدولة المختارة، أو استخدم + أو 00 قبل رمز الدولة للرقم الدولي.</small> }
  `,
  styles: [`:host{display:block;min-width:0}.phone-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}label{display:grid;gap:7px;font-size:.875rem}input,select{width:100%;min-width:0;padding:12px;border:1px solid #d6d3d1;border-radius:10px;background:var(--color-base-100,#fff);color:inherit;font:inherit}input:focus-visible,select:focus-visible{outline:2px solid #b78850;outline-offset:2px}small{display:block;margin-top:8px}.normalized{color:#4b6655;text-align:right}.phone-error{color:#b42318}@media(max-width:480px){.phone-fields{grid-template-columns:1fr}}`],
})
export class PhoneInputComponent {
  required = input(false);
  fieldId = input('whatsapp-phone');
  value = input(''); country = input<CountryCode>('KW'); disabled = input(false);
  label = input('رقم واتساب'); valueChange = output<string>(); countryChange = output<CountryCode>();
  private names = new Intl.DisplayNames(['ar'], { type: 'region' });
  countries = getCountries().map(code => ({ code,
    label: `${String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0)))} ${this.names.of(code) ?? code} (+${getCountryCallingCode(code)})`,
  })).sort((a, b) => a.code === 'KW' ? -1 : b.code === 'KW' ? 1 : a.label.localeCompare(b.label, 'ar'));
  normalized() { return normalizePhone(this.value(), this.country()); }
  change(value: string) { this.valueChange.emit(formatPhoneInput(value, this.country())); }
  selectCountry(country: CountryCode) { this.countryChange.emit(country); }
}
