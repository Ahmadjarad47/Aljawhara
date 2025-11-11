import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, shareReplay, map } from 'rxjs/operators';
import { 
  TransactionAdvancedDto,
  TransactionCreateAdvancedDto,
  TransactionUpdateDto,
  TransactionRefundDto,
  TransactionFilterDto,
  TransactionAnalyticsDto,
  TransactionTrendDto,
  TransactionSummaryDto,
  PaymentProcessingDto,
  PaymentMethod
} from './transaction.models';

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
export class TransactionService {
  private api = environment.apiUrl + 'admin/transaction';
  private http = inject(HttpClient);
  private sourceTransactions = new BehaviorSubject<TransactionAdvancedDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  transactions$ = this.sourceTransactions.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get all transactions with advanced filtering and pagination
  getTransactions(filter: TransactionFilterDto): Observable<PagedResult<TransactionAdvancedDto>> {
    let params = new HttpParams();
    
    if (filter.orderId !== null && filter.orderId !== undefined) {
      params = params.set('orderId', filter.orderId.toString());
    }
    if (filter.orderNumber) {
      params = params.set('orderNumber', filter.orderNumber);
    }
    if (filter.appUserId) {
      params = params.set('appUserId', filter.appUserId);
    }
    if (filter.paymentMethod !== null && filter.paymentMethod !== undefined) {
      params = params.set('paymentMethod', filter.paymentMethod.toString());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }
    if (filter.minAmount !== null && filter.minAmount !== undefined) {
      params = params.set('minAmount', filter.minAmount.toString());
    }
    if (filter.maxAmount !== null && filter.maxAmount !== undefined) {
      params = params.set('maxAmount', filter.maxAmount.toString());
    }
    if (filter.isRefunded !== null && filter.isRefunded !== undefined) {
      params = params.set('isRefunded', filter.isRefunded.toString());
    }
    if (filter.pageNumber) {
      params = params.set('pageNumber', filter.pageNumber.toString());
    }
    if (filter.pageSize) {
      params = params.set('pageSize', filter.pageSize.toString());
    }
    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }
    if (filter.sortDirection) {
      params = params.set('sortDirection', filter.sortDirection);
    }

    return this.http.get<PagedResult<TransactionAdvancedDto>>(`${this.api}`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceTransactions.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get transaction by ID
  getTransactionById(id: number): Observable<TransactionAdvancedDto> {
    return this.http.get<TransactionAdvancedDto>(`${this.api}/${id}`);
  }

  // Get transaction by reference
  getTransactionByReference(reference: string): Observable<TransactionAdvancedDto> {
    return this.http.get<TransactionAdvancedDto>(`${this.api}/reference/${reference}`);
  }

  // Get transactions by order
  getTransactionsByOrder(orderId: number, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<TransactionAdvancedDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<TransactionAdvancedDto>>(`${this.api}/order/${orderId}`, { params });
  }

  // Get latest transaction by order
  getLatestTransactionByOrder(orderId: number): Observable<TransactionAdvancedDto> {
    return this.http.get<TransactionAdvancedDto>(`${this.api}/order/${orderId}/latest`);
  }

  // Create transaction
  createTransaction(transaction: TransactionCreateAdvancedDto): Observable<TransactionAdvancedDto> {
    return this.http.post<TransactionAdvancedDto>(`${this.api}`, transaction);
  }

  // Update transaction
  updateTransaction(transaction: TransactionUpdateDto): Observable<TransactionAdvancedDto> {
    return this.http.put<TransactionAdvancedDto>(`${this.api}/${transaction.id}`, transaction);
  }

  // Delete transaction
  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // Process payment
  processPayment(payment: PaymentProcessingDto): Observable<TransactionAdvancedDto> {
    return this.http.post<TransactionAdvancedDto>(`${this.api}/process-payment`, payment);
  }

  // Process refund
  processRefund(refund: TransactionRefundDto): Observable<TransactionAdvancedDto> {
    return this.http.post<TransactionAdvancedDto>(`${this.api}/refund`, refund);
  }

  // Update transaction status
  updateTransactionStatus(id: number, status: string, gatewayResponse?: string): Observable<any> {
    const body: any = { status };
    if (gatewayResponse) {
      body.gatewayResponse = gatewayResponse;
    }
    return this.http.put<any>(`${this.api}/${id}/status`, body);
  }

  // Mark transaction as completed
  markTransactionAsCompleted(id: number, reference?: string): Observable<any> {
    const body: any = {};
    if (reference) {
      body.reference = reference;
    }
    return this.http.put<any>(`${this.api}/${id}/complete`, body);
  }

  // Mark transaction as failed
  markTransactionAsFailed(id: number, reason: string): Observable<any> {
    return this.http.put<any>(`${this.api}/${id}/fail`, { reason });
  }

  // Mark transaction as pending
  markTransactionAsPending(id: number): Observable<any> {
    return this.http.put<any>(`${this.api}/${id}/pending`, {});
  }

  // Get transaction analytics
  getTransactionAnalytics(startDate?: Date, endDate?: Date): Observable<TransactionAnalyticsDto> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<TransactionAnalyticsDto>(`${this.api}/analytics`, { params });
  }

