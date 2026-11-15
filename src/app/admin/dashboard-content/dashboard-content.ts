import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { DashService } from './dash-service';
import {
  DashboardSummaryDto,
  OrderSummaryDto,
  Period,
  TimeSeriesPointDto,
  UserSummaryDto,
} from './dash.models';

// Only the controllers/elements this dashboard actually draws.
// `Filler` is required for the area fill under the users line.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  LineController,
  BarController
);

/** Resolved chart palette, read from CSS custom properties so the theme owns the colors. */
interface ChartTheme {
  users: string;
  usersFill: string;
  revenue: string;
  grid: string;
  tick: string;
  surface: string;
  tooltipBg: string;
  tooltipFg: string;
}

const CHART_THEME_FALLBACK: ChartTheme = {
  users: '#1570C4',
  usersFill: 'rgba(21, 112, 196, 0.12)',
  revenue: '#157F57',
  grid: '#E3E8EF',
  tick: '#56637A',
  surface: '#FFFFFF',
  tooltipBg: '#0D1529',
  tooltipFg: '#F7F9FA',
};

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-content',
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './dashboard-content.html',
  styleUrl: './dashboard-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardContent implements OnInit {
  private readonly dashService = inject(DashService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ---------------------------------------------------------------- language

  readonly currentLanguage = signal<'ar' | 'en'>('ar');

  readonly translations = {
    ar: {
      dashboardOverview: 'نظرة عامة',
      welcomeMessage: 'ملخص حالة المنصة والنشاط الأخير',
      lastUpdated: 'آخر تحديث',
      never: 'لم يتم التحديث بعد',
      exportReport: 'تصدير CSV',
      refresh: 'تحديث',
      refreshing: 'جاري التحديث…',
      period: 'الفترة الزمنية',
      periodHint: 'تسري على كل الرسوم البيانية',
      totalUsers: 'إجمالي المستخدمين',
      totalOrders: 'إجمالي الطلبات',
      transactions: 'المعاملات',
      totalSales: 'إجمالي المبيعات',
      vsLastMonth: 'مقارنة بالشهر الماضي',
      increase: 'ارتفاع',
      decrease: 'انخفاض',
      noChange: 'بدون تغيير',
      userGrowthAnalytics: 'نمو المستخدمين',
      trackUserRegistration: 'عدد المستخدمين التراكمي خلال الفترة المحددة',
      revenueAnalytics: 'الإيرادات',
      transactionRevenue: 'قيمة المعاملات خلال الفترة المحددة',
      growth: 'نمو',
      vsFirstPeriod: 'من بداية الفترة',
      recentRegistrations: 'أحدث التسجيلات',
      latestUserSignups: 'آخر المستخدمين المسجلين',
      noRecentUsers: 'لا يوجد مستخدمون جدد',
      user: 'مستخدم',
      verified: 'موثق',
      pending: 'قيد الانتظار',
      viewAll: 'عرض الكل',
      recentOrder: 'أحدث الطلبات',
      latestJobOpportunities: 'آخر الطلبات الواردة',
      noRecentOrders: 'لا توجد طلبات حديثة',
      items: 'عنصر',
      firstPeriod: 'بداية الفترة',
      latestPeriod: 'نهاية الفترة',
      growthRate: 'معدل النمو',
      totalUsersLabel: 'المستخدمون',
      revenue: 'الإيرادات',
      unknownUser: 'مستخدم غير معروف',
      unknown: 'غير معروف',
      pendingStatus: 'قيد الانتظار',
      processingStatus: 'قيد المعالجة',
      shippedStatus: 'تم الشحن',
      deliveredStatus: 'تم التسليم',
      cancelledStatus: 'ملغي',
      day: 'يوم',
      days: 'أيام',
      hour: 'ساعة',
      hours: 'ساعات',
      minute: 'دقيقة',
      minutes: 'دقائق',
      justNow: 'الآن',
      ago: 'منذ',
      loadFailed: 'تعذر تحميل البيانات',
      retry: 'إعادة المحاولة',
      loading: 'جاري التحميل',
      showTable: 'عرض كجدول',
      hideTable: 'إخفاء الجدول',
      date: 'التاريخ',
      value: 'القيمة',
      chartSummaryUsers: 'رسم خطي لعدد المستخدمين التراكمي',
      chartSummaryRevenue: 'رسم بياني لقيمة الإيرادات',
      status: 'الحالة',
      order: 'طلب',
    },
    en: {
      dashboardOverview: 'Overview',
      welcomeMessage: 'Platform totals and the latest activity',
      lastUpdated: 'Last updated',
      never: 'Not loaded yet',
      exportReport: 'Export CSV',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      period: 'Date range',
      periodHint: 'Applies to both charts',
      totalUsers: 'Total users',
      totalOrders: 'Total orders',
      transactions: 'Transactions',
      totalSales: 'Total sales',
      vsLastMonth: 'vs last month',
      increase: 'up',
      decrease: 'down',
      noChange: 'no change',
      userGrowthAnalytics: 'User growth',
      trackUserRegistration: 'Cumulative users over the selected range',
      revenueAnalytics: 'Revenue',
      transactionRevenue: 'Transaction value over the selected range',
      growth: 'growth',
      vsFirstPeriod: 'since range start',
      recentRegistrations: 'Recent registrations',
      latestUserSignups: 'Newest registered users',
      noRecentUsers: 'No new users',
      user: 'User',
      verified: 'Verified',
      pending: 'Pending',
      viewAll: 'View all',
      recentOrder: 'Recent orders',
      latestJobOpportunities: 'Latest incoming orders',
      noRecentOrders: 'No recent orders',
      items: 'items',
      firstPeriod: 'Range start',
      latestPeriod: 'Range end',
      growthRate: 'Growth rate',
      totalUsersLabel: 'Users',
      revenue: 'Revenue',
      unknownUser: 'Unknown user',
      unknown: 'Unknown',
      pendingStatus: 'Pending',
      processingStatus: 'Processing',
      shippedStatus: 'Shipped',
      deliveredStatus: 'Delivered',
      cancelledStatus: 'Cancelled',
      day: 'day',
      days: 'days',
      hour: 'hour',
      hours: 'hours',
      minute: 'minute',
      minutes: 'minutes',
      justNow: 'just now',
      ago: 'ago',
      loadFailed: 'Could not load this data',
      retry: 'Retry',
      loading: 'Loading',
      showTable: 'Show as table',
      hideTable: 'Hide table',
      date: 'Date',
      value: 'Value',
      chartSummaryUsers: 'Line chart of cumulative users',
      chartSummaryRevenue: 'Chart of revenue value',
      status: 'Status',
      order: 'Order',
    },
  } as const;

  t(key: string): string {
    const dict = this.translations[this.currentLanguage()] as Record<string, string>;
    return dict[key] ?? key;
  }

  /** Locale for dates. Numbers force Latin digits so metrics and axes stay aligned. */
  private get dateLocale(): string {
    return this.currentLanguage() === 'ar' ? 'ar-SA' : 'en-US';
  }
  private get numberLocale(): string {
    return this.currentLanguage() === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  }

  // ------------------------------------------------------------------- state

  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly lastOrders = signal<OrderSummaryDto[]>([]);
  readonly lastUsers = signal<UserSummaryDto[]>([]);
  readonly usersSeries = signal<TimeSeriesPointDto[]>([]);
  readonly revenueSeries = signal<TimeSeriesPointDto[]>([]);
  readonly selectedPeriod = signal<Period>('30d');
  readonly lastUpdatedAt = signal<Date | null>(null);

  readonly summaryState = signal<LoadState>('loading');
  readonly usersChartState = signal<LoadState>('loading');
  readonly revenueChartState = signal<LoadState>('loading');
  readonly recentUsersState = signal<LoadState>('loading');
  readonly recentOrdersState = signal<LoadState>('loading');

  /**
   * True once the page has rendered real data. Before that a section shows a
   * skeleton; after it, a refetch dims the existing render instead of flashing
   * a skeleton and shifting the layout.
   */
  readonly hasRendered = signal(false);

  readonly isBusy = computed(
    () =>
      this.summaryState() === 'loading' ||
      this.usersChartState() === 'loading' ||
      this.revenueChartState() === 'loading'
  );

  readonly displayPeriods: readonly Period[] = ['7d', '30d', '90d', '180d', '1y'];

  /** Stable arrays so skeleton loops don't allocate on every change detection. */
  readonly kpiSkeletons: readonly number[] = [1, 2, 3, 4];
  readonly rowSkeletons: readonly number[] = [1, 2, 3, 4, 5];

  readonly showUsersTable = signal(false);
  readonly showRevenueTable = signal(false);

  /** Bumped whenever the active theme changes, so chart colors are re-read. */
  private readonly themeVersion = signal(0);
  private readonly prefersReducedMotion = signal(false);

  // ---------------------------------------------------------------- lifecycle

  ngOnInit(): void {
    this.detectLanguage();
    this.watchDocument();
    this.watchMediaPreferences();
    this.loadAll();
  }

  /**
   * The shell writes `lang`/`dir` (and a theme may write `data-theme`) onto
   * <html>. Observing those attributes replaces the old 1s polling interval.
   */
  private watchDocument(): void {
    if (!this.isBrowser) return;
    const observer = new MutationObserver(() => {
      this.detectLanguage();
      this.themeVersion.update((v) => v + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'dir', 'data-theme', 'class'],
    });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private watchMediaPreferences(): void {
    if (!this.isBrowser || typeof window.matchMedia !== 'function') return;

    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const onDark = () => this.themeVersion.update((v) => v + 1);
    dark.addEventListener('change', onDark);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => this.prefersReducedMotion.set(motion.matches);
    this.prefersReducedMotion.set(motion.matches);
    motion.addEventListener('change', onMotion);

    this.destroyRef.onDestroy(() => {
      dark.removeEventListener('change', onDark);
      motion.removeEventListener('change', onMotion);
    });
  }

  private detectLanguage(): void {
    if (!this.isBrowser) return;
    const html = document.documentElement;
    const isArabic = html.lang === 'ar' || html.dir === 'rtl';
    this.currentLanguage.set(isArabic ? 'ar' : 'en');
  }

  // ------------------------------------------------------------- data loading

  loadAll(): void {
    this.loadSummary();
    this.loadRecentUsers();
    this.loadRecentOrders();
    this.loadCharts();
  }

  loadSummary(): void {
    this.summaryState.set('loading');
    this.dashService
      .getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.summary.set(data);
          this.summaryState.set('ready');
          this.hasRendered.set(true);
          this.lastUpdatedAt.set(new Date());
        },
        error: () => this.summaryState.set('error'),
      });
  }

  loadRecentUsers(): void {
    this.recentUsersState.set('loading');
    this.dashService
      .getLastUsers(5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.lastUsers.set(data);
          this.recentUsersState.set('ready');
        },
        error: () => this.recentUsersState.set('error'),
      });
  }

  loadRecentOrders(): void {
    this.recentOrdersState.set('loading');
    this.dashService
      .getLastOrders(5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.lastOrders.set(data);
          this.recentOrdersState.set('ready');
        },
        error: () => this.recentOrdersState.set('error'),
      });
  }

  loadCharts(): void {
    this.usersChartState.set('loading');
    this.revenueChartState.set('loading');
    const period = this.selectedPeriod();

    this.dashService
      .getUsersChart(period)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.usersSeries.set(data);
          this.usersChartState.set('ready');
        },
        error: () => this.usersChartState.set('error'),
      });

    this.dashService
      .getTransactionsChart(period)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.revenueSeries.set(data);
          this.revenueChartState.set('ready');
        },
        error: () => this.revenueChartState.set('error'),
      });
  }

  onPeriodChange(period: Period): void {
    if (this.selectedPeriod() === period) return;
    this.selectedPeriod.set(period);
    this.loadCharts();
  }

  refreshData(): void {
    this.loadAll();
  }

  // ------------------------------------------------------------------- totals

  readonly totalUsers = computed(() => this.summary()?.users.total ?? 0);
  readonly totalOrders = computed(() => this.summary()?.orders.total ?? 0);
  readonly totalTransactions = computed(() => this.summary()?.transactions.total ?? 0);
  readonly totalSales = computed(() => this.summary()?.sales.total ?? 0);

  private growth(total: number | undefined, lastMonth: number | undefined): number {
    if (!total || !lastMonth) return 0;
    return Math.round(((total - lastMonth) / lastMonth) * 100);
  }

  readonly userGrowth = computed(() =>
    this.growth(this.summary()?.users.total, this.summary()?.users.lastMonth)
  );
  readonly orderGrowth = computed(() =>
    this.growth(this.summary()?.orders.total, this.summary()?.orders.lastMonth)
  );
  readonly transactionGrowth = computed(() =>
    this.growth(this.summary()?.transactions.total, this.summary()?.transactions.lastMonth)
  );
  readonly salesGrowth = computed(() =>
    this.growth(this.summary()?.sales.total, this.summary()?.sales.lastMonth)
  );

  /** KPI tiles, as data, so the template stays a single loop. */
  readonly kpis = computed(() => [
    {
      key: 'users',
      label: this.t('totalUsers'),
      value: this.formatNumber(this.totalUsers()),
      delta: this.userGrowth(),
      link: '/admin/user-management',
      accent: 'users' as const,
    },
    {
      key: 'orders',
      label: this.t('totalOrders'),
      value: this.formatNumber(this.totalOrders()),
      delta: this.orderGrowth(),
      link: '/admin/order',
      accent: 'orders' as const,
    },
    {
      key: 'transactions',
      label: this.t('transactions'),
      value: this.formatNumber(this.totalTransactions()),
      delta: this.transactionGrowth(),
      link: '/admin/transaction',
      accent: 'transactions' as const,
    },
    {
      key: 'sales',
      label: this.t('totalSales'),
      value: this.formatCurrency(this.totalSales()),
      delta: this.salesGrowth(),
      link: '/admin/transaction',
      accent: 'sales' as const,
    },
  ]);

  // ------------------------------------------------------------ chart summary

  private readonly usersCumulative = computed(() => {
    let running = 0;
    return this.usersSeries().map((point) => (running += point.count));
  });

  readonly usersGrowthRate = computed(() => {
    const values = this.usersCumulative();
    if (values.length < 2) return 0;
    const first = values[0];
    return first === 0 ? 0 : Math.round(((values[values.length - 1] - first) / first) * 100);
  });

  readonly usersLatestTotal = computed(() => {
    const values = this.usersCumulative();
    return values.length ? values[values.length - 1] : 0;
  });

  readonly revenueFirstValue = computed(() => this.revenueSeries()[0]?.count ?? 0);
  readonly revenueLastValue = computed(() => {
    const series = this.revenueSeries();
    return series.length ? series[series.length - 1].count : 0;
  });
  readonly revenueGrowthRate = computed(() => {
    const first = this.revenueFirstValue();
    if (!first) return 0;
    return Math.round(((this.revenueLastValue() - first) / first) * 100);
  });

  /** Table-view twin rows — every charted value is readable without hovering. */
  readonly usersTableRows = computed(() => {
    const cumulative = this.usersCumulative();
    return this.usersSeries().map((point, i) => ({
      date: this.formatDate(point.date),
      value: this.formatNumber(cumulative[i]),
    }));
  });

  readonly revenueTableRows = computed(() =>
    this.revenueSeries().map((point) => ({
      date: this.formatDate(point.date),
      value: this.formatCurrency(point.count),
    }))
  );

  // -------------------------------------------------------------- chart theme

  private readonly chartTheme = computed<ChartTheme>(() => {
    this.themeVersion();
    if (!this.isBrowser) return CHART_THEME_FALLBACK;

    const styles = getComputedStyle(this.host.nativeElement);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    return {
      users: read('--chart-users', CHART_THEME_FALLBACK.users),
      usersFill: read('--chart-users-fill', CHART_THEME_FALLBACK.usersFill),
      revenue: read('--chart-revenue', CHART_THEME_FALLBACK.revenue),
      grid: read('--chart-grid', CHART_THEME_FALLBACK.grid),
      tick: read('--chart-tick', CHART_THEME_FALLBACK.tick),
      surface: read('--chart-surface', CHART_THEME_FALLBACK.surface),
      tooltipBg: read('--chart-tooltip-bg', CHART_THEME_FALLBACK.tooltipBg),
      tooltipFg: read('--chart-tooltip-fg', CHART_THEME_FALLBACK.tooltipFg),
    };
  });

  private readonly animationDuration = computed(() => (this.prefersReducedMotion() ? 0 : 420));

  private readonly chartLabels = computed(() =>
    this.usersSeries().map((point) => this.formatDate(point.date))
  );

  private baseOptions(theme: ChartTheme, formatTick: (value: number) => string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      // Hovering anywhere in a column reads that column: no pinpoint targets.
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipFg,
          bodyColor: theme.tooltipFg,
          borderWidth: 0,
          cornerRadius: 8,
          padding: 10,
          displayColors: false,
          titleFont: { size: 12, weight: 'normal' },
          bodyFont: { size: 13, weight: 'bold' },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          border: { display: false },
          // Solid hairline grid, one shade off the surface.
          grid: { color: theme.grid, drawTicks: false },
          ticks: {
            color: theme.tick,
            font: { size: 11 },
            padding: 8,
            maxTicksLimit: 5,
            callback: (value) => formatTick(Number(value)),
          },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: theme.tick,
            font: { size: 11 },
            padding: 8,
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
      },
      animation: { duration: this.animationDuration() },
    };
  }

  readonly usersChartOptions = computed<ChartOptions<'line'>>(() => {
    const theme = this.chartTheme();
    const options = this.baseOptions(theme, (v) => this.formatCompact(v)) as ChartOptions<'line'>;
    options.plugins!.tooltip!.callbacks = {
      label: (ctx) => `${this.t('totalUsersLabel')}: ${this.formatNumber(Number(ctx.parsed.y))}`,
    };
    return options;
  });

  readonly usersChartData = computed<ChartData<'line'>>(() => {
    const theme = this.chartTheme();
    return {
      labels: this.chartLabels(),
      datasets: [
        {
          data: this.usersCumulative(),
          label: this.t('totalUsersLabel'),
          borderColor: theme.users,
          backgroundColor: theme.usersFill,
          borderWidth: 2,
          tension: 0.32,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 14,
          pointBackgroundColor: theme.users,
          // 2px surface ring keeps the hovered point legible over the fill.
          pointHoverBorderColor: theme.surface,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: theme.users,
        },
      ],
    };
  });

  /**
   * Bars read well for a month; past ~31 points they collapse into noise, so
   * long ranges render as a line instead.
   */
  readonly revenueChartType = computed<'bar' | 'line'>(() =>
    this.revenueSeries().length > 31 ? 'line' : 'bar'
  );

  readonly revenueChartOptions = computed<ChartOptions<'bar' | 'line'>>(() => {
    const theme = this.chartTheme();
    const options = this.baseOptions(theme, (v) => this.formatCompact(v)) as ChartOptions<
      'bar' | 'line'
    >;
    options.plugins!.tooltip!.callbacks = {
      label: (ctx) => `${this.t('revenue')}: ${this.formatCurrency(Number(ctx.parsed.y))}`,
    };
    return options;
  });

  readonly revenueChartData = computed<ChartData<'bar' | 'line'>>(() => {
    const theme = this.chartTheme();
    const labels = this.revenueSeries().map((point) => this.formatDate(point.date));
    const data = this.revenueSeries().map((point) => point.count);
    const label = this.t('revenue');

    if (this.revenueChartType() === 'line') {
      const dataset: ChartDataset<'line'> = {
        type: 'line',
        data,
        label,
        borderColor: theme.revenue,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.32,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 14,
        pointBackgroundColor: theme.revenue,
        pointHoverBorderColor: theme.surface,
        pointHoverBorderWidth: 2,
      };
      return { labels, datasets: [dataset] };
    }

    const dataset: ChartDataset<'bar'> = {
      type: 'bar',
      data,
      label,
      backgroundColor: theme.revenue,
      borderWidth: 0,
      // 4px rounded data-end, anchored to the baseline.
      borderRadius: 4,
      borderSkipped: 'bottom',
      // Leaves a surface gap between adjacent bars instead of drawing borders.
      categoryPercentage: 0.78,
      barPercentage: 0.82,
      maxBarThickness: 28,
    };
    return { labels, datasets: [dataset] };
  });

  /** Spoken summary so the canvas is not an unlabelled image. */
  readonly usersChartAria = computed(() => {
    const series = this.usersSeries();
    if (!series.length) return this.t('chartSummaryUsers');
    return `${this.t('chartSummaryUsers')}. ${this.formatDate(series[0].date)} – ${this.formatDate(
      series[series.length - 1].date
    )}. ${this.t('latestPeriod')}: ${this.formatNumber(this.usersLatestTotal())}. ${this.t(
      'growth'
    )}: ${this.usersGrowthRate()}%.`;
  });

  readonly revenueChartAria = computed(() => {
    const series = this.revenueSeries();
    if (!series.length) return this.t('chartSummaryRevenue');
    return `${this.t('chartSummaryRevenue')}. ${this.formatDate(
      series[0].date
    )} – ${this.formatDate(series[series.length - 1].date)}. ${this.t(
      'firstPeriod'
    )}: ${this.formatCurrency(this.revenueFirstValue())}. ${this.t(
      'latestPeriod'
    )}: ${this.formatCurrency(this.revenueLastValue())}. ${this.t(
      'growthRate'
    )}: ${this.revenueGrowthRate()}%.`;
  });

  // --------------------------------------------------------------- formatting

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.numberLocale).format(value ?? 0);
  }

  formatCompact(value: number): string {
    return new Intl.NumberFormat(this.numberLocale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value ?? 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.numberLocale, {
      style: 'currency',
      currency: 'KWD',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(this.dateLocale, { month: 'short', day: 'numeric' });
  }

  readonly lastUpdatedLabel = computed(() => {
    const at = this.lastUpdatedAt();
    if (!at) return this.t('never');
    return at.toLocaleTimeString(this.dateLocale, { hour: '2-digit', minute: '2-digit' });
  });

  getTimeAgo(date: string): string {
    const past = new Date(date).getTime();
    if (Number.isNaN(past)) return this.t('unknown');

    const minutes = Math.floor((Date.now() - past) / 60000);
    if (minutes < 1) return this.t('justNow');
    if (minutes < 60) {
      return `${this.t('ago')} ${minutes} ${this.t(minutes === 1 ? 'minute' : 'minutes')}`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${this.t('ago')} ${hours} ${this.t(hours === 1 ? 'hour' : 'hours')}`;
    }
    const days = Math.floor(hours / 24);
    return `${this.t('ago')} ${days} ${this.t(days === 1 ? 'day' : 'days')}`;
  }

  getInitials(user: UserSummaryDto): string {
    const source = user.username || user.email || 'U';
    return source.slice(0, 2).toUpperCase();
  }

  // Status carries an icon and a text label in the template; color is secondary.
  getOrderStatusBadgeClass(status: number): string {
    switch (status) {
      case 0:
        return 'badge-warning';
      case 1:
        return 'badge-info';
      case 2:
        return 'badge-primary';
      case 3:
        return 'badge-success';
      case 4:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getOrderStatusText(status: number): string {
    switch (status) {
      case 0:
        return this.t('pendingStatus');
      case 1:
        return this.t('processingStatus');
      case 2:
        return this.t('shippedStatus');
      case 3:
        return this.t('deliveredStatus');
      case 4:
        return this.t('cancelledStatus');
      default:
        return this.t('unknown');
    }
  }

  deltaLabel(delta: number): string {
    if (delta > 0) return this.t('increase');
    if (delta < 0) return this.t('decrease');
    return this.t('noChange');
  }

  // -------------------------------------------------------------------- export

  /** Downloads the data currently on screen — no server round trip. */
  exportReport(): void {
    if (!this.isBrowser) return;

    const rows: string[][] = [
      ['metric', 'date', 'value'],
      ['total_users', '', String(this.totalUsers())],
      ['total_orders', '', String(this.totalOrders())],
      ['total_transactions', '', String(this.totalTransactions())],
      ['total_sales', '', String(this.totalSales())],
      ...this.usersSeries().map((p, i) => [
        'users_cumulative',
        p.date,
        String(this.usersCumulative()[i]),
      ]),
      ...this.revenueSeries().map((p) => ['revenue', p.date, String(p.count)]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${this.selectedPeriod()}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
