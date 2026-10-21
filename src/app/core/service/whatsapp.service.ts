import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface WhatsAppPreference {
  enabled: boolean;
  phoneNumber: string | null;
  phoneNumberConfirmed: boolean;
  consentAtUtc: string | null;
  revokedAtUtc: string | null;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl.replace(/\/?$/, '/')}account/whatsapp`;
  getPreferences() {
    return this.http.get<WhatsAppPreference>(`${this.api}/preferences`, {
      transferCache: false, headers: { 'Cache-Control': 'no-store' },
    });
  }
  requestVerification(phoneNumber: string) {
    return this.http.post(`${this.api}/phone-verification`, { phoneNumber });
  }
  confirmVerification(phoneNumber: string, code: string) {
    return this.http.post<WhatsAppPreference>(`${this.api}/phone-verification/confirm`, { phoneNumber, code });
  }
  savePreferences(enabled: boolean, phoneNumber: string | null) {
    return this.http.put<WhatsAppPreference>(`${this.api}/preferences`, { enabled, phoneNumber });
  }
}
