import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Dashboard } from '../dashboard/dashboard';
import { Monitoring } from './monitoring';
import { MonitoringLogs, MonitoringSummary } from './monitoring.models';

const api = `${environment.apiUrl}admin/monitoring`;
const summary: MonitoringSummary = {
  timestamp: '2026-10-19T09:00:00Z', startedAt: '2026-10-19T07:00:00Z',
  uptimeSeconds: 7200, windowMinutes: 60, requests: 120, serverErrors: 2, clientErrors: 4,
  errorRatePercent: 1.67, averageMs: 25, p95UpperBoundMs: 100, workingSetMb: 64,
  health: { status: 'Healthy', checkedAt: '2026-10-19T08:59:50Z',
    checks: [{ name: 'database', status: 'Healthy', durationMs: 3 }] },
  series: [{ timestamp: '2026-10-19T09:00:00Z', requests: 120, errors: 2, clientErrors: 4, averageMs: 25 }],
  jobs: [{ name: 'Payment verification', status: 'Stale', lastRun: '2026-10-19T08:00:00Z',
    lastSuccess: null, staleAfterSeconds: 60 }],
  logging: { droppedEvents: 3, persistenceError: 'Storage unavailable', recentEventLimit: 5000, retentionDays: 14 },
};
const logs: MonitoringLogs = {
  items: [{ id: '1', timestamp: summary.timestamp, level: 'Error', category: 'Request',
    message: '<img src=x onerror=alert(1)>', traceId: 'trace-1', userId: '7',
    exceptionType: 'TestException', properties: { StatusCode: '500' } }],
  totalCount: 101, page: 1, pageSize: 50, retainedCount: 101, recentEventLimit: 5000,
  oldestAvailableAt: summary.timestamp,
};

