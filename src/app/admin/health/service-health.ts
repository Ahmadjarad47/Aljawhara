import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { HealthChartPointDto, HealthSummaryDto } from './health.models';

@Injectable({ providedIn: 'root' })
export class ServiceHealth {
  private http = inject(HttpClient);
  private api = environment.apiUrl + 'admin/health';

  private summarySource = new BehaviorSubject<HealthSummaryDto | null>(null);
  private chartSource = new BehaviorSubject<HealthChartPointDto[]>([]);

  summary$ = this.summarySource.asObservable();
  chart$ = this.chartSource.asObservable();

  getSummary(): Observable<HealthSummaryDto> {
    return this.http.get<HealthSummaryDto>(`${this.api}/summary`).pipe(
      tap(s => this.summarySource.next(s)),
      shareReplay(1)
    );
  }

  getChart(minutes: number = 60): Observable<HealthChartPointDto[]> {
    const params = new HttpParams().set('minutes', minutes);
    return this.http.get<HealthChartPointDto[]>(`${this.api}/chart`, { params }).pipe(
      tap(c => this.chartSource.next(c)),
      shareReplay(1)
    );
  }
}


