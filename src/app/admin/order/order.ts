import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
  DoughnutController,
} from 'chart.js';
import { OrderService } from './order-service';
import { 
  OrderDto,
  OrderSummaryDto,
  OrderUpdateStatusDto,
  OrderStatus,
  normalizeOrderStatus,
  InvoicePaymentDto
} from './order.models';
import { Observable, map, combineLatest, catchError, of } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { Dashboard } from '../dashboard/dashboard';
import { orderText } from './order.text';
import arabicLocale from '@angular/common/locales/ar-KW';

registerLocaleData(arabicLocale);

declare const window: any;

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
  DoughnutController
);

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent, BaseChartDirective],
  templateUrl: './order.html',
  styleUrl: './order.css'
})
export class Order implements OnInit {
  public orderService = inject(OrderService);
  public toastService = inject(ToastService);
  readonly language = inject(Dashboard).currentLanguage;
  readonly locale = computed(() => this.language() === 'ar' ? 'ar-KW' : 'en-US');
  readonly editableStatuses = [OrderStatus.Pending, OrderStatus.Processing, OrderStatus.Shipped,
    OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.Refunded];
  readonly orderStatuses = [...this.editableStatuses, OrderStatus.Expired, OrderStatus.RequiresReconciliation];

  t(key: keyof typeof orderText.ar): string {
    return orderText[this.language()][key];
  }

