// TEMPORARY design-review harness. Delete this file and its route when done.
import { Component } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { DashboardContent } from './admin/dashboard-content/dashboard-content';
import { DashService } from './admin/dashboard-content/dash-service';
import {
  DashboardSummaryDto,
  OrderSummaryDto,
  Period,
  TimeSeriesPointDto,
  UserSummaryDto,
} from './admin/dashboard-content/dash.models';

function series(days: number, base: number, spread: number): TimeSeriesPointDto[] {
  const out: TimeSeriesPointDto[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString(),
      count: Math.max(0, Math.round(base + Math.sin(i / 3) * spread + Math.random() * spread)),
    });
  }
  return out;
}

class MockDashService {
  getSummary(): Observable<DashboardSummaryDto> {
    return of({
      users: { total: 12480, lastMonth: 11210 },
      orders: { total: 3297, lastMonth: 3510 },
      transactions: { total: 8914, lastMonth: 8120 },
      visitors: { total: 154320, lastMonth: 140200 },
      sales: { total: 284750, lastMonth: 251300 },
    }).pipe(delay(600));
  }
  getLastOrders(): Observable<OrderSummaryDto[]> {
    return of([
      { id: 1, orderNumber: 'A-10482', status: 0, total: 1240, createdAt: new Date(Date.now() - 6e5).toISOString(), itemCount: 3, customerName: 'Layla Hassan', isActive: true },
      { id: 2, orderNumber: 'A-10481', status: 3, total: 480, createdAt: new Date(Date.now() - 36e5).toISOString(), itemCount: 1, customerName: 'Omar Khalid', isActive: true },
      { id: 3, orderNumber: 'A-10480', status: 1, total: 3190, createdAt: new Date(Date.now() - 9e6).toISOString(), itemCount: 7, customerName: 'Fatima Al-Sayed', isActive: true },
      { id: 4, orderNumber: 'A-10479', status: 4, total: 95, createdAt: new Date(Date.now() - 18e7).toISOString(), itemCount: 2, customerName: 'Yousef Nasser', isActive: false },
      { id: 5, orderNumber: 'A-10478', status: 2, total: 2075, createdAt: new Date(Date.now() - 26e7).toISOString(), itemCount: 4, customerName: 'Noor Abdullah', isActive: true },
    ] as OrderSummaryDto[]).pipe(delay(900));
  }
  getLastUsers(): Observable<UserSummaryDto[]> {
    return of([
      { id: 'u1', username: 'maha.ali', email: 'maha@example.com', createdAt: new Date(Date.now() - 3e5).toISOString(), emailConfirmed: true },
      { id: 'u2', username: 'tariq99', email: 'tariq@example.com', createdAt: new Date(Date.now() - 54e5).toISOString(), emailConfirmed: false },
      { id: 'u3', username: 'sara.m', email: 'sara@example.com', createdAt: new Date(Date.now() - 9e7).toISOString(), emailConfirmed: true },
      { id: 'u4', username: 'abdulrahman.alqahtani', email: 'a.alqahtani@example.com', createdAt: new Date(Date.now() - 17e7).toISOString(), emailConfirmed: true },
      { id: 'u5', username: '', email: 'unknown@example.com', createdAt: new Date(Date.now() - 31e7).toISOString(), emailConfirmed: false },
    ]).pipe(delay(1200));
  }
  private points(period: Period): number {
    return { '7d': 7, '30d': 30, '60d': 60, '90d': 90, '180d': 180, '365d': 365, '1y': 365, '2y': 730 }[period] ?? 30;
  }
  getUsersChart(period: Period): Observable<TimeSeriesPointDto[]> {
    return of(series(this.points(period), 18, 14)).pipe(delay(700));
  }
  getTransactionsChart(period: Period): Observable<TimeSeriesPointDto[]> {
    return of(series(this.points(period), 900, 650)).pipe(delay(800));
  }
  getVisitorsChart(period: Period): Observable<TimeSeriesPointDto[]> {
    return of(series(this.points(period), 400, 200));
  }
  getOrdersChart(period: Period): Observable<TimeSeriesPointDto[]> {
    return of(series(this.points(period), 40, 25));
  }
}

@Component({
  selector: 'app-dev-dashboard-preview',
  imports: [DashboardContent],
  providers: [{ provide: DashService, useClass: MockDashService }],
  template: `<app-dashboard-content />`,
})
export class DevDashboardPreview {}
