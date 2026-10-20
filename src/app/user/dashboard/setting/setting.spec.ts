import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Setting } from './setting';
import { environment } from '../../../../environments/environment.development';
import { UserAddressDto } from './setting.models';

const addressUrl = `${environment.apiUrl}Auth/addresses`;

describe('Account address forms', () => {
  let fixture: ComponentFixture<Setting>;
  let settings: Setting;
  let http: HttpTestingController;
  let originalLanguage: string | null;
  const savedAddress: UserAddressDto = {
    id: 7, fullName: 'بدر', phoneNumber: '67070814', addressLine1: 'Street 45, Building 23',
    isDefault: true, city: null, state: null, country: null, postalCode: null,
    alQataa: '8', alSharee: '809', alJada: '16', alManzil: '16', alDor: '2', alShakka: '5',
    createdAt: '', updatedAt: '',
  };

  beforeEach(async () => {
    originalLanguage = localStorage.getItem('language');
    localStorage.setItem('language', 'ar');
    TestBed.configureTestingModule({
      imports: [Setting],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Setting);
    settings = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}Auth/me`).flush({ success: true, data: null });
    http.expectOne(addressUrl).flush({ success: true, data: [] });
    settings.activeTab.set('addresses');
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    if (originalLanguage === null) localStorage.removeItem('language');
    else localStorage.setItem('language', originalLanguage);
  });

  async function fill(id: string, value: string): Promise<void> {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('creates addresses with the same nine fields as checkout and only three required', async () => {
    settings.openAddAddress();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.address-editor input[type="text"], .address-editor input:not([type]), .address-editor input[type="tel"]').length).toBe(9);
    expect(fixture.nativeElement.querySelectorAll('.address-editor input[required]').length).toBe(3);
    for (const key of ['city', 'state', 'country', 'postalCode', 'addressLine2']) {
      expect(fixture.nativeElement.querySelector(`.address-editor [name="${key}"]`)).toBeNull();
    }
    await fill('account-fullName', 'بدر');
    await fill('account-phoneNumber', '67070814');
    await fill('account-addressLine1', 'عنوان التوصيل');
    const save = fixture.nativeElement.querySelector('.address-save') as HTMLButtonElement;
    expect(save.disabled).toBeFalse();
    save.click();
    await fixture.whenStable();
    const request = http.expectOne(addressUrl);
    expect(request.request.method).toBe('POST');
    const body = JSON.parse(JSON.stringify(request.request.body));
    expect(body.phoneNumber).toBe('67070814');
    expect(body.addressLine1).toBe('عنوان التوصيل');
    expect(body.city).toBeNull();
    expect(body.country).toBeUndefined();
    expect(body.postalCode).toBeUndefined();
    request.flush({ success: true });
    http.expectOne(addressUrl).flush({ success: true, data: [savedAddress] });
    await fixture.whenStable();
    expect(settings.showAddAddress()).toBeFalse();
  });

  it('prefills an old address and saves a searchable combined location with all optional details', async () => {
    settings.openEditAddress(savedAddress);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#account-addressLine1') as HTMLInputElement).value).toBe(savedAddress.addressLine1);
    for (const field of settings.optionalFields) {
      expect((fixture.nativeElement.querySelector(`#account-${field.key}`) as HTMLInputElement).value).toBe(savedAddress[field.key]!);
    }
    await fill('account-addressLine1', 'الخيران');
    (fixture.nativeElement.querySelector('[role="option"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.address-save') as HTMLButtonElement).click();
    await fixture.whenStable();
    const request = http.expectOne(addressUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.id).toBe(7);
    expect(request.request.body.addressLine1).toBe('محافظة الأحمدي — الخيران');
    expect(request.request.body.city).toBe('الخيران');
    expect(request.request.body.state).toBe('محافظة الأحمدي');
    expect(request.request.body.alSharee).toBe('809');
    request.flush({ success: false, message: 'Rejected' });
    await fixture.whenStable();
    expect(settings.showEditAddress()).toBeTrue();
    expect(settings.isSavingAddress()).toBeFalse();
  });

  it('rejects blank required fields and invalid mobile numbers consistently', async () => {
    settings.openAddAddress();
    await fixture.whenStable();
    await fill('account-fullName', '   ');
    await fill('account-phoneNumber', 'abc');
    await fill('account-addressLine1', 'عنوان');
    settings.addAddress();
    http.expectNone(addressUrl);
    expect((fixture.nativeElement.querySelector('.address-save') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('prevents duplicate profile submissions and restores the form after a rejected update', async () => {
    settings.currentUser.set({ id: 'demo', username: 'Customer', email: 'demo@example.com',
      phoneNumber: '123456789', createdAt: '2026-10-20', emailConfirmed: true, isActive: true });
    settings.activeTab.set('profile');
    settings.updateUsernameModel.username = 'Updated customer';
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.profile-save') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(settings.isSavingUsername()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#settings-username') as HTMLInputElement).closest('fieldset')!.disabled).toBeTrue();
    settings.onUpdateUsername();
    const request = http.expectOne(`${environment.apiUrl}Auth/me/username`);
    expect(request.request.body.username).toBe('Updated customer');
    request.flush({ success: false, message: 'Rejected' });
    await fixture.whenStable();
    expect(settings.isSavingUsername()).toBeFalse();
    expect((fixture.nativeElement.querySelector('#settings-username') as HTMLInputElement).value).toBe('Updated customer');
  });
});
