import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ShippingAreaRate { city: string; fee: number; }
export interface ShippingSettings {
  currency: string;
  defaultFee: number;
  freeShippingThreshold: number | null;
  version: number;
  areas: ShippingAreaRate[];
}

@Injectable({ providedIn: 'root' })
export class ShippingService {
  private http = inject(HttpClient);
  private currentSettings = signal<ShippingSettings | null>(null);
  readonly settings = this.currentSettings.asReadonly();

  load() {
    return this.http.get<ShippingSettings>(`${environment.apiUrl}shipping`)
      .pipe(tap(settings => this.currentSettings.set(settings)));
  }

  loadAdmin() {
    return this.http.get<ShippingSettings>(`${environment.apiUrl}admin/shipping`);
  }

  save(settings: ShippingSettings) {
    return this.http.put<ShippingSettings>(`${environment.apiUrl}admin/shipping`, settings)
      .pipe(tap(saved => this.currentSettings.set(saved)));
  }

  calculateFee(subtotal: number, city?: string | null, freeShippingCoupon = false): number | null {
    const settings = this.settings();
    if (!settings) return null;
    if (freeShippingCoupon || (settings.freeShippingThreshold !== null
      && Math.round(subtotal * 1000) / 1000 >= settings.freeShippingThreshold)) return 0;
    const key = this.cityKey(city);
    return settings.areas.find(area => this.cityKey(area.city) === key)?.fee ?? settings.defaultFee;
  }

  offerText(language: 'ar' | 'en'): string | null {
    const threshold = this.settings()?.freeShippingThreshold;
    if (threshold === undefined || threshold === null) return null;
    if (threshold === 0) return language === 'ar' ? 'شحن مجاني لجميع الطلبات' : 'Free shipping on all orders';
    return language === 'ar' ? `شحن مجاني للطلبات بقيمة ${threshold} د.ك أو أكثر`
      : `Free shipping on orders of ${threshold} KWD or more`;
  }

  private cityKey(city?: string | null): string {
    return (city ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ').toUpperCase();
  }
}
