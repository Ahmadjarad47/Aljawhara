import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';
import { formatPhoneInput, normalizePhone } from './phone-number';

@Component({
  selector: 'app-phone-input', standalone: true, imports: [FormsModule],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.css',
})
export class PhoneInputComponent {
  required = input(false);
  fieldId = input('whatsapp-phone');
  value = input(''); country = input<CountryCode>('KW'); disabled = input(false);
  label = input('رقم واتساب'); valueChange = output<string>(); countryChange = output<CountryCode>();
  private names = new Intl.DisplayNames(['ar'], { type: 'region' });
  private englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  isOpen = signal(false);
  query = signal('');
  activeIndex = signal(-1);
  countries = getCountries().map(code => {
    const name = this.names.of(code) ?? code;
    const callingCode = getCountryCallingCode(code);
    return {
      code, name, callingCode,
      flag: String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))),
      label: `${name} (+${callingCode})`,
      search: this.normalizeSearch(`${name} ${this.englishNames.of(code) ?? ''} ${code} ${callingCode}`),
    };
  }).sort((a, b) => a.code === 'KW' ? -1 : b.code === 'KW' ? 1 : a.name.localeCompare(b.name, 'ar'));
  selectedCountry = computed(() => this.countries.find(item => item.code === this.country())!);
  filteredCountries = computed(() => {
    const words = this.normalizeSearch(this.query()).split(/\s+/).filter(Boolean);
    return this.countries.filter(item => words.every(word => item.search.includes(word)));
  });

  private normalizeSearch(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/\+/g, '').trim();
  }

  open(): void {
    if (this.disabled()) return;
    this.query.set('');
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  toggle(): void {
    if (this.disabled()) return;
    if (this.isOpen()) this.close();
    else {
      this.host.nativeElement.querySelector<HTMLInputElement>('[role="combobox"]')?.focus();
      this.open();
    }
  }

  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(-1);
    this.isOpen.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key === 'Enter' && this.isOpen()) {
      event.preventDefault();
      const option = this.filteredCountries()[this.activeIndex()];
      if (option) this.selectCountry(option.code);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!this.isOpen()) this.open();
    const count = this.filteredCountries().length;
    if (!count) return;
    const current = this.activeIndex();
    this.activeIndex.set(event.key === 'ArrowDown'
      ? (current + 1) % count : (current <= 0 ? count - 1 : current - 1));
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="option"]')[this.activeIndex()]
      ?.scrollIntoView({ block: 'nearest' });
  }
  normalized() { return normalizePhone(this.value(), this.country()); }
  change(value: string) { this.valueChange.emit(formatPhoneInput(value, this.country())); }
  selectCountry(country: CountryCode) {
    if (this.disabled()) return;
    this.countryChange.emit(country);
    this.close();
  }
}
