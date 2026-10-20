import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { Transaction } from './transaction';

const api = environment.apiUrl.replace(/\/?$/, '/') + 'Transactions/my';
const result = { items: [], totalCount: 30, totalPages: 3, page: 1, pageSize: 10 };

describe('Transaction filters', () => {
  let fixture: ComponentFixture<Transaction>;
  let component: Transaction;
  let http: HttpTestingController;
  let originalLanguage: string | null;

  beforeEach(async () => {
    originalLanguage = localStorage.getItem('language');
    localStorage.setItem('language', 'ar');
    TestBed.configureTestingModule({
      imports: [Transaction],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Transaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
    http.expectOne(request => request.url === api).flush(result);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    if (originalLanguage === null) localStorage.removeItem('language');
    else localStorage.setItem('language', originalLanguage);
  });

  it('applies boolean refund filters and zero amounts only after form submission', async () => {
    for (const [index, expected] of [[1, 'true'], [2, 'false']] as const) {
      component.showFilters.set(true);
      await fixture.whenStable();
      const select = fixture.nativeElement.querySelector('#transaction-refunded') as HTMLSelectElement;
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const input = fixture.nativeElement.querySelector('#transaction-min-amount') as HTMLInputElement;
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
      http.expectNone(request => request.url === api);
      (fixture.nativeElement.querySelector('dialog button[type="submit"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      const request = http.expectOne(request => request.url === api);
      expect(request.request.params.get('isRefunded')).toBe(expected);
      expect(request.request.params.get('minAmount')).toBe('0');
      expect(component.activeFilterCount()).toBe(2);
      expect(component.showFilters()).toBeFalse();
      request.flush(result);
      await fixture.whenStable();
    }
  });

  it('discards unsubmitted filter changes when the dialog is dismissed', async () => {
    component.showFilters.set(true);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBeTrue();
    component.paymentMethod.set(2);
    component.orderNumber.set('unsaved');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(component.paymentMethod()).toBeNull();
    expect(component.orderNumber()).toBe('');
    expect(component.showFilters()).toBeFalse();
    http.expectNone(request => request.url === api);
  });

  it('keeps applied filters when changing pages and resets to page one for a new search', async () => {
    component.orderNumber.set(' ORD-1042 ');
    component.onSearch();
    await fixture.whenStable();
    const first = http.expectOne(request => request.url === api);
    expect(first.request.params.get('orderNumber')).toBe('ORD-1042');
    first.flush(result);
    await fixture.whenStable();
    component.onPageChange(2);
    await fixture.whenStable();
    const second = http.expectOne(request => request.url === api);
    expect(second.request.params.get('orderNumber')).toBe('ORD-1042');
    expect(second.request.params.get('pageNumber')).toBe('2');
    second.flush({ ...result, page: 2 });
    await fixture.whenStable();
    component.clearFilters();
    await fixture.whenStable();
    const cleared = http.expectOne(request => request.url === api);
    expect(cleared.request.params.has('orderNumber')).toBeFalse();
    expect(cleared.request.params.get('pageNumber')).toBe('1');
    expect(component.activeFilterCount()).toBe(0);
    cleared.flush(result);
  });

  it('cancels an older search before it can replace the latest results', async () => {
    component.orderNumber.set('first');
    component.onSearch();
    await fixture.whenStable();
    const older = http.expectOne(request => request.url === api);
    component.orderNumber.set('latest');
    component.onSearch();
    await fixture.whenStable();
    expect(older.cancelled).toBeTrue();
    const latest = http.expectOne(request => request.url === api);
    expect(latest.request.params.get('orderNumber')).toBe('latest');
    latest.flush(result);
  });
});
