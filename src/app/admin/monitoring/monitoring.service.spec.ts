import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ServiceAuth } from '../../auth/service-auth';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { TokenService } from '../../services/token.service';
import { MonitoringService } from './monitoring.service';

describe('Monitoring API authentication and cache policy', () => {
  let http: HttpTestingController;
  let service: MonitoringService;
  const api = `${environment.apiUrl}admin/monitoring`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(), provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: TokenService, useValue: { getToken: () => 'admin-token', isTokenExpired: () => false } },
      { provide: ServiceAuth, useValue: {} },
    ] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MonitoringService);
  });
  afterEach(() => http.verify());

  it('uses the existing Admin session, bypasses browser/SSR caches and does not replay completed data', () => {
    const retained = service.getSummary();
    for (let i = 0; i < 2; i++) {
      retained.subscribe();
      const request = http.expectOne(`${api}/summary`);
      expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
      expect(request.request.headers.get('Cache-Control')).toBe('no-store');
      expect(request.request.cache).toBe('no-store');
      expect(request.request.transferCache).toBeFalse();
      expect(request.request.timeout).toBe(12000);
      request.flush({ requests: i });
    }
  });

  it('omits empty filters and encodes trace/search values safely', () => {
    service.getLogs({ search: 'order & payment', traceId: 'id/+?=', level: '', category: '', from: '', to: '' }, 2, 100).subscribe();
    const request = http.expectOne(r => r.url === `${api}/logs`);
    expect(request.request.params.get('search')).toBe('order & payment');
    expect(request.request.params.get('traceId')).toBe('id/+?=');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('100');
    expect(request.request.params.has('level')).toBeFalse();
    expect(request.request.headers.get('Cache-Control')).toBe('no-store');
    request.flush({ items: [] });
  });
});
