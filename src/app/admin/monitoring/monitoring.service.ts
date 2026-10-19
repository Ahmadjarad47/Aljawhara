import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MonitoringFilters, MonitoringLogs, MonitoringSummary } from './monitoring.models';

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}admin/monitoring`;
  private readonly options = {
    headers: { 'Cache-Control': 'no-store' },
    cache: 'no-store' as const,
    timeout: 12000,
    transferCache: false as const,
  };

  getSummary() {
    return this.http.get<MonitoringSummary>(`${this.api}/summary`, this.options);
  }

  getLogs(filters: MonitoringFilters, page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<MonitoringLogs>(`${this.api}/logs`, { ...this.options, params });
  }
}
