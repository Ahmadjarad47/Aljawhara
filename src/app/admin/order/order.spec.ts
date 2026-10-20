import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { Dashboard } from '../dashboard/dashboard';
import { Order } from './order';
import { OrderService } from './order-service';
import { OrderStatus, OrderSummaryDto } from './order.models';

describe('Admin orders language and statuses', () => {
  let fixture: ComponentFixture<Order>;
  let component: Order;
  let service: jasmine.SpyObj<OrderService>;
  const language = signal<'ar' | 'en'>('ar');
  const reviewOrder: OrderSummaryDto = {
    id: 8, orderNumber: 'ORD-8', status: OrderStatus.RequiresReconciliation, total: 10,
    createdAt: '2026-10-19T10:00:00Z', itemCount: 1, customerName: 'Customer', isActive: true,
  };

  beforeEach(() => {
    language.set('ar');
    service = jasmine.createSpyObj<OrderService>('OrderService', ['getOrders', 'updateOrderStatus'], {
      orders$: new BehaviorSubject([reviewOrder, { ...reviewOrder, id: 9, status: OrderStatus.Expired }]),
      pagination$: new BehaviorSubject({ totalCount: 2, totalPages: 1, currentPage: 1, pageSize: 20 }),
    });
    service.getOrders.and.returnValue(of({
      items: [reviewOrder], totalCount: 1, totalPages: 1, page: 1, pageSize: 20,
    }));
    service.updateOrderStatus.and.returnValue(of({} as any));
    TestBed.configureTestingModule({
      imports: [Order], providers: [provideZonelessChangeDetection(),
        { provide: Dashboard, useValue: { currentLanguage: language } },
        { provide: OrderService, useValue: service }],
    });
    fixture = TestBed.createComponent(Order);
    component = fixture.componentInstance;
    component.showCharts.set(false);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('follows the dashboard language immediately, including an already open modal and direction', () => {
    component.updateStatusStart({ ...reviewOrder, status: OrderStatus.Shipped });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('إدارة الطلبات');
    expect(element.querySelector('[lang]')?.getAttribute('dir')).toBe('rtl');
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('تحديث حالة الطلب');
    expect(element.querySelector('input[type="text"]')?.getAttribute('placeholder')).toContain('ابحث');
    expect(element.textContent).not.toContain('Unknown');
    const field = element.querySelector('#order-status')!.parentElement!;
    expect(getComputedStyle(field).flexDirection).toBe('column');
    const calls = service.getOrders.calls.count();
    language.set('en');
    fixture.detectChanges();
    expect(element.querySelector('h1')?.textContent).toContain('Order Management');
    expect(element.querySelector('[lang]')?.getAttribute('dir')).toBe('ltr');
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('Update Order Status');
    expect(element.textContent).toContain('Payment under review');
    expect(service.getOrders.calls.count()).toBe(calls);
  });

  it('recognizes every API status as a number, numeric string or enum name', () => {
    const labels = ['قيد الانتظار', 'قيد التجهيز', 'تم الشحن', 'تم التسليم', 'ملغي',
      'تم الاسترداد', 'منتهي الصلاحية', 'بانتظار مراجعة الدفع'];
    component.orderStatuses.forEach(status => {
      expect(component.getStatusName(status)).toBe(labels[status]);
      expect(component.getStatusName(String(status))).toBe(labels[status]);
      expect(component.getStatusName(OrderStatus[status])).toBe(labels[status]);
      expect(component.getStatusBadgeClass(OrderStatus[status])).toBe(component.getStatusBadgeClass(status));
    });
    expect(component.getStatusName('999')).toBe('حالة غير معروفة');
    expect(component.getStatusName(' ')).toBe('حالة غير معروفة');
  });

  it('preserves a payment review status in the editor until a permitted status is selected', async () => {
    component.updateStatusStart(reviewOrder);
    fixture.detectChanges();
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#order-status');
    expect(select.selectedOptions[0].textContent).toContain('بانتظار مراجعة الدفع');
    component.updateStatus();
    expect(service.updateOrderStatus).not.toHaveBeenCalled();
    // Exercise the real select binding, including Pending=0.
    select.selectedIndex = Array.from(select.options).findIndex(option => option.textContent === 'قيد الانتظار');
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    component.updateStatus();
    expect(service.updateOrderStatus).toHaveBeenCalledWith(8, { id: 8, status: 0 });
    expect(component.toasts.some(toast => toast.message === 'تم تحديث حالة الطلب بنجاح')).toBeTrue();
  });

  it('translates chart labels without changing chronological order or dropping named API statuses', () => {
    component.allOrdersForChart.set([
      { ...reviewOrder, createdAt: '2026-10-20T12:00:00Z' },
      { ...reviewOrder, id: 9, status: 'Pending' as any, createdAt: '2026-10-19T12:00:00Z' },
    ]);
    fixture.detectChanges();
    expect(component.ordersByStatusChartData.labels).toEqual(['قيد الانتظار', 'بانتظار مراجعة الدفع']);
    expect(component.ordersOverTimeChartData.datasets[0].label).toBe('طلبات');
    expect(component.ordersOverTimeChartData.labels).toEqual([
      component.formatChartDate('2026-10-19T12:00:00Z'), component.formatChartDate('2026-10-20T12:00:00Z'),
    ]);
    language.set('en');
    fixture.detectChanges();
    expect(component.ordersByStatusChartData.labels).toEqual(['Pending', 'Payment under review']);
    expect(component.revenueOverTimeChartData.datasets[0].label).toBe('Revenue');
    component.chartStatusFilter.set(OrderStatus.Pending);
    fixture.detectChanges();
    expect(component.getFilteredOrdersForChart().map(order => order.id)).toEqual([9]);
  });
});