  formatChartDate(date: string): string {
    return new Date(date).toLocaleDateString(this.locale(), { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  // Signals for reactive state management
  selectedOrders = signal<number[]>([]);
  showStatusModal = signal(false);
  showDetailsModal = signal(false);
  showStatisticsModal = signal(false);
  showSalesModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(20);
  
  // Search and filter signals
  searchTerm = signal('');
  statusFilter = signal<OrderStatus | null>(null);
  userIdFilter = signal<string>('');
  sortBy = signal<string>('createdAt');
  sortDirection = signal<string>('desc');
  
  // Selected order for operations
  selectedOrder = signal<OrderDto | null>(null);
  statistics = signal<{[key: string]: number} | null>(null);
  totalSales = signal<{totalSales: number, startDate?: string, endDate?: string} | null>(null);
  salesStartDate = signal<string>('');
  salesEndDate = signal<string>('');
  
  // Chart data
  allOrdersForChart = signal<OrderSummaryDto[]>([]);
  showCharts = signal(true);
  
  // Chart filters
  chartStartDate = signal<string>('');
  chartEndDate = signal<string>('');
  chartStatusFilter = signal<OrderStatus | null>(null);
  chartTimeRange = signal<string>('all'); // all, 7days, 30days, 90days
  
  // Status update form
  statusUpdate: OrderUpdateStatusDto = {
    id: 0,
    status: OrderStatus.Pending
  };
  
  // Main data observables
  orders$: Observable<OrderSummaryDto[]> = this.orderService.orders$;
  pagination$ = this.orderService.pagination$;
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // Computed observables
  ordersLength$ = this.orders$.pipe(
    map(orders => orders.length)
  );
  
  currentPage$ = this.pagination$.pipe(
    map(pagination => pagination.currentPage)
  );
  
  totalPages$ = this.pagination$.pipe(
    map(pagination => pagination.totalPages)
  );
  
  // Computed page numbers
  pageNumbers$ = combineLatest([
    this.pagination$.pipe(map(p => p.totalPages)),
    this.pagination$.pipe(map(p => p.currentPage))
  ]).pipe(
    map(([totalPages, currentPage]) => this.getPageNumbers(totalPages, currentPage))
  );

  constructor() {
    effect(() => {
      this.language();
      this.updateChartsData();
    });
    // Set up reactive data loading
    effect(() => {
      const status = this.statusFilter();
      const pageNumber = this.currentPage();
      const pageSize = this.pageSize();
      this.loadOrders(status, pageNumber, pageSize);
    });
  }

  ngOnInit() {
    // Initial load
    this.loadAllOrdersForChart();
  }
  
  loadAllOrdersForChart() {
    // Load a large number of orders for chart visualization
    this.orderService.getOrders(null, 1, 1000).subscribe({
      next: (result) => {
        this.allOrdersForChart.set(result.items);
        this.updateChartsData();
      },
      error: (error) => {
        console.error('Error loading orders for chart:', error);
      }
    });
  }
  
  loadOrders(status: OrderStatus | null = null, pageNumber: number = 1, pageSize: number = 20) {
    this.isLoading.set(true);
    
    // If userId filter is set, load user orders
    const userId = this.userIdFilter();
    if (userId && userId.trim() !== '') {
      this.orderService.getUserOrders(userId, pageNumber, pageSize).subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastService.error(this.t('error'), this.t('loadOrdersError'));
          this.isLoading.set(false);
          console.error('Error loading orders:', error);
        }
      });
    } else {
      this.orderService.getOrders(status, pageNumber, pageSize).subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastService.error(this.t('error'), this.t('loadOrdersError'));
          this.isLoading.set(false);
          console.error('Error loading orders:', error);
        }
      });
    }
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
  }

  onSearch() {
    this.currentPage.set(1);
    const status = this.statusFilter();
    this.loadOrders(status, 1, this.pageSize());
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.userIdFilter.set('');
    this.currentPage.set(1);
    this.loadOrders(null, 1, this.pageSize());
  }

  toggleOrderSelection(orderId: number) {
    const current = this.selectedOrders();
    const index = current.indexOf(orderId);
    if (index > -1) {
      this.selectedOrders.set(current.filter(id => id !== orderId));
    } else {
      this.selectedOrders.set([...current, orderId]);
    }
  }

  toggleSelectAll() {
    this.orders$.pipe(
      map(orders => {
        const current = this.selectedOrders();
        if (current.length === orders.length) {
          this.selectedOrders.set([]);
        } else {
          this.selectedOrders.set(orders.map(o => o.id));
        }
      })
    ).subscribe();
  }

  viewDetails(orderSummary: OrderSummaryDto) {
    this.isLoading.set(true);
    this.orderService.getOrderById(orderSummary.id).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.showDetailsModal.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('loadDetailsError'));
        this.isLoading.set(false);
        console.error('Error loading order details:', error);
      }
    });
  }

  updateStatusStart(orderSummary: OrderSummaryDto) {
    const status = normalizeOrderStatus(orderSummary.status);
    if (status === null) {
      this.toastService.warning(this.t('validationError'), this.t('selectStatus'));
      return;
    }
    this.statusUpdate = {
      id: orderSummary.id,
      status
    };
    this.showStatusModal.set(true);
  }

  updateStatus() {
    const status = normalizeOrderStatus(this.statusUpdate.status);
    if (!this.statusUpdate.id || status === null || !this.editableStatuses.includes(status)) {
      this.toastService.warning(this.t('validationError'), this.t('selectStatus'));
      return;
    }

    // Ensure status is sent as a number
    const updateDto: OrderUpdateStatusDto = {
      id: this.statusUpdate.id,
      status
    };

    const loadingToastId = this.toastService.loading(this.t('updating'), this.t('updatingStatus'));
    this.isLoading.set(true);
    this.orderService.updateOrderStatus(updateDto.id, updateDto).subscribe({
      next: () => {
        this.showStatusModal.set(false);
        this.statusUpdate = { id: 0, status: OrderStatus.Pending };
        this.loadOrders(this.statusFilter(), this.currentPage(), this.pageSize());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('statusUpdated'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('updateStatusError'));
        this.isLoading.set(false);
        console.error('Error updating order status:', error);
      }
    });
  }

  cancelOrder(orderSummary: OrderSummaryDto) {
    if (!confirm(`${this.t('confirmCancel')} #${orderSummary.orderNumber}${this.language() === 'ar' ? '؟' : '?'}`)) {
      return;
    }

    const loadingToastId = this.toastService.loading(this.t('cancelling'), this.t('cancellingOrder'));
    this.isLoading.set(true);
    this.orderService.cancelOrder(orderSummary.id).subscribe({
      next: () => {
        this.loadOrders(this.statusFilter(), this.currentPage(), this.pageSize());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('orderCancelled'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('cancelOrderError'));
        this.isLoading.set(false);
        console.error('Error cancelling order:', error);
      }
    });
  }

  viewStatistics() {
    this.showStatisticsModal.set(true);
    this.isLoading.set(true);
    this.orderService.getOrderStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('loadStatisticsError'));
        this.isLoading.set(false);
        console.error('Error loading statistics:', error);
      }
    });
  }

  viewSales() {
    this.showSalesModal.set(true);
    const startDate = this.salesStartDate() ? new Date(this.salesStartDate()) : null;
    const endDate = this.salesEndDate() ? new Date(this.salesEndDate()) : null;
    
    this.isLoading.set(true);
    this.orderService.getTotalSales(startDate, endDate).subscribe({
      next: (sales) => {
        this.totalSales.set(sales);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('loadSalesError'));
        this.isLoading.set(false);
        console.error('Error loading sales:', error);
      }
    });
  }

  searchByOrderNumber() {
    const searchTerm = this.searchTerm().trim();
    if (!searchTerm) {
      this.toastService.warning(this.t('validationError'), this.t('enterOrderNumber'));
      return;
    }

    this.isLoading.set(true);
    this.orderService.getOrderByNumber(searchTerm).subscribe({
      next: (order) => {
        // Convert single order to array for display
        this.orderService.setOrders([{
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          itemCount: order.items.length,
          customerName: order.customerName,
          isActive: order.isActive
        }]);
        this.selectedOrder.set(order);
        this.showDetailsModal.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('orderNotFound'));
        this.isLoading.set(false);
        console.error('Error searching order:', error);
      }
    });
  }

  closeModals() {
    this.showStatusModal.set(false);
    this.showDetailsModal.set(false);
    this.showStatisticsModal.set(false);
    this.showSalesModal.set(false);
    this.selectedOrder.set(null);
    this.statusUpdate = { id: 0, status: OrderStatus.Pending };
  }

  getPageNumbers(totalPages: number, currentPage: number): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  getStatusBadgeClass(status: OrderStatus | string | null | undefined): string {
    switch (normalizeOrderStatus(status)) {
      case OrderStatus.Delivered:
        return 'badge-success';
      case OrderStatus.Pending:
      case OrderStatus.RequiresReconciliation:
        return 'badge-warning';
      case OrderStatus.Processing:
        return 'badge-info';
      case OrderStatus.Shipped:
        return 'badge-primary';
      case OrderStatus.Cancelled:
      case OrderStatus.Expired:
      case OrderStatus.Refunded:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getStatusName(status: OrderStatus | string | null | undefined): string {
    const keys = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
      'expired', 'requiresReconciliation'] as const;
    const normalized = normalizeOrderStatus(status);
    return normalized === null ? this.t('unknown') : this.t(keys[normalized]);
  }

  // Convert statistics object to array with formatted labels
  getStatisticsEntries(stats: {[key: string]: number}): Array<{key: string, label: string, value: number}> {
    return Object.entries(stats).map(([key, value]) => ({
      key,
      label: this.getStatusName(key),
      value
    }));
  }

  // Helper methods for template
  getCurrentPage(): number {
    let currentPage = 1;
    this.pagination$.subscribe(pagination => {
      currentPage = pagination.currentPage;
    }).unsubscribe();
    return currentPage;
  }

  getTotalPages(): number {
    let totalPages = 0;
    this.pagination$.subscribe(pagination => {
      totalPages = pagination.totalPages;
    }).unsubscribe();
    return totalPages;
  }

  getOrdersLength(): number {
    let length = 0;
    this.orders$.subscribe(orders => {
      length = orders.length;
    }).unsubscribe();
    return length;
  }

  // Make enums and utilities available in template
  OrderStatus = OrderStatus;
  Math = Math;
  Object = Object;
  
  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }

  // PDF Invoice Generation (same as user-order)
  downloadInvoice(orderId: number): void {
    this.isLoading.set(true);
    this.orderService.getInvoicePaymentData(orderId).pipe(
      catchError(error => {
        console.error('Error loading invoice data:', error);
        this.toastService.error(this.t('error'), this.t('loadInvoiceError'));
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe({
      next: async (invoiceData) => {
        if (invoiceData && invoiceData.success) {
          await this.generatePDF(invoiceData);
        } else {
          this.toastService.error(this.t('error'), this.t('loadInvoiceError'));
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private async generatePDF(invoice: InvoicePaymentDto): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const { downloadInvoicePDF } = await import('../../core/utils/invoice-pdf');
      await downloadInvoicePDF(invoice);
      this.toastService.success(this.t('success'), this.t('invoiceDownloaded'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.error(this.t('error'), this.t('generatePdfError'));
    }
  }

  public ordersByStatusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const dataArray = context.dataset.data as number[];
            const total = dataArray.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    },
    cutout: '60%'
  };

  public ordersByStatusChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(251, 191, 36, 0.8)',   // Pending - Yellow
        'rgba(59, 130, 246, 0.8)',    // Processing - Blue
        'rgba(139, 92, 246, 0.8)',    // Shipped - Purple
        'rgba(16, 185, 129, 0.8)',    // Delivered - Green
        'rgba(239, 68, 68, 0.8)',     // Cancelled - Red
        'rgba(107, 114, 128, 0.8)',   // Refunded - Gray
        'rgba(239, 68, 68, 0.8)',    // Expired - Red
        'rgba(245, 158, 11, 0.8)'    // Payment under review - Amber
      ],
      borderColor: [
        'rgb(251, 191, 36)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(16, 185, 129)',
        'rgb(239, 68, 68)',
        'rgb(107, 114, 128)'
      ],
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 4
    }]
  };

  public ordersByStatusChartType: ChartType = 'doughnut';

  // Orders Over Time Chart (Line)
  public ordersOverTimeChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8,
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      },
      line: {
        borderWidth: 3
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  public ordersOverTimeChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Orders',
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#ffffff',
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: 'rgb(59, 130, 246)',
      pointHoverBorderWidth: 2
    }]
  };

  public ordersOverTimeChartType: ChartType = 'line';

  // Revenue Over Time Chart (Bar)
  public revenueOverTimeChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        callbacks: {
          label: (context) => {
            const yValue = context.parsed?.y;
            return `${this.t('revenue')}: ${(yValue || 0).toLocaleString(this.locale())} ${this.t('currency')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8,
          callback: (value) => {
            return Number(value).toLocaleString(this.locale()) + ' ' + this.t('currency');
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  public revenueOverTimeChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Revenue',
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
      hoverBorderColor: 'rgb(16, 185, 129)',
      hoverBorderWidth: 2
    }]
  };

  public revenueOverTimeChartType: ChartType = 'bar';

  // Apply chart filters
  applyChartFilters() {
    this.updateChartsData();
  }
  
  // Clear chart filters
  clearChartFilters() {
    this.chartStartDate.set('');
    this.chartEndDate.set('');
    this.chartStatusFilter.set(null);
    this.chartTimeRange.set('all');
    this.updateChartsData();
  }
  
  // Handle time range change
  onChartTimeRangeChange(range: string) {
    this.chartTimeRange.set(range);
    
    const now = new Date();
    let startDate = '';
    
    switch(range) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'all':
      default:
        startDate = '';
        break;
    }
    
    if (startDate) {
      this.chartStartDate.set(startDate);
      this.chartEndDate.set(now.toISOString().split('T')[0]);
    } else {
      this.chartStartDate.set('');
      this.chartEndDate.set('');
    }
    
    this.updateChartsData();
  }
  
  // Filter orders for chart display
  getFilteredOrdersForChart(): OrderSummaryDto[] {
    let orders = this.allOrdersForChart();
    
    // Apply status filter
    if (this.chartStatusFilter() !== null) {
      orders = orders.filter(order => normalizeOrderStatus(order.status) === this.chartStatusFilter());
    }
    
    // Apply date range filter
    const startDate = this.chartStartDate();
    const endDate = this.chartEndDate();
    
    if (startDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(startDate);
      });
    }
    
    if (endDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        return orderDate <= endDateTime;
      });
    }
    
    return orders;
  }
  
  // Update chart data based on orders
  updateChartsData() {
    const rtl = this.language() === 'ar';
    const textDirection = rtl ? 'rtl' : 'ltr';
    for (const options of [this.ordersByStatusChartOptions, this.ordersOverTimeChartOptions, this.revenueOverTimeChartOptions]) {
      if (!options) continue;
      options.locale = this.locale();
      if (options.plugins?.legend) {
        options.plugins.legend.rtl = rtl;
        options.plugins.legend.textDirection = textDirection;
      }
      if (options.plugins?.tooltip) {
        options.plugins.tooltip.rtl = rtl;
        options.plugins.tooltip.textDirection = textDirection;
      }
    }
    this.ordersOverTimeChartData = {
      ...this.ordersOverTimeChartData,
      datasets: [{ ...this.ordersOverTimeChartData.datasets[0], label: this.t('orders') }]
    };
    this.revenueOverTimeChartData = {
      ...this.revenueOverTimeChartData,
      datasets: [{ ...this.revenueOverTimeChartData.datasets[0], label: this.t('revenue') }]
    };
    const orders = this.getFilteredOrdersForChart();
    if (orders.length === 0) {
      // Reset charts to empty state
      this.ordersByStatusChartData = {
        ...this.ordersByStatusChartData,
        labels: [],
        datasets: [{
          ...this.ordersByStatusChartData.datasets[0],
          data: []
        }]
      };
      
      this.ordersOverTimeChartData = {
        ...this.ordersOverTimeChartData,
        labels: [],
        datasets: [{
          ...this.ordersOverTimeChartData.datasets[0],
          data: []
        }]
      };
      
      this.revenueOverTimeChartData = {
        ...this.revenueOverTimeChartData,
        labels: [],
        datasets: [{
          ...this.revenueOverTimeChartData.datasets[0],
          data: []
        }]
      };
      return;
    }

    // Update Orders by Status Chart
    const statusCounts: { [key: number]: number } = {};
    Object.values(OrderStatus)
      .filter(v => !isNaN(Number(v)))
      .forEach(status => {
        statusCounts[Number(status)] = 0;
      });

    orders.forEach(order => {
      const status = normalizeOrderStatus(order.status);
      if (status !== null) statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusLabels: string[] = [];
    const statusData: number[] = [];
    Object.keys(statusCounts).forEach(statusKey => {
      const statusNum = Number(statusKey);
      if (!isNaN(statusNum) && statusCounts[statusNum] > 0) {
        statusLabels.push(this.getStatusName(statusNum));
        statusData.push(statusCounts[statusNum]);
      }
    });

    this.ordersByStatusChartData = {
      ...this.ordersByStatusChartData,
      labels: statusLabels,
      datasets: [{
        ...this.ordersByStatusChartData.datasets[0],
        data: statusData
      }]
    };

    // Update Orders Over Time Chart
    const ordersByDate: { [key: string]: number } = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
    });

    // Sort dates
    const sortedDates = Object.keys(ordersByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const ordersData = sortedDates.map(date => ordersByDate[date]);

    this.ordersOverTimeChartData = {
      ...this.ordersOverTimeChartData,
      labels: sortedDates.map(date => this.formatChartDate(date)),
      datasets: [{
        ...this.ordersOverTimeChartData.datasets[0],
        data: ordersData
      }]
    };

    // Update Revenue Over Time Chart
    const revenueByDate: { [key: string]: number } = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + order.total;
    });

    // Sort dates
    const sortedRevenueDates = Object.keys(revenueByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const revenueData = sortedRevenueDates.map(date => revenueByDate[date]);

    this.revenueOverTimeChartData = {
      ...this.revenueOverTimeChartData,
      labels: sortedRevenueDates.map(date => this.formatChartDate(date)),
      datasets: [{
        ...this.revenueOverTimeChartData.datasets[0],
        data: revenueData
      }]
    };
  }
  
  toggleCharts() {
    this.showCharts.set(!this.showCharts());
    if (this.showCharts()) {
      this.loadAllOrdersForChart();
    }
  }
}
