import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../../services/token.service';
import { MaintenanceService } from '../services/maintenance.service';
import { maintenanceAuthGuard, maintenanceGuard, maintenancePageGuard } from './maintenance.guard';

describe('Maintenance access', () => {
  let tokens: jasmine.SpyObj<TokenService>;
  let tokenChanges: BehaviorSubject<string | null>;
  let http: HttpTestingController;
  let service: MaintenanceService;
  let originalEnabled: boolean;
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    originalEnabled = environment.maintenance.enabled;
    environment.maintenance.enabled = true;
    tokenChanges = new BehaviorSubject<string | null>('token');
    tokens = jasmine.createSpyObj<TokenService>('TokenService', [
      'getToken', 'getUser', 'isAuthenticated', 'hasRole', 'getTokenObservable',
    ]);
    tokens.getToken.and.returnValue('token');
    tokens.getUser.and.returnValue(null);
    tokens.isAuthenticated.and.returnValue(true);
    tokens.hasRole.and.returnValue(false);
    tokens.getTokenObservable.and.returnValue(tokenChanges.asObservable());
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: TokenService, useValue: tokens },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MaintenanceService);
  });

  afterEach(() => {
    environment.maintenance.enabled = originalEnabled;
    http.verify();
  });

  it('keeps the store available when maintenance is disabled', async () => {
    environment.maintenance.enabled = false;
    expect(await firstValueFrom(service.checkAccess())).toBeTrue();
    expect(service.blocked()).toBeFalse();
  });

  it('blocks guests and expired sessions without requesting an admin check', async () => {
    tokens.isAuthenticated.and.returnValue(false);
    expect(await firstValueFrom(service.checkAccess())).toBeFalse();
    expect(service.blocked()).toBeTrue();
    http.expectNone(`${environment.apiUrl}Auth/isAdmin`);
  });

  it('opens the store for an Admin only after the API approves access', async () => {
    const result = firstValueFrom(service.checkAccess());
    expect(service.blocked()).toBeTrue();
    const request = http.expectOne(`${environment.apiUrl}Auth/isAdmin`);
    expect(request.request.transferCache).toBeFalse();
    request.flush({ isAdmin: true });
    expect(await result).toBeTrue();
    expect(service.blocked()).toBeFalse();
  });

  it('validates a Super Admin JWT through the authenticated API', async () => {
    tokens.hasRole.and.callFake(role => role === 'SuperAdmin');
    const result = firstValueFrom(service.checkAccess());
    const request = http.expectOne(`${environment.apiUrl}Auth/isAuth`);
    expect(request.request.transferCache).toBeFalse();
    request.flush(null);
    expect(await result).toBeTrue();
    expect(service.blocked()).toBeFalse();
    http.expectNone(`${environment.apiUrl}Auth/isAdmin`);
  });

  it('rejects a Super Admin claim if the API rejects the JWT', async () => {
    tokens.hasRole.and.returnValue(true);
    const result = firstValueFrom(service.checkAccess());
    http.expectOne(`${environment.apiUrl}Auth/isAuth`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBeFalse();
    expect(service.blocked()).toBeTrue();
  });

  it('blocks an ordinary user even when they have an authenticated session', async () => {
    const result = firstValueFrom(service.checkAccess());
    http.expectOne(`${environment.apiUrl}Auth/isAdmin`).flush({ isAdmin: false });
    expect(await result).toBeFalse();
    expect(service.blocked()).toBeTrue();
  });

  it('fails closed when verification is unavailable', async () => {
    const result = firstValueFrom(service.checkAccess());
    http.expectOne(`${environment.apiUrl}Auth/isAdmin`).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(await result).toBeFalse();
  });

  it('does not grant access if the session changes during verification', async () => {
    const result = firstValueFrom(service.checkAccess());
    tokens.getToken.and.returnValue('different-token');
    http.expectOne(`${environment.apiUrl}Auth/isAdmin`).flush({ isAdmin: true });
    expect(await result).toBeFalse();
  });

  it('redirects blocked deep links to maintenance', async () => {
    tokens.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => maintenanceGuard(route, state));
    const decision = await firstValueFrom(result as Observable<UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(decision)).toBe('/maintenance');
  });

  it('keeps login and recovery reachable, while blocking registration', async () => {
    for (const path of ['login', 'forgot-password', 'reset-password', 'verify']) {
      const authRoute = { routeConfig: { path } } as ActivatedRouteSnapshot;
      expect(TestBed.runInInjectionContext(() => maintenanceAuthGuard(authRoute, state))).toBeTrue();
    }
    tokens.isAuthenticated.and.returnValue(false);
    const register = { routeConfig: { path: 'register' } } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => maintenanceAuthGuard(register, state));
    const decision = await firstValueFrom(result as Observable<UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(decision)).toBe('/maintenance');
  });

  it('returns an approved administrator from maintenance to the store', async () => {
    const result = TestBed.runInInjectionContext(() => maintenancePageGuard(route, state));
    const decision = firstValueFrom(result as Observable<UrlTree>);
    http.expectOne(`${environment.apiUrl}Auth/isAdmin`).flush({ isAdmin: true });
    expect(TestBed.inject(Router).serializeUrl(await decision)).toBe('/');
  });

  it('closes access on logout, including when the current page is the home page', async () => {
    const result = firstValueFrom(service.checkAccess());
    http.expectOne(`${environment.apiUrl}Auth/isAdmin`).flush({ isAdmin: true });
    await result;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    tokenChanges.next(null);
    expect(service.blocked()).toBeTrue();
    expect(navigate).toHaveBeenCalledWith(['/maintenance']);
  });
});
