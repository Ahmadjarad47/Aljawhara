import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PaymentInitializationStatus } from '../../../core/Models/checkout-payment';
import { UserOrderComponent } from './user-order';
import { UserOrderService } from './user-order.service';
import { OrderDto, OrderStatus, OrderSummaryDto, RatingCreateDto, normalizeOrderStatus } from './models.order';

describe('My orders status display', () => {
  let fixture: ComponentFixture<UserOrderComponent>;
  let component: UserOrderComponent;
  let addProductRating: jasmine.Spy;
  const order: OrderSummaryDto = {
    id: 8, orderNumber: 'ORD-8', status: OrderStatus.Processing, total: 10,
    createdAt: '2026-10-19', itemCount: 0, customerName: 'Customer', isActive: true,
    isPaid: true, paymentInitializationStatus: PaymentInitializationStatus.Paid,
  };

  beforeEach(() => {
    addProductRating = jasmine.createSpy('addProductRating').and.callFake((rating: RatingCreateDto) =>
      of({ ...rating, id: 1, createdAt: order.createdAt, createdBy: 'Customer' }));
    TestBed.configureTestingModule({
      imports: [UserOrderComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: UserOrderService, useValue: { getMyOrders: () => of([order]), addProductRating } }],
    });
    fixture = TestBed.createComponent(UserOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('separates preparation from payment in desktop, mobile and order details without offering payment again', () => {
    component.currentLanguage.set('ar');
    component.selectedOrderDetails.set({
      ...order, createdBy: 'Customer', isDeleted: false, items: [],
      shippingAddress: {
        id: 1, createdAt: order.createdAt, createdBy: 'Customer', isDeleted: false, isActive: true,
        fullName: 'Customer', phone: '', street: '', city: '', postalCode: '', country: 'Kuwait',
      },
      subtotal: 10, shipping: 0, tax: 0,
    });
    component.showDetailsModal.set(true);
    fixture.detectChanges();
    const paidBadges = Array.from(fixture.nativeElement.querySelectorAll('.badge'))
      .filter((badge: any) => badge.textContent.trim() === 'تم الدفع');
    expect(paidBadges.length).toBe(3);
    paidBadges.forEach((badge: any) => {
      expect(badge.parentElement.textContent).not.toContain('قيد التجهيز');
    });
    const headers = Array.from(fixture.nativeElement.querySelectorAll('th'))
      .map((header: any) => header.textContent.trim());
    expect(headers).toContain('حالة الطلب');
    expect(headers).toContain('حالة الدفع');
    expect(fixture.nativeElement.textContent).toContain('قيد التجهيز');
    expect(fixture.nativeElement.textContent).not.toContain('قيد المعالجة');
    expect(component.canPayOrder(order)).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('ادفع الآن');
    component.currentLanguage.set('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Paid');
    expect(fixture.nativeElement.textContent).toContain('Preparing');
    expect(fixture.nativeElement.textContent).toContain('Payment status');
  });

  it('recognizes API status names and numbers and never renders an empty label', () => {
    component.currentLanguage.set('ar');
    expect(component.getOrderStatusText('Processing')).toBe('قيد التجهيز');
    expect(component.getOrderStatusText('6')).toBe('منتهي الصلاحية');
    expect(component.getOrderStatusText(OrderStatus.RequiresReconciliation)).toBe('بانتظار مراجعة الدفع');
    expect(component.getOrderStatusText('unrecognized')).toBe('حالة غير معروفة');
    expect(normalizeOrderStatus(' ')).toBeNull();
  });

  it('filters Pending=0 instead of treating it as all statuses', () => {
    component.orders.set([order, { ...order, id: 9, status: OrderStatus.Pending }]);
    component.statusFilter.set(OrderStatus.Pending);
    expect(component.filteredOrders$().map(value => value.id)).toEqual([9]);
  });

  it('does not offer electronic payment for cash on delivery or expired orders', () => {
    expect(component.canPayOrder({ ...order, status: OrderStatus.Pending, isPaid: false,
      paymentInitializationStatus: PaymentInitializationStatus.NotApplicable })).toBeFalse();
    expect(component.canPayOrder({ ...order, status: OrderStatus.Expired, isPaid: false })).toBeFalse();
  });

  it('offers ratings only after delivery and submits the exact order ID', () => {
    const base = { createdAt: order.createdAt, createdBy: 'Customer', isDeleted: false, isActive: true };
    const details: OrderDto = {
      ...order, ...base, status: OrderStatus.Cancelled,
      subtotal: 10, shipping: 0, tax: 0,
      items: [{ ...base, id: 1, orderId: order.id, productId: 42, name: 'Product', image: '',
        price: 10, quantity: 1, total: 10 }],
      shippingAddress: { ...base, id: 1, fullName: 'Customer', phone: '', street: '', city: '',
        postalCode: '', country: 'Kuwait' },
    };
    component.selectedOrderDetails.set(details);
    component.showDetailsModal.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.order-rate')).toBeNull();
    component.openRatingModal(42, 'Product');
    expect(component.showRatingModal()).toBeFalse();

    component.selectedOrderDetails.set({ ...details, status: OrderStatus.Delivered });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.order-rate').click();
    component.updateRatingContent('My review');

    component.selectedOrderDetails.set(details);
    component.submitRating();
    expect(addProductRating).not.toHaveBeenCalled();

    component.selectedOrderDetails.set({ ...details, status: OrderStatus.Delivered });
    component.submitRating();
    expect(addProductRating).toHaveBeenCalledOnceWith({ orderId: order.id, productId: 42,
      ratingNumber: 5, content: 'My review' });
  });
});
