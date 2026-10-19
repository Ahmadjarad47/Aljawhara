import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { UserOrderService } from './user-order.service';
import { OrderDto, OrderStatus, OrderSummaryDto } from './models.order';

describe('My orders payment status', () => {
  let service: UserOrderService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}Orders`;
  const order: OrderSummaryDto = {
    id: 8, orderNumber: 'ORD-8', status: OrderStatus.Processing, total: 10,
    createdAt: '2026-10-19', itemCount: 1, customerName: 'Customer', isActive: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
    ] });
    service = TestBed.inject(UserOrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  [0, 1, 2, 3, 4, 5].forEach(initializationStatus => {
    it(`marks the list paid only for verified Paid=5 (received ${initializationStatus})`, () => {
      let result: OrderSummaryDto[] = [];
      service.getMyOrders().subscribe(orders => result = orders);
      http.expectOne(`${api}/my-orders`).flush([order]);
      const payment = http.expectOne(`${api}/8/payment-status`);
      expect(payment.request.headers.get('Cache-Control')).toBe('no-store');
      payment.flush({ orderId: 8, initializationStatus });
      expect(result[0].status).toBe(OrderStatus.Processing);
      expect(result[0].isPaid).toBe(initializationStatus === 5);
    });
  });

  it('also retrieves verified payment status for the details modal', () => {
    let result: OrderDto | undefined;
    service.getOrderById(8).subscribe(value => result = value);
    http.expectOne(`${api}/8`).flush({ ...order, items: [] });
    http.expectOne(`${api}/8/payment-status`).flush({ orderId: 8, initializationStatus: 5 });
    expect(result?.isPaid).toBeTrue();
  });

  it('keeps the order visible when the payment endpoint fails', () => {
    let result: OrderSummaryDto[] = [];
    service.getMyOrders().subscribe(orders => result = orders);
    http.expectOne(`${api}/my-orders`).flush([order]);
    http.expectOne(`${api}/8/payment-status`).flush('', { status: 503, statusText: 'Unavailable' });
    expect(result).toEqual([order]);
    expect(result[0].isPaid).toBeUndefined();
  });

  it('does not query payment status for an empty list', () => {
    service.getMyOrders().subscribe(orders => expect(orders).toEqual([]));
    http.expectOne(`${api}/my-orders`).flush([]);
  });
});