describe('Admin monitoring dashboard', () => {
  let fixture: ComponentFixture<Monitoring>;
  let component: Monitoring;
  let http: HttpTestingController;
  let hidden: jasmine.Spy;
  const language = signal<'ar' | 'en'>('ar');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Monitoring], providers: [
      provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
      { provide: Dashboard, useValue: { currentLanguage: language } },
    ] });
    language.set('ar');
    hidden = spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Monitoring);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
  });

  function start() {
    fixture.detectChanges();
    http.expectOne(`${api}/summary`).flush(summary);
    http.expectOne(r => r.url === `${api}/logs`).flush(logs);
    fixture.detectChanges();
  }

  it('renders actual health, jobs, storage failures, metrics and escaped log content in both languages', () => {
    start();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('مراقبة النظام');
    expect(element.textContent).toContain('تأخر التحديث');
    expect(element.textContent).toContain('تعذّر حفظ السجلات');
    expect(element.textContent).toContain('120');
    expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelectorAll('canvas').length).toBe(2);
    language.set('en');
    fixture.detectChanges();
    expect(element.querySelector('h1')?.textContent).toContain('System monitoring');
    expect(element.querySelector('section')?.dir).toBe('ltr');
    expect(element.textContent).toContain('Stale heartbeat');
  });

  it('converts all submitted filters to API parameters, including local dates to UTC, and resets pagination', () => {
    start();
    component.filters = { search: '  failed  ', category: ' Database ', level: 'Error', traceId: ' t1 ',
      from: '2026-10-18T10:00', to: '2026-10-19T11:00' };
    component.applyFilters();
    const request = http.expectOne(r => r.url === `${api}/logs`);
    expect(request.request.params.get('search')).toBe('failed');
    expect(request.request.params.get('category')).toBe('Database');
    expect(request.request.params.get('level')).toBe('Error');
    expect(request.request.params.get('traceId')).toBe('t1');
    expect(request.request.params.get('from')).toBe(new Date('2026-10-18T10:00').toISOString());
    expect(request.request.params.get('to')).toBe(new Date('2026-10-19T11:00').toISOString());
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ ...logs, items: [], totalCount: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لا توجد أحداث تطابق');
  });

  it('rejects invalid date ranges without issuing a request', () => {
    start();
    component.filters.from = '2026-10-19T11:00';
    component.filters.to = '2026-10-18T11:00';
    component.applyFilters();
    expect(component.validationError()).toBeTrue();
    http.expectNone(r => r.url === `${api}/logs`);
  });

  it('uses applied filters when refreshing while the form contains unsubmitted edits', () => {
    start();
    component.filters.search = 'unsubmitted';
    component.refresh();
    http.expectOne(`${api}/summary`).flush(summary);
    const request = http.expectOne(r => r.url === `${api}/logs`);
    expect(request.request.params.has('search')).toBeFalse();
    request.flush(logs);
  });

  it('cancels old log requests so their responses cannot overwrite newer filter results', () => {
    start();
    component.filters.search = 'first';
    component.applyFilters();
    const old = http.expectOne(r => r.url === `${api}/logs`);
    component.filters.search = 'second';
    component.applyFilters();
    expect(old.cancelled).toBeTrue();
    const current = http.expectOne(r => r.url === `${api}/logs`);
    expect(current.request.params.get('search')).toBe('second');
    current.flush({ ...logs, totalCount: 0, items: [] });
    expect(component.logs()?.items.length).toBe(0);
  });

  it('clicking a trace follows the whole request and clears unrelated filters', () => {
    start();
    component.filters.level = 'Error';
    component.filters.category = 'Database';
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.trace-button');
    button.click();
    const request = http.expectOne(r => r.url === `${api}/logs`);
    expect(request.request.params.get('traceId')).toBe('trace-1');
    expect(request.request.params.has('category')).toBeFalse();
    expect(request.request.params.has('level')).toBeFalse();
    request.flush(logs);
  });

  it('paginates on the server and changes page size from page one', () => {
    start();
    component.changePage(2);
    const second = http.expectOne(r => r.url === `${api}/logs`);
    expect(second.request.params.get('page')).toBe('2');
    second.flush({ ...logs, page: 2 });
    component.changePageSize(100);
    const resized = http.expectOne(r => r.url === `${api}/logs`);
    expect(resized.request.params.get('pageSize')).toBe('100');
    expect(resized.request.params.get('page')).toBe('1');
    resized.flush({ ...logs, pageSize: 100 });
    expect(component.totalPages()).toBe(2);
  });

  it('recovers to the last available page when retention cleanup shrinks the result set', () => {
    start();
    component.changePage(3);
    http.expectOne(r => r.url === `${api}/logs`).flush({ ...logs, items: [], page: 3, totalCount: 40 });
    const recovered = http.expectOne(r => r.url === `${api}/logs`);
    expect(recovered.request.params.get('page')).toBe('1');
    recovered.flush({ ...logs, totalCount: 40 });
    expect(component.page()).toBe(1);
  });

  it('keeps successful summary updates independent from log failures', () => {
    start();
    component.refresh();
    http.expectOne(`${api}/summary`).flush({ ...summary, requests: 130 });
    http.expectOne(r => r.url === `${api}/logs`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.summary()?.requests).toBe(130);
    expect(component.logs()?.items.length).toBe(1);
    expect(component.logsError()).toBe('load');
    expect(component.summaryError()).toBe('');
    expect(component.logsLoading()).toBeFalse();
  });

  it('keeps the last successful summary with a stale-data warning after a refresh failure', () => {
    start();
    component.refresh();
    http.expectOne(`${api}/summary`).flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne(r => r.url === `${api}/logs`).flush(logs);
    fixture.detectChanges();
    expect(component.summary()).toEqual(summary);
    expect(fixture.nativeElement.textContent).toContain('قد تكون قديمة');
  });

  for (const status of [401, 403]) {
    it(`clears sensitive data, cancels other requests and stops refreshing after ${status}`, () => {
      start();
      component.refresh();
      const pending = http.expectOne(`${api}/summary`);
      http.expectOne(r => r.url === `${api}/logs`).flush({}, { status, statusText: 'Denied' });
      expect(pending.cancelled).toBeTrue();
      expect(component.summary()).toBeNull();
      expect(component.logs()).toBeNull();
      expect(component.autoRefresh()).toBeFalse();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.logs-panel')).toBeNull();
      component.refresh();
      http.expectNone(r => r.url.startsWith(api));
    });
  }

  it('shows unknown health for stale checks and never mislabels missing P95 as zero', () => {
    start();
    component.summary.set({ ...summary, p95UpperBoundMs: null,
      health: { ...summary.health, checkedAt: '2026-10-19T08:00:00Z' } });
    fixture.detectChanges();
    expect(component.healthStatus()).toBe('Unknown');
    expect(fixture.nativeElement.textContent).toContain('أكثر من 30 ثانية');
    component.summary.set({ ...summary, requests: 0, p95UpperBoundMs: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لا توجد طلبات في هذه الفترة');
  });

  it('polls every 15 seconds only when visible and enabled, avoids overlapping requests and cleans up', () => {
    jasmine.clock().install();
    try {
      start();
      jasmine.clock().tick(15000);
      const pendingSummary = http.expectOne(`${api}/summary`);
      const pendingLogs = http.expectOne(r => r.url === `${api}/logs`);
      expect(component.summaryLoading()).toBeTrue();
      expect(component.logsLoading()).toBeTrue();
      jasmine.clock().tick(15000);
      http.expectNone(r => r.url.startsWith(api));
      pendingSummary.flush(summary);
      pendingLogs.flush(logs);
      hidden.and.returnValue(true);
      jasmine.clock().tick(15000);
      http.expectNone(r => r.url.startsWith(api));
      hidden.and.returnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      http.expectOne(`${api}/summary`).flush(summary);
      http.expectOne(r => r.url === `${api}/logs`).flush(logs);
      component.toggleAutoRefresh();
      jasmine.clock().tick(30000);
      http.expectNone(r => r.url.startsWith(api));
      fixture.destroy();
      document.dispatchEvent(new Event('visibilitychange'));
      jasmine.clock().tick(30000);
      http.expectNone(r => r.url.startsWith(api));
    } finally { jasmine.clock().uninstall(); }
  });

  for (const width of [390, 1440]) {
    it(`keeps the rendered ${width}px layout within the viewport and scrolls the log table locally`, async () => {
      start();
      const frame = document.createElement('iframe');
      frame.style.cssText = `width:${width}px;height:900px;border:0;position:absolute;left:0;top:0`;
      document.body.append(frame);
      try {
        const doc = frame.contentDocument!;
        doc.body.style.margin = '0';
        const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'));
        await Promise.all(styles.map(source => new Promise<void>((resolve, reject) => {
          const clone = source.cloneNode(true) as HTMLElement;
          if (clone instanceof HTMLLinkElement) {
            clone.onload = () => resolve();
            clone.onerror = () => reject(new Error('Unable to load layout test styles'));
          }
          doc.head.append(clone);
          if (!(clone instanceof HTMLLinkElement)) resolve();
        })));
        doc.body.append(fixture.nativeElement);
        // Allow Chart.js ResizeObserver to redraw in the new viewport.
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const element: HTMLElement = fixture.nativeElement;
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width + 1);
        const chartGrid = element.querySelector('.chart-grid')!;
        const columns = frame.contentWindow!.getComputedStyle(chartGrid).gridTemplateColumns.split(' ');
        expect(columns.length).toBe(width === 390 ? 1 : 2);
        const logTable = element.querySelector('.logs-table')!;
        if (width === 390) expect(logTable.scrollWidth).toBeGreaterThan(logTable.clientWidth);
        expect(element.querySelectorAll('canvas').length).toBe(2);
      } finally {
        document.body.append(fixture.nativeElement);
        frame.remove();
      }
    });
  }
});
