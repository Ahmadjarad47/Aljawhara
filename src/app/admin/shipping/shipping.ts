import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ShippingService, ShippingSettings } from '../../core/service/shipping.service';
import { KUWAIT_AREAS } from '../../core/data/kuwait-areas';

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
  newGovernorate = '';
  readonly governorateNames = Object.keys(KUWAIT_AREAS);

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.success.set(false);
    try {
      this.settings = await firstValueFrom(this.shipping.loadAdmin());
      this.freeShippingEnabled = this.settings.freeShippingThreshold !== null;
      this.previousThreshold = this.settings.freeShippingThreshold;
      this.newGovernorate = '';
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

  availableGovernorates(): string[] {
    return this.governorateNames.filter(state => !this.settings?.governorates
      .some(group => this.stateKey(group.state) === this.stateKey(state)));
  }

  areasForState(state: string): readonly string[] {
    const canonical = this.governorateNames.find(name => this.stateKey(name) === this.stateKey(state));
    return canonical ? KUWAIT_AREAS[canonical] : [];
  }

  addGovernorate(): void {
    if (!this.newGovernorate || !this.availableGovernorates().includes(this.newGovernorate)) return;
    this.settings?.governorates.push({ state: this.newGovernorate, areas: [] });
    this.newGovernorate = '';
    this.success.set(false);
  }

  removeGovernorate(index: number): void {
    this.settings?.governorates.splice(index, 1);
    this.success.set(false);
  }

  addArea(governorateIndex: number): void {
    if (!this.settings) return;
    this.settings.governorates[governorateIndex].areas.push({ city: '', fee: this.settings.defaultFee });
    this.success.set(false);
  }

  removeArea(governorateIndex: number, areaIndex: number): void {
    this.settings?.governorates[governorateIndex].areas.splice(areaIndex, 1);
    this.success.set(false);
  }

  moveArea(governorateIndex: number, areaIndex: number, state: string): void {
    if (!this.settings || !state) return;
    const source = this.settings.governorates[governorateIndex];
    const destination = this.settings.governorates.find(group => group.state === state);
    if (!destination || destination === source) return;
    const area = source.areas[areaIndex];
    if (destination.areas.some(item => this.cityKey(item.city) === this.cityKey(area.city))) {
      this.error.set('هذه المنطقة موجودة مسبقاً في المحافظة المختارة.');
      return;
    }
    destination.areas.push(area);
    source.areas.splice(areaIndex, 1);
    this.success.set(false);
  }

  async save(form: NgForm): Promise<void> {
    if (!this.settings || form.invalid || this.saving()) return;
    this.error.set('');
    this.success.set(false);
    const states = this.settings.governorates.map(group => this.stateKey(group.state));
    const invalidAreas = this.settings.governorates.some(group => {
      const keys = group.areas.map(area => this.cityKey(area.city));
      return keys.some(key => !key) || new Set(keys).size !== keys.length;
    });
    if (states.some(key => !key) || new Set(states).size !== states.length || invalidAreas) {
      this.error.set('أدخل محافظات غير مكررة، ومناطق غير فارغة وغير مكررة ضمن المحافظة نفسها.');
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

  private cityKey(value: string): string {
    return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toUpperCase();
  }

  private stateKey(value: string): string { return this.cityKey(value).replace(/^محافظة /u, ''); }
}