  // Get order transaction analytics
  getOrderTransactionAnalytics(orderId: number): Observable<TransactionAnalyticsDto> {
    return this.http.get<TransactionAnalyticsDto>(`${this.api}/analytics/order/${orderId}`);
  }

  // Get revenue by payment method
  getRevenueByPaymentMethod(startDate?: Date, endDate?: Date): Observable<{[key: string]: number}> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<{[key: string]: number}>(`${this.api}/revenue/payment-methods`, { params });
  }

  // Get transaction trends
  getTransactionTrends(startDate: Date, endDate: Date, period: string = 'daily'): Observable<TransactionTrendDto[]> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString())
      .set('period', period);
    
    return this.http.get<TransactionTrendDto[]>(`${this.api}/trends`, { params });
  }

  // Get refunded transactions
  getRefundedTransactions(startDate?: Date, endDate?: Date): Observable<TransactionAdvancedDto[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<TransactionAdvancedDto[]>(`${this.api}/refunded`, { params });
  }

  // Get total refunded amount
  getTotalRefundedAmount(startDate?: Date, endDate?: Date): Observable<number> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<{totalRefundedAmount: number}>(`${this.api}/refunded/total`, { params }).pipe(
      map(result => result.totalRefundedAmount),
      shareReplay(1)
    );
  }

  // Check if transaction can be refunded
  canRefundTransaction(id: number): Observable<boolean> {
    return this.http.get<{canRefund: boolean}>(`${this.api}/${id}/can-refund`, {}).pipe(
      map(result => result.canRefund),
      shareReplay(1)
    );
  }

  // Search transactions
  searchTransactions(searchTerm: string, limit: number = 50): Observable<TransactionSummaryDto[]> {
    let params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('limit', limit.toString());
    
    return this.http.get<TransactionSummaryDto[]>(`${this.api}/search`, { params });
  }

  // Get transactions by status
  getTransactionsByStatus(status: string, pageNumber: number = 1, pageSize: number = 20): Observable<TransactionAdvancedDto[]> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    return this.http.get<TransactionAdvancedDto[]>(`${this.api}/status/${status}`, { params });
  }

  // Get transactions by payment method
  getTransactionsByPaymentMethod(paymentMethod: PaymentMethod, pageNumber: number = 1, pageSize: number = 20): Observable<TransactionAdvancedDto[]> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    
    return this.http.get<TransactionAdvancedDto[]>(`${this.api}/payment-method/${paymentMethod}`, { params });
  }

  // Export transactions to CSV
  exportTransactionsToCsv(filter: TransactionFilterDto): Observable<Blob> {
    let params = new HttpParams();
    
    if (filter.orderId !== null && filter.orderId !== undefined) {
      params = params.set('orderId', filter.orderId.toString());
    }
    if (filter.orderNumber) {
      params = params.set('orderNumber', filter.orderNumber);
    }
    if (filter.appUserId) {
      params = params.set('appUserId', filter.appUserId);
    }
    if (filter.paymentMethod !== null && filter.paymentMethod !== undefined) {
      params = params.set('paymentMethod', filter.paymentMethod.toString());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }
    if (filter.minAmount !== null && filter.minAmount !== undefined) {
      params = params.set('minAmount', filter.minAmount.toString());
    }
    if (filter.maxAmount !== null && filter.maxAmount !== undefined) {
      params = params.set('maxAmount', filter.maxAmount.toString());
    }
    if (filter.isRefunded !== null && filter.isRefunded !== undefined) {
      params = params.set('isRefunded', filter.isRefunded.toString());
    }

    return this.http.get(`${this.api}/export/csv`, { 
      params,
      responseType: 'blob' 
    });
  }

  // Export transactions to Excel
  exportTransactionsToExcel(filter: TransactionFilterDto): Observable<Blob> {
    let params = new HttpParams();
    
    if (filter.orderId !== null && filter.orderId !== undefined) {
      params = params.set('orderId', filter.orderId.toString());
    }
    if (filter.orderNumber) {
      params = params.set('orderNumber', filter.orderNumber);
    }
    if (filter.appUserId) {
      params = params.set('appUserId', filter.appUserId);
    }
    if (filter.paymentMethod !== null && filter.paymentMethod !== undefined) {
      params = params.set('paymentMethod', filter.paymentMethod.toString());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }
    if (filter.minAmount !== null && filter.minAmount !== undefined) {
      params = params.set('minAmount', filter.minAmount.toString());
    }
    if (filter.maxAmount !== null && filter.maxAmount !== undefined) {
      params = params.set('maxAmount', filter.maxAmount.toString());
    }
    if (filter.isRefunded !== null && filter.isRefunded !== undefined) {
      params = params.set('isRefunded', filter.isRefunded.toString());
    }

    return this.http.get(`${this.api}/export/excel`, { 
      params,
      responseType: 'blob' 
    });
  }
}
