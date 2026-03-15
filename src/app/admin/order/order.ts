import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  InvoicePaymentDto
} from './order.models';
import { Observable, map, combineLatest, catchError, of } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

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
          this.toastService.error('Error', 'Failed to load orders');
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
          this.toastService.error('Error', 'Failed to load orders');
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
        this.toastService.error('Error', 'Failed to load order details');
        this.isLoading.set(false);
        console.error('Error loading order details:', error);
      }
    });
  }

  updateStatusStart(orderSummary: OrderSummaryDto) {
    this.statusUpdate = {
      id: orderSummary.id,
      status: orderSummary.status
    };
    this.showStatusModal.set(true);
  }

  updateStatus() {
    if (!this.statusUpdate.id || this.statusUpdate.status === undefined) {
      this.toastService.warning('Validation Error', 'Please select a valid status');
      return;
    }

    // Ensure status is sent as a number
    const updateDto: OrderUpdateStatusDto = {
      id: this.statusUpdate.id,
      status: typeof this.statusUpdate.status === 'string' ? parseInt(this.statusUpdate.status, 10) : this.statusUpdate.status
    };

    const loadingToastId = this.toastService.loading('Updating', 'Updating order status...');
    this.isLoading.set(true);
    this.orderService.updateOrderStatus(updateDto.id, updateDto).subscribe({
      next: () => {
        this.showStatusModal.set(false);
        this.statusUpdate = { id: 0, status: OrderStatus.Pending };
        this.loadOrders(this.statusFilter(), this.currentPage(), this.pageSize());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Order status updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update order status');
        this.isLoading.set(false);
        console.error('Error updating order status:', error);
      }
    });
  }

  cancelOrder(orderSummary: OrderSummaryDto) {
    if (!confirm(`Are you sure you want to cancel order #${orderSummary.orderNumber}?`)) {
      return;
    }

    const loadingToastId = this.toastService.loading('Cancelling', 'Cancelling order...');
    this.isLoading.set(true);
    this.orderService.cancelOrder(orderSummary.id).subscribe({
      next: () => {
        this.loadOrders(this.statusFilter(), this.currentPage(), this.pageSize());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Order cancelled successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', error.error?.message || 'Failed to cancel order');
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
        this.toastService.error('Error', 'Failed to load statistics');
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
        this.toastService.error('Error', 'Failed to load sales data');
        this.isLoading.set(false);
        console.error('Error loading sales:', error);
      }
    });
  }

  searchByOrderNumber() {
    const searchTerm = this.searchTerm().trim();
    if (!searchTerm) {
      this.toastService.warning('Validation Error', 'Please enter an order number');
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
        this.toastService.error('Error', error.error?.message || 'Order not found');
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

  getStatusBadgeClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Delivered:
        return 'badge-success';
      case OrderStatus.Pending:
        return 'badge-warning';
      case OrderStatus.Processing:
        return 'badge-info';
      case OrderStatus.Shipped:
        return 'badge-primary';
      case OrderStatus.Cancelled:
      case OrderStatus.Refunded:
        return 'badge-error';
      default:
        return 'badge-info';
    }
  }

  getStatusName(status: OrderStatus | string | number): string {
    // If it's already a string and it's a valid status name, return it
    if (typeof status === 'string') {
      const statusName = status as keyof typeof OrderStatus;
      if (OrderStatus[statusName] !== undefined) {
        return statusName;
      }
      // Try to parse as number
      const numStatus = parseInt(status, 10);
      if (!isNaN(numStatus) && OrderStatus[numStatus] !== undefined) {
        return OrderStatus[numStatus];
      }
      return status; // Return the string as-is if it's a valid status name
    }
    
    // If it's a number, get the status name from enum
    const numStatus = typeof status === 'number' ? status : parseInt(String(status), 10);
    if (!isNaN(numStatus)) {
      return OrderStatus[numStatus] || 'Unknown';
    }
    
    return 'Unknown';
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
        this.toastService.error('Error', 'Failed to load invoice data');
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe({
      next: async (invoiceData) => {
        if (invoiceData && invoiceData.success) {
          await this.generatePDF(invoiceData);
        } else {
          this.toastService.error('Error', invoiceData?.message || 'Failed to load invoice data');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private async generatePDF(invoice: InvoicePaymentDto): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.jspdf) {
        this.toastService.error('Error', 'PDF library not available');
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const invoiceHTML = this.createInvoiceHTML(invoice);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0px';
      iframe.style.width = '210mm';
      iframe.style.height = 'auto';
      iframe.style.minHeight = '297mm';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.srcdoc = invoiceHTML;
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      const images = iframeDoc.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });
      await Promise.all(imagePromises);

      await new Promise(resolve => setTimeout(resolve, 100));

      const invoiceContainer = iframeDoc.querySelector('.invoice-container') as HTMLElement;
      if (!invoiceContainer) {
        throw new Error('Invoice container not found');
      }

      const actualHeight = Math.max(
        invoiceContainer.scrollHeight,
        invoiceContainer.offsetHeight,
        iframeDoc.body.scrollHeight,
        iframeDoc.body.offsetHeight,
        iframeDoc.documentElement.scrollHeight,
        iframeDoc.documentElement.offsetHeight
      );
      iframe.style.height = `${actualHeight}px`;
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(invoiceContainer, {
        scale: 6,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: invoiceContainer.scrollWidth,
        height: invoiceContainer.scrollHeight,
        windowWidth: invoiceContainer.scrollWidth,
        windowHeight: invoiceContainer.scrollHeight,
        allowTaint: false,
        ignoreElements: () => false
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const widthRatio = pdfWidth / imgWidth;
      const ratio = widthRatio;
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      if (imgScaledHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgScaledWidth, imgScaledHeight, undefined, 'FAST');
      } else {
        const totalPages = Math.ceil(imgScaledHeight / pdfHeight);
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          const sourceY = Math.floor((page * pdfHeight) / ratio);
          const remainingHeight = imgHeight - sourceY;
          const sourceHeight = Math.min(Math.ceil(pdfHeight / ratio), remainingHeight);
          if (sourceY >= imgHeight || sourceHeight <= 0) {
            break;
          }
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
              canvas,
              0, sourceY, imgWidth, sourceHeight,
              0, 0, imgWidth, sourceHeight
            );
            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
            const pageScaledHeight = sourceHeight * ratio;
            pdf.addImage(pageImgData, 'JPEG', 0, 0, imgScaledWidth, pageScaledHeight, undefined, 'FAST');
          }
        }
      }

      const fileName = `Invoice_${invoice.orderNumber}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      this.toastService.success('Success', 'Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.error('Error', 'Failed to generate PDF');
    }
  }

  private createInvoiceHTML(invoice: InvoicePaymentDto): string {
    const orderDate = new Date(invoice.orderCreatedAt);
    const address = invoice.shippingAddress;

    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const getStatusTextArabic = (status: OrderStatus): string => {
      const statusMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'قيد الانتظار',
        [OrderStatus.Processing]: 'قيد المعالجة',
        [OrderStatus.Shipped]: 'تم الشحن',
        [OrderStatus.Delivered]: 'تم التسليم',
        [OrderStatus.Cancelled]: 'ملغي',
        [OrderStatus.Refunded]: 'مسترد'
      };
      return statusMap[status] ?? '';
    };

    const getStatusBgColor = (status: OrderStatus): string => {
      const colorMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'rgb(255, 193, 7)',
        [OrderStatus.Processing]: 'rgb(13, 110, 253)',
        [OrderStatus.Shipped]: 'rgb(13, 202, 240)',
        [OrderStatus.Delivered]: 'rgb(25, 135, 84)',
        [OrderStatus.Cancelled]: 'rgb(220, 53, 69)',
        [OrderStatus.Refunded]: 'rgb(107, 114, 128)'
      };
      return colorMap[status] ?? 'rgb(108, 117, 125)';
    };

    const getStatusTextColor = (status: OrderStatus): string => {
      const colorMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'rgb(0, 0, 0)',
        [OrderStatus.Processing]: 'rgb(255, 255, 255)',
        [OrderStatus.Shipped]: 'rgb(255, 255, 255)',
        [OrderStatus.Delivered]: 'rgb(255, 255, 255)',
        [OrderStatus.Cancelled]: 'rgb(255, 255, 255)',
        [OrderStatus.Refunded]: 'rgb(255, 255, 255)'
      };
      return colorMap[status] ?? 'rgb(255, 255, 255)';
    };

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; height: auto; }
          body { font-family: Arial, DejaVu Sans, Tahoma, sans-serif; direction: rtl; color: rgb(0, 0, 0); background-color: rgb(255, 255, 255); padding: 0; margin: 0; overflow: visible; height: auto; }
          .invoice-container { width: 100%; max-width: 210mm; margin: 0 auto; background-color: rgb(255, 255, 255); box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); position: relative; min-height: 297mm; z-index: 1; }
          .header { background-color: rgb(5, 66, 57); color: rgb(255, 255, 255); padding: 30px 20px; text-align: center; width: 100%; margin: 0; position: relative; }
          .header h1 { font-size: 28px; margin: 0; font-weight: bold; }
          .header h2 { font-size: 18px; font-weight: normal; margin: 0; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.08; z-index: 0; pointer-events: none; max-width: 600px; max-height: 600px; width: auto; height: auto; }
          .invoice-info { padding: 25px 20px; background-color: rgb(250, 250, 250); border-bottom: 3px solid rgb(5, 66, 57); }
          .invoice-info-row { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
          .invoice-info-row:last-child { margin-bottom: 0; }
          .invoice-info-label { font-weight: bold; color: rgb(5, 66, 57); font-size: 14px; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-right: 5px; }
          .section { padding: 25px 20px; border-bottom: 1px solid rgb(230, 230, 230); background-color: rgb(255, 255, 255); }
          .section:last-of-type { border-bottom: none; }
          .section-title { font-size: 18px; font-weight: bold; color: rgb(5, 66, 57); margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid rgb(5, 66, 57); display: inline-block; width: 100%; }
          .customer-info, .address-info { line-height: 1.8; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .items-table thead { background-color: rgb(5, 66, 57); color: rgb(255, 255, 255); }
          .items-table th { padding: 12px; text-align: right; font-weight: bold; }
          .items-table td { padding: 10px 12px; border-bottom: 1px solid rgb(224, 224, 224); }
          .items-table tbody tr:nth-child(even) { background-color: rgb(245, 245, 245); }
          .summary { padding: 25px 20px; text-align: left; background-color: rgb(250, 250, 250); }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; font-size: 14px; }
          .summary-label { font-weight: bold; color: rgb(60, 60, 60); }
          .summary-row-discount { color: rgb(0, 160, 0); font-weight: bold; }
          .summary-total { border-top: 3px solid rgb(5, 66, 57); padding-top: 15px; margin-top: 15px; background-color: rgb(5, 66, 57); color: rgb(255, 255, 255); padding: 20px; border-radius: 0; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; }
          .footer { text-align: center; padding: 25px 20px; color: rgb(102, 102, 102); font-size: 13px; background-color: rgb(255, 255, 255); border-top: 1px solid rgb(230, 230, 230); }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <img src="/logo.png" alt="الجوهرة" class="watermark" />
          <div class="header"><h1>الجوهرة</h1><h2>فاتورة</h2></div>
          <div class="invoice-info">
            <div class="invoice-info-row">
              <div><span class="invoice-info-label">رقم الفاتورة:</span> ${escapeHtml(invoice.orderNumber)}</div>
              <div><span class="invoice-info-label">الحالة:</span> <span class="status-badge" style="background-color: ${getStatusBgColor(invoice.status)}; color: ${getStatusTextColor(invoice.status)};">${escapeHtml(getStatusTextArabic(invoice.status))}</span></div>
            </div>
            <div class="invoice-info-row"><div><span class="invoice-info-label">تاريخ الطلب:</span> ${escapeHtml(orderDate.toLocaleDateString('ar-SA'))}</div></div>
          </div>
          <div class="section">
            <div class="section-title">معلومات العميل</div>
            <div class="customer-info">
              <div><strong>الاسم:</strong> ${escapeHtml(invoice.customerName)}</div>
              ${invoice.customerPhone ? `<div><strong>الهاتف:</strong> ${escapeHtml(invoice.customerPhone)}</div>` : ''}
              ${invoice.customerEmail ? `<div><strong>البريد الإلكتروني:</strong> ${escapeHtml(invoice.customerEmail)}</div>` : ''}
            </div>
          </div>
          <div class="section">
            <div class="section-title">عنوان الشحن</div>
            <div class="address-info">
              <div><strong>الاسم:</strong> ${escapeHtml(address.fullName)}</div>
              <div><strong>الهاتف:</strong> ${escapeHtml(address.phone)}</div>
              ${address.state ? `<div><strong>المحافظة:</strong> ${escapeHtml(address.state)}</div>` : ''}
              <div><strong>المدينة:</strong> ${escapeHtml(address.city)}</div>
              ${address.alQataa ? `<div><strong>القطعة:</strong> ${escapeHtml(address.alQataa)}</div>` : ''}
              ${address.street ? `<div><strong>الشارع:</strong> ${escapeHtml(address.street)}</div>` : ''}
              ${address.alSharee ? `<div><strong>الشارع:</strong> ${escapeHtml(address.alSharee)}</div>` : ''}
              ${address.alJada ? `<div><strong>الجادة:</strong> ${escapeHtml(address.alJada)}</div>` : ''}
              ${address.alManzil ? `<div><strong>المنزل:</strong> ${escapeHtml(address.alManzil)}</div>` : ''}
              ${address.alShakka ? `<div><strong>الشقة:</strong> ${escapeHtml(address.alShakka)}</div>` : ''}
              ${address.alDor ? `<div><strong>الدور:</strong> ${escapeHtml(address.alDor)}</div>` : ''}
            </div>
          </div>
          <div class="section">
            <div class="section-title">عناصر الطلب</div>
            <table class="items-table">
              <thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
              <tbody>
                ${invoice.items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${item.price.toFixed(3)} KWD</td><td>${item.quantity}</td><td>${item.total.toFixed(3)} KWD</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="summary">
            <div class="summary-row"><span class="summary-label">المجموع الفرعي:</span><span>${invoice.subtotal.toFixed(3)} KWD</span></div>
            ${invoice.couponDiscountAmount && invoice.couponDiscountAmount > 0 ? `<div class="summary-row summary-row-discount"><span class="summary-label">الخصم (${escapeHtml(invoice.couponCode || '')}):</span><span>-${invoice.couponDiscountAmount.toFixed(3)} KWD</span></div>` : ''}
            <div class="summary-row"><span class="summary-label">الشحن:</span><span>${invoice.shipping.toFixed(3)} KWD</span></div>
            <div class="summary-row"><span class="summary-label">الضريبة:</span><span>${invoice.tax.toFixed(3)} KWD</span></div>
            <div class="summary-total"><span>الإجمالي:</span><span>${invoice.total.toFixed(3)} KWD</span></div>
          </div>
          <div class="footer"><div>شكراً لاختيارك الجوهرة</div><div style="margin-top: 5px; color: rgb(102, 102, 102);">Thank you for choosing Aljawhara</div></div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Chart Configurations
  // Orders by Status Chart (Doughnut)
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
        'rgba(107, 114, 128, 0.8)'    // Refunded - Gray
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
            return `Revenue: ${(yValue || 0).toLocaleString()} KWD`;
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
            return Number(value).toLocaleString() + ' KWD';
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
      orders = orders.filter(order => order.status === this.chartStatusFilter());
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
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
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
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
    });

    // Sort dates
    const sortedDates = Object.keys(ordersByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const ordersData = sortedDates.map(date => ordersByDate[date]);

    this.ordersOverTimeChartData = {
      ...this.ordersOverTimeChartData,
      labels: sortedDates,
      datasets: [{
        ...this.ordersOverTimeChartData.datasets[0],
        data: ordersData
      }]
    };

    // Update Revenue Over Time Chart
    const revenueByDate: { [key: string]: number } = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + order.total;
    });

    // Sort dates
    const sortedRevenueDates = Object.keys(revenueByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const revenueData = sortedRevenueDates.map(date => revenueByDate[date]);

    this.revenueOverTimeChartData = {
      ...this.revenueOverTimeChartData,
      labels: sortedRevenueDates,
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
