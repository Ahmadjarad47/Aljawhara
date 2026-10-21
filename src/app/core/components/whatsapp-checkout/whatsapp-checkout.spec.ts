import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { WhatsAppCheckoutComponent } from './whatsapp-checkout';
import { WhatsAppService } from '../../service/whatsapp.service';
import { ServiceAuth } from '../../../auth/service-auth';

describe('Checkout account consent display', () => {
  it('shows valid saved consent without checking the order checkbox and clears consent on recipient change', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: ServiceAuth, useValue: { isAuthenticated: true } },
      { provide: WhatsAppService, useValue: { getPreferences: () => of({ enabled: true, phoneNumber: '+4915112345678',
        phoneNumberConfirmed: true, consentAtUtc: '2026-10-21T12:00:00Z', revokedAtUtc: null }) } },
    ] });
    const fixture = TestBed.createComponent(WhatsAppCheckoutComponent);
    fixture.componentRef.setInput('phone', '+4915112345678'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.savedMatches()).toBeTrue();
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(checkbox.checked).toBeFalse(); checkbox.click(); await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBeTrue();
    fixture.componentRef.setInput('phone', '+96550000000'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBeFalse();
    expect(fixture.componentInstance.savedMatches()).toBeFalse(); fixture.destroy();
  });
});
