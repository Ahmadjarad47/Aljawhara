import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, catchError } from 'rxjs/operators';
import { OrderSummaryDto, OrderDto, OrderFilters, RatingDto, RatingCreateDto, InvoicePaymentDto } from './models.order';

@Injectable({
  providedIn: 'root'
})
export class UserOrderService {
  private api = environment.apiUrl + 'Orders';
  private http = inject(HttpClient);
  
  private sourceOrders = new BehaviorSubject<OrderSummaryDto[]>([]);
  private sourcePagination = new BehaviorSubject<{
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  }>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });

  orders$ = this.sourceOrders.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get user's orders
  getMyOrders(): Observable<OrderSummaryDto[]> {
    return this.http.get<OrderSummaryDto[]>(`${this.api}/my-orders`).pipe(
      shareReplay(1),
      tap((orders) => {
        console.log('My orders:', orders);
        this.sourceOrders.next(orders);
        // Since the backend doesn't return pagination for this endpoint,
        // we'll create pagination info from the array
        console.log('Orders length:', orders);
        
        this.sourcePagination.next({
          totalCount: orders.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: orders.length
        });
      })
    );
  }

  // Get order by ID
  getOrderById(id: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.api}/${id}`).pipe(
      shareReplay(1)
    );
  }

  // Cancel order
  cancelOrder(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/cancel`, {});
  }

  // Check if user has rated a product
  checkMyProductRating(productId: number): Observable<RatingDto | null> {
    const params = new HttpParams().set('productId', productId.toString());
    return this.http.get<RatingDto>(`${environment.apiUrl}Products/if-rating-return-it`, { params }).pipe(
      catchError(() => {
        // Return null if not found (404) - means user hasn't rated yet
        return of(null);
      }),
      shareReplay(1)
    );
  }

  // Add product rating
  addProductRating(rating: RatingCreateDto): Observable<RatingDto> {
    return this.http.post<RatingDto>(`${environment.apiUrl}Products/${rating.productId}/ratings`, rating).pipe(
      shareReplay(1)
    );
  }

  // Get invoice payment data
  getInvoicePaymentData(orderId: number): Observable<InvoicePaymentDto> {
    return this.http.get<InvoicePaymentDto>(`${this.api}/${orderId}/invoice-payment`).pipe(
      shareReplay(1)
    );
  }
}

