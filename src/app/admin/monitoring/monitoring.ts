import { DOCUMENT, CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Subscription, fromEvent, interval } from 'rxjs';
import { Dashboard } from '../dashboard/dashboard';
import { MonitoringFilters, MonitoringLogs, MonitoringSummary } from './monitoring.models';
import { MonitoringService } from './monitoring.service';
import { monitoringText } from './monitoring.text';

const emptyFilters = (): MonitoringFilters => ({
  search: '', level: '', category: '', traceId: '', from: '', to: '',
});

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './monitoring.html',
  styleUrl: './monitoring.css',
})
export class Monitoring implements OnInit {
  private readonly service = inject(MonitoringService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(PLATFORM_ID);
  readonly language = inject(Dashboard).currentLanguage;
  readonly text = computed(() => monitoringText[this.language()]);
  readonly summary = signal<MonitoringSummary | null>(null);
  readonly logs = signal<MonitoringLogs | null>(null);
  readonly summaryLoading = signal(false);
  readonly logsLoading = signal(false);
  readonly summaryError = signal('');
  readonly logsError = signal('');
  readonly validationError = signal(false);
  readonly accessDenied = signal(false);
  readonly autoRefresh = signal(true);
  readonly summaryUpdated = signal<Date | null>(null);
  readonly logsUpdated = signal<Date | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  private readonly matchedCount = signal(0);
  readonly totalPages = computed(() => Math.min(1000,
    Math.max(1, Math.ceil(this.matchedCount() / this.pageSize()))));
  readonly uptime = computed(() => ({
    hours: Math.floor((this.summary()?.uptimeSeconds ?? 0) / 3600),
    minutes: Math.floor(((this.summary()?.uptimeSeconds ?? 0) % 3600) / 60),
  }));
  readonly healthStatus = computed(() => {
    const health = this.summary()?.health;
    const timestamp = this.summary()?.timestamp;
    // Use server timestamps to avoid client clock skew when detecting an old health check.
    return !health?.checkedAt || !timestamp ||
      new Date(timestamp).getTime() - new Date(health.checkedAt).getTime() > 360000
      ? 'Unknown' : health.status;
  });
  filters = emptyFilters();
  private appliedFilters = emptyFilters();
  private summaryRequest?: Subscription;
  private logsRequest?: Subscription;

  readonly trafficData = computed<ChartData<'line'>>(() => ({
    labels: this.chartLabels(),
    datasets: [
      { label: this.text().requests, data: this.summary()?.series.map(p => p.requests) ?? [],
        borderColor: '#0284c7', backgroundColor: '#0284c7', tension: 0.25, pointRadius: 0 },
      { label: this.text().serverErrors, data: this.summary()?.series.map(p => p.errors) ?? [],
        borderColor: '#dc2626', backgroundColor: '#dc2626', pointRadius: 0 },
      { label: this.text().clientErrors, data: this.summary()?.series.map(p => p.clientErrors) ?? [],
        borderColor: '#d97706', backgroundColor: '#d97706', pointRadius: 0 },
    ],
  }));
  readonly latencyData = computed<ChartData<'line'>>(() => ({
    labels: this.chartLabels(),
    datasets: [{ label: this.text().averageMs, data: this.summary()?.series.map(p => p.averageMs) ?? [],
      borderColor: '#7c3aed', backgroundColor: '#7c3aed', tension: 0.25, pointRadius: 0 }],
  }));
  readonly trafficOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 6 } } },
  };
  readonly latencyOptions: ChartConfiguration<'line'>['options'] = {
    ...this.trafficOptions,
    scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 6 } } },
  };

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.summaryRequest?.unsubscribe();
      this.logsRequest?.unsubscribe();
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platform)) return;
    this.refresh();
    interval(15000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.poll());
    fromEvent(this.document, 'visibilitychange').pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.poll());
  }

  refresh(): void {
    if (this.accessDenied()) return;
    this.loadSummary();
    this.loadLogs();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.update(value => !value);
    this.poll();
  }

  private poll(): void {
    if (!this.autoRefresh() || this.document.hidden || this.accessDenied()) return;
    if (!this.summaryLoading()) this.loadSummary();
    if (!this.logsLoading()) this.loadLogs();
  }

  private loadSummary(): void {
    this.summaryRequest?.unsubscribe();
    this.summaryLoading.set(true);
    this.summaryError.set('');
    this.summaryRequest = this.service.getSummary().subscribe({
      next: data => {
        this.summary.set(data);
        this.summaryUpdated.set(new Date());
        this.summaryLoading.set(false);
      },
      error: error => {
        this.summaryLoading.set(false);
        this.summaryError.set(this.handleError(error));
      },
    });
  }

  private loadLogs(): void {
    this.logsRequest?.unsubscribe();
    this.logsLoading.set(true);
    this.logsError.set('');
    this.logsRequest = this.service.getLogs(this.appliedFilters, this.page(), this.pageSize()).subscribe({
      next: data => {
        // Retention cleanup can remove a whole page between polls.
        const lastPage = Math.min(1000, Math.max(1, Math.ceil(data.totalCount / this.pageSize())));
        if (this.page() > lastPage) {
          this.page.set(lastPage);
          this.loadLogs();
          return;
        }
        this.logs.set(data);
        this.matchedCount.set(data.totalCount);
        this.logsUpdated.set(new Date());
        this.logsLoading.set(false);
      },
      error: error => {
        this.logsLoading.set(false);
        this.logsError.set(this.handleError(error));
      },
    });
  }

  applyFilters(): void {
    const from = this.filters.from ? new Date(this.filters.from) : null;
    const to = this.filters.to ? new Date(this.filters.to) : null;
    if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) ||
        (from && to && from > to)) {
      this.validationError.set(true);
      return;
    }
    this.validationError.set(false);
    this.appliedFilters = { ...this.filters, search: this.filters.search.trim(),
      category: this.filters.category.trim(), traceId: this.filters.traceId.trim(),
      from: from?.toISOString() ?? '', to: to?.toISOString() ?? '' };
    this.page.set(1);
    this.matchedCount.set(0);
    this.logs.set(null);
    if (!this.accessDenied()) this.loadLogs();
  }

  clearFilters(): void {
    this.filters = emptyFilters();
    this.applyFilters();
  }

  filterTrace(traceId: string): void {
    // Follow the entire request, even when the draft form has unrelated filters.
    this.filters = { ...emptyFilters(), traceId };
    this.applyFilters();
  }

  changePage(page: number): void {
    if (this.accessDenied() || page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.logs.set(null);
    this.loadLogs();
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.logs.set(null);
    if (!this.accessDenied()) this.loadLogs();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      Healthy: this.text().healthy, Unhealthy: this.text().unhealthy, Degraded: this.text().degraded,
      Unknown: this.text().unknown, Starting: this.text().starting,
      Failed: this.text().failed, Stale: this.text().stale,
      Information: this.text().information, Warning: this.text().warning,
      Error: this.text().error, Critical: this.text().critical,
    };
    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    if (['Healthy', 'Information'].includes(status)) return 'badge-success';
    if (['Unhealthy', 'Failed', 'Error', 'Critical', 'Stale'].includes(status)) return 'badge-error';
    return 'badge-warning';
  }

  private chartLabels(): string[] {
    return this.summary()?.series.map(p => new Date(p.timestamp).toLocaleTimeString(
      this.language() === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })) ?? [];
  }

  private handleError(error: unknown): string {
    if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
      this.accessDenied.set(true);
      this.autoRefresh.set(false);
      this.summary.set(null);
      this.logs.set(null);
      this.summaryRequest?.unsubscribe();
      this.logsRequest?.unsubscribe();
      this.summaryLoading.set(false);
      this.logsLoading.set(false);
      return 'access';
    }
    if (error instanceof HttpErrorResponse && error.status === 400) return 'filters';
    return 'load';
  }
}
