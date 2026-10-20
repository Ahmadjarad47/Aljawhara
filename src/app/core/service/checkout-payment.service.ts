import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderCreateDto } from '../../admin/order/order.models';
import { CheckoutOrderResponse, OrderPaymentStatus } from '../Models/checkout-payment';

interface OrderContext {
  orderId: number;
  guestAccessToken?: string | null;
  reservationExpiresAtUtc?: string | null;
  initializationStatus?: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutPaymentService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl.replace(/\/?$/, '/')}Orders`;

  private read<T>(key: string): T | undefined {
    try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? undefined; }
    catch { return undefined; }
  }

  private write(key: string, value: unknown): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  context(orderId?: number): OrderContext | undefined {
    const id = orderId ?? this.read<number>('checkout_last_order');
    return id ? this.read<OrderContext>(`checkout_order_${id}`) : undefined;
  }

  remember(response: CheckoutOrderResponse): void {
    const previous = this.context(response.orderId);
    this.write(`checkout_order_${response.orderId}`, {
      ...previous, orderId: response.orderId,
      guestAccessToken: response.guestAccessToken ?? previous?.guestAccessToken,
      reservationExpiresAtUtc: response.reservationExpiresAtUtc,
      initializationStatus: response.paymentInitializationStatus,
    });
    this.write('checkout_last_order', response.orderId);
  }

  createOrder(dto: OrderCreateDto) {
    const payload = JSON.stringify(dto);
    const previous = this.read<{ payload: string; key: string }>('checkout_order_request');
    const request = previous?.payload === payload ? previous : { payload, key: crypto.randomUUID() };
    // Save before dispatch so a lost response/reload reuses this exact request key.
    this.write('checkout_order_request', request);
    return this.http.post<CheckoutOrderResponse>(this.api, dto, {
      headers: { 'Idempotency-Key': request.key },
    }).pipe(tap(response => {
      if (!Number.isSafeInteger(response.orderId) || response.orderId <= 0
        || ![0, 1, 2, 3, 4, 5].includes(response.paymentInitializationStatus)) throw new Error('Invalid checkout response');
      this.remember(response);
      sessionStorage.removeItem('checkout_order_request');
    }));
  }

  private headers(orderId: number): HttpHeaders {
    let headers = new HttpHeaders({ 'Cache-Control': 'no-store' });
    const token = this.context(orderId)?.guestAccessToken;
    if (token) headers = headers.set('X-Guest-Order-Token', token);
    return headers;
  }

  getStatus(orderId: number, verify = false) {
    return this.http.get<OrderPaymentStatus>(`${this.api}/${orderId}/payment-status`, {
      headers: this.headers(orderId), transferCache: false,
      params: verify ? new HttpParams().set('verify', 'true') : undefined,
    }).pipe(timeout(20000), tap(status => {
      if (status.orderId !== orderId) throw new Error('Order mismatch');
      const context = this.context(orderId);
      this.remember({ ...context, orderId, paymentInitializationStatus: status.initializationStatus,
        reservationExpiresAtUtc: status.reservationExpiresAtUtc });
    }));
  }

  triggerCallback(invoiceId: string, payment?: string) {
    let params = new HttpParams().set('invoice_id', invoiceId);
    if (payment) params = params.set('payment', payment);
    return this.http.get<unknown>(`${this.api}/payment-callback`, {
      params, observe: 'response', transferCache: false, headers: { 'Cache-Control': 'no-store' },
    }).pipe(timeout(20000));
  }

  retryPayment(orderId: number, attemptId: number) {
    const storageKey = `checkout_retry_${orderId}_${attemptId}`;
    const key = this.read<string>(storageKey) ?? crypto.randomUUID();
    this.write(storageKey, key);
    return this.http.post<OrderPaymentStatus>(`${this.api}/${orderId}/payment-attempts`, {}, {
      headers: this.headers(orderId).set('Idempotency-Key', key),
    });
  }
}
