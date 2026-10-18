import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ShippingService, ShippingSettings } from '../../core/service/shipping.service';

@Component({
  selector: 'app-admin-shipping',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './shipping.html',
})
export class Shipping implements OnInit {
  private shipping = inject(ShippingService);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal(false);
  settings: ShippingSettings | null = null;
  freeShippingEnabled = true;
  private previousThreshold: number | null = null;

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.success.set(false);
    try {
      this.settings = await firstValueFrom(this.shipping.loadAdmin());
      this.freeShippingEnabled = this.settings.freeShippingThreshold !== null;
      this.previousThreshold = this.settings.freeShippingThreshold;
    } catch {
      this.error.set('تعذر تحميل إعدادات الشحن. أعد المحاولة.');
    } finally { this.loading.set(false); }
  }

  toggleFreeShipping(enabled: boolean): void {
    this.freeShippingEnabled = enabled;
    if (this.settings) {
      if (!enabled) this.previousThreshold = this.settings.freeShippingThreshold;
      this.settings.freeShippingThreshold = enabled ? this.previousThreshold : null;
    }
    this.success.set(false);
  }

  addArea(): void {
    this.settings?.areas.push({ city: '', fee: this.settings.defaultFee });
    this.success.set(false);
  }

  removeArea(index: number): void {
    this.settings?.areas.splice(index, 1);
    this.success.set(false);
  }

  async save(form: NgForm): Promise<void> {
    if (!this.settings || form.invalid || this.saving()) return;
    this.error.set('');
    this.success.set(false);
    const keys = this.settings.areas.map(area => area.city.normalize('NFC').trim().replace(/\s+/gu, ' ').toUpperCase());
    if (keys.some(key => !key) || new Set(keys).size !== keys.length) {
      this.error.set('أدخل أسماء مناطق غير فارغة وغير مكررة.');
      return;
    }
    this.saving.set(true);
    try {
      this.settings = await firstValueFrom(this.shipping.save({ ...this.settings,
        freeShippingThreshold: this.freeShippingEnabled ? this.settings.freeShippingThreshold : null,
      }));
      this.success.set(true);
      form.form.markAsPristine();
    } catch (error: any) {
      this.error.set(error.status === 409 ? 'عدّل مسؤول آخر الإعدادات. أعد تحميلها قبل الحفظ.'
        : error.status === 400 ? 'تحقق من القيم: الأسعار بين 0 و1,000,000 د.ك، وبحد أقصى ثلاث خانات عشرية.'
        : 'تعذر حفظ إعدادات الشحن. أعد المحاولة.');
    } finally { this.saving.set(false); }
  }
}
