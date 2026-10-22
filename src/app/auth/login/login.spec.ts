import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { ApiResponseDto, LoginResponseDto } from '../auth.models';
import { ServiceAuth } from '../service-auth';
import { ToastService } from '../../services/toast.service';
import { LoginComponent } from './login';

@Component({ standalone: true, template: '' })
class DestinationComponent {}

describe('Login return URL', () => {
  let response: Subject<ApiResponseDto<LoginResponseDto>>;
  let auth: jasmine.SpyObj<ServiceAuth>;
  let router: Router;
  let login: LoginComponent;
  let harness: RouterTestingHarness;
  const success: ApiResponseDto<LoginResponseDto> = {
    success: true,
    message: 'Signed in',
    data: {
      token: 'token', refreshToken: 'refresh-token', expiresAt: '2099-01-01T00:00:00Z',
      user: {
        id: '1', username: 'customer', email: 'customer@example.com', phoneNumber: '',
        emailConfirmed: true, isActive: true, createdAt: '2026-01-01T00:00:00Z',
      },
    },
  };

  beforeEach(() => {
    response = new Subject<ApiResponseDto<LoginResponseDto>>();
    auth = jasmine.createSpyObj<ServiceAuth>('ServiceAuth', ['login']);
    auth.login.and.returnValue(response);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'auth/login', component: LoginComponent },
          { path: 'checkout', component: DestinationComponent },
          { path: 'user/orders', component: DestinationComponent },
          { path: '', pathMatch: 'full', component: DestinationComponent },
        ]),
        { provide: ServiceAuth, useValue: auth },
        { provide: ToastService, useValue: {
          success: jasmine.createSpy('success'), error: jasmine.createSpy('error'),
        } },
      ],
    });
    // Isolate routing and submission from the toast UI and language polling.
    TestBed.overrideComponent(LoginComponent, { set: { template: '' } });
    spyOn(LoginComponent.prototype, 'ngOnInit');
    router = TestBed.inject(Router);
  });

  afterEach(() => response.complete());

  async function submit(returnUrl?: string): Promise<void> {
    const url = '/auth/login' + (returnUrl === undefined ? '' :
      `?returnUrl=${encodeURIComponent(returnUrl)}`);
    harness = await RouterTestingHarness.create();
    login = await harness.navigateByUrl(url, LoginComponent);
    login.loginForm.setValue({
      email: 'customer@example.com', password: 'password', rememberMe: false,
    });
    login.onSubmit();
  }

  async function finishLogin(): Promise<void> {
    response.next(success);
    await harness.fixture.whenStable();
  }

  it('returns to checkout from the encoded URL shown on the login page', async () => {
    await submit('/checkout');
    await finishLogin();
    expect(router.url).toBe('/checkout');
  });

  it('preserves the destination query string and fragment', async () => {
    await submit('/checkout?coupon=SAVE%2020&payment=card#payment');
    await finishLogin();
    expect(router.url).toBe('/checkout?coupon=SAVE%2020&payment=card#payment');
  });

  it('supports other protected page destinations', async () => {
    await submit('/user/orders');
    await finishLogin();
    expect(router.url).toBe('/user/orders');
  });

  for (const returnUrl of [undefined, '', 'checkout', 'https://example.com', '//example.com', '/\\example.com']) {
    it(`falls back to home for ${JSON.stringify(returnUrl)}`, async () => {
      await submit(returnUrl);
      await finishLogin();
      expect(router.url).toBe('/');
    });
  }

  it('waits for successful authentication before navigating', async () => {
    await submit('/checkout');
    expect(login.isLoading()).toBeTrue();
    expect(router.url).toBe('/auth/login?returnUrl=%2Fcheckout');
    response.next({ success: false, message: 'Invalid login attempt' });
    await harness.fixture.whenStable();
    expect(login.isLoading()).toBeFalse();
    expect(router.url).toBe('/auth/login?returnUrl=%2Fcheckout');
  });
});
