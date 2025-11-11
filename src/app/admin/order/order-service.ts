import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { 
  OrderDto,
  OrderSummaryDto,
  OrderUpdateStatusDto,
  OrderStatus
} from './order.models';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private api = environment.apiUrl + 'admin/order';
  private http = inject(HttpClient);
  private sourceOrders = new BehaviorSubject<OrderSummaryDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 20
  });
  
  orders$ = this.sourceOrders.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Set orders directly (for search by order number)
  setOrders(orders: OrderSummaryDto[]) {
    this.sourceOrders.next(orders);
  }

  // Get all orders with filtering and pagination
  getOrders(status?: OrderStatus | null, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<OrderSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    if (status !== null && status !== undefined) {
      params = params.set('status', status.toString());
    }

    return this.http.get<PagedResult<OrderSummaryDto>>(`${this.api}`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceOrders.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get order by ID
  getOrderById(id: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.api}/${id}`);
  }

  // Get order by order number
  getOrderByNumber(orderNumber: string): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.api}/number/${orderNumber}`);
  }

  // Get user orders with pagination
  getUserOrders(userId: string, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<OrderSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<OrderSummaryDto>>(`${this.api}/user/${userId}`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceOrders.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Update order status
  updateOrderStatus(id: number, orderUpdateDto: OrderUpdateStatusDto): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${this.api}/${id}/status`, orderUpdateDto);
  }

  // Cancel order
  cancelOrder(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/cancel`, {});
  }

  // Get order statistics
  getOrderStatistics(): Observable<{[key: string]: number}> {
    return this.http.get<{[key: string]: number}>(`${this.api}/statistics`);
  }

  // Get total sales
  getTotalSales(startDate?: Date | null, endDate?: Date | null): Observable<{totalSales: number, startDate?: string, endDate?: string}> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<{totalSales: number, startDate?: string, endDate?: string}>(`${this.api}/sales`, { params });
  }
}
