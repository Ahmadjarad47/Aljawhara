import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WhatsAppPreferencesComponent } from './whatsapp-preferences';
import { environment } from '../../../../environments/environment';

const api = `${environment.apiUrl.replace(/\/?$/, '/')}account/whatsapp`;
describe('WhatsApp account preferences', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('verifies a German local number before saving explicit consent, and revokes without requiring a valid edited number', async () => {
    const component = TestBed.runInInjectionContext(() => new WhatsAppPreferencesComponent());
    const load = component.load();
    const get = http.expectOne(`${api}/preferences`);
    expect(get.request.headers.get('Cache-Control')).toBe('no-store');
    expect(get.request.transferCache).toBeFalse();
    get.flush({ enabled: false, phoneNumber: null, phoneNumberConfirmed: false, consentAtUtc: null });
    await load;
    component.editCountry('DE'); component.editPhone('015112345678');
    component.enabled = true;
    await component.save(); http.expectNone(`${api}/preferences`);
    component.enabled = false;
    const send = component.sendCode();
    const request = http.expectOne(`${api}/phone-verification`);
    expect(request.request.body).toEqual({ phoneNumber: '+4915112345678' });
    request.flush({ message: 'accepted' }); await send;
    component.code = '123456';
    const confirm = component.confirmCode();
    const confirmation = http.expectOne(`${api}/phone-verification/confirm`);
    expect(confirmation.request.body).toEqual({ phoneNumber: '+4915112345678', code: '123456' });
    confirmation.flush({ enabled: false, phoneNumber: '+4915112345678', phoneNumberConfirmed: true, consentAtUtc: null }); await confirm;
    expect(component.verified()).toBeTrue(); expect(component.enabled).toBeFalse();
    component.enabled = true;
    const save = component.save();
    const put = http.expectOne(`${api}/preferences`);
    expect(put.request.body).toEqual({ enabled: true, phoneNumber: '+4915112345678' });
    put.flush({ enabled: true, phoneNumber: '+4915112345678', phoneNumberConfirmed: true, consentAtUtc: '2026-10-21T12:00:00Z' }); await save;
    component.editPhone('123'); expect(component.verified()).toBeFalse(); expect(component.enabled).toBeFalse();
    const revoke = component.revoke();
    const revoked = http.expectOne(`${api}/preferences`);
    expect(revoked.request.body).toEqual({ enabled: false, phoneNumber: null });
    revoked.flush({ enabled: false, phoneNumber: '+4915112345678', phoneNumberConfirmed: true, consentAtUtc: null }); await revoke;
  });
});
