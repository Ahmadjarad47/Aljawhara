import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PagedResult, TransactionAdvancedDto, TransactionFilterDto } from './transaction.models';

@Injectable({ providedIn: 'root' })
export class ServiceTransaction {
  private http = inject(HttpClient);
  private api = environment.apiUrl.replace(/\/?$/, '/') + 'Transactions';

  private sourceItems = new BehaviorSubject<TransactionAdvancedDto[]>([]);
  private sourcePagination = new BehaviorSubject<{ totalCount: number; totalPages: number; currentPage: number; pageSize: number }>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });

  transactions$: Observable<TransactionAdvancedDto[]> = this.sourceItems.asObservable();
  pagination$: Observable<{ totalCount: number; totalPages: number; currentPage: number; pageSize: number }> = this.sourcePagination.asObservable();

  getTransactions(filters: TransactionFilterDto = {}): Observable<PagedResult<TransactionAdvancedDto>> {
    let params = new HttpParams();

    if (filters.orderId != null) params = params.set('orderId', String(filters.orderId));
    if (filters.orderNumber) params = params.set('orderNumber', filters.orderNumber);
    if (filters.appUserId) params = params.set('appUserId', filters.appUserId);
    if (filters.paymentMethod != null) params = params.set('paymentMethod', String(filters.paymentMethod));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.minAmount != null) params = params.set('minAmount', String(filters.minAmount));
    if (filters.maxAmount != null) params = params.set('maxAmount', String(filters.maxAmount));
    if (filters.isRefunded != null) params = params.set('isRefunded', String(filters.isRefunded));
    if (filters.pageNumber) params = params.set('pageNumber', String(filters.pageNumber));
    if (filters.pageSize) params = params.set('pageSize', String(filters.pageSize));
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDirection) params = params.set('sortDirection', filters.sortDirection);

    return this.http
      .get<PagedResult<TransactionAdvancedDto>>(`${this.api}/my`, { params })
      .pipe(
        shareReplay(1),
        tap(result => {
          this.sourceItems.next(result.items);
          this.sourcePagination.next({
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            currentPage: result.page,
            pageSize: result.pageSize
          });
        })
      );
  }
}


