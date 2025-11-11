import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  DashboardSummaryDto, 
  OrderSummaryDto, 
  UserSummaryDto, 
  TimeSeriesPointDto,
  Period 
} from './dash.models';

@Injectable({
  providedIn: 'root'
})
export class DashService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}admin/dashboard`;

  getSummary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(`${this.baseUrl}/summary`);
  }

  getLastOrders(count: number = 3): Observable<OrderSummaryDto[]> {
    const params = new HttpParams().set('count', count.toString());
    return this.http.get<OrderSummaryDto[]>(`${this.baseUrl}/last-orders`, { params });
  }

  getLastUsers(count: number = 3): Observable<UserSummaryDto[]> {
    const params = new HttpParams().set('count', count.toString());
    return this.http.get<UserSummaryDto[]>(`${this.baseUrl}/last-users`, { params });
  }

  getVisitorsChart(period: Period = '30d'): Observable<TimeSeriesPointDto[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<TimeSeriesPointDto[]>(`${this.baseUrl}/visitors/chart`, { params });
  }

  getUsersChart(period: Period = '30d'): Observable<TimeSeriesPointDto[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<TimeSeriesPointDto[]>(`${this.baseUrl}/users/chart`, { params });
  }

  getOrdersChart(period: Period = '30d'): Observable<TimeSeriesPointDto[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<TimeSeriesPointDto[]>(`${this.baseUrl}/orders/chart`, { params });
  }

  getTransactionsChart(period: Period = '30d'): Observable<TimeSeriesPointDto[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<TimeSeriesPointDto[]>(`${this.baseUrl}/transactions/chart`, { params });
  }
}
