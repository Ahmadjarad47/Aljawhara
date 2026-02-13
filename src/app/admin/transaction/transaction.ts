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
import { TransactionService } from './transaction-service';
import { 
  TransactionAdvancedDto, 
  TransactionCreateAdvancedDto, 
  TransactionUpdateDto,
  TransactionRefundDto,
  TransactionFilterDto,
  TransactionAnalyticsDto,
  PaymentMethod,
  PaymentProcessingDto,
  TransactionStatus
} from './transaction.models';
import { Observable, map, combineLatest } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

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

interface UpdateTransactionStatusDto {
  status: string;
  gatewayResponse?: string;
}

interface CompleteTransactionDto {
  reference?: string;
}

interface FailTransactionDto {
  reason: string;
}

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent, BaseChartDirective],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css'
})
export class Transaction implements OnInit {
  public transactionService = inject(TransactionService);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedTransactions = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  showRefundModal = signal(false);
  showStatusModal = signal(false);
  showAnalyticsModal = signal(false);
  showDetailsModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(20);
  
  // Search and filter signals
  searchTerm = signal('');
  orderIdFilter = signal<number | null>(null);
  orderNumberFilter = signal<string>('');
  paymentMethodFilter = signal<PaymentMethod | null>(null);
  statusFilter = signal<string | null>(null);
  startDateFilter = signal<string>('');
  endDateFilter = signal<string>('');
  minAmountFilter = signal<number | null>(null);
  maxAmountFilter = signal<number | null>(null);
  isRefundedFilter = signal<boolean | null>(null);
  sortBy = signal<string>('transactionDate');
  sortDirection = signal<string>('desc');
  
  // Selected transaction for operations
  selectedTransaction = signal<TransactionAdvancedDto | null>(null);
  analytics = signal<TransactionAnalyticsDto | null>(null);
  
  // Chart data
  allTransactionsForChart = signal<TransactionAdvancedDto[]>([]);
  showCharts = signal(true);
  
  // Chart filters
  chartStartDate = signal<string>('');
  chartEndDate = signal<string>('');
  chartStatusFilter = signal<string | null>(null);
  chartPaymentMethodFilter = signal<PaymentMethod | null>(null);
  
  // Computed filters observable
  filters$ = computed(() => ({
    orderId: this.orderIdFilter(),
    orderNumber: this.orderNumberFilter() || null,
    appUserId: null,
    paymentMethod: this.paymentMethodFilter(),
    status: this.statusFilter(),
    startDate: this.startDateFilter() || null,
    endDate: this.endDateFilter() || null,
    minAmount: this.minAmountFilter(),
    maxAmount: this.maxAmountFilter(),
    isRefunded: this.isRefundedFilter(),
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    sortBy: this.sortBy(),
    sortDirection: this.sortDirection()
  }));
  
  // Main data observables
  transactions$: Observable<TransactionAdvancedDto[]> = this.transactionService.transactions$;
  pagination$ = this.transactionService.pagination$;
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // Computed observables
  transactionsLength$ = this.transactions$.pipe(
    map(transactions => transactions.length)
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

  getTransactionsLength(): number {
    let length = 0;
    this.transactions$.subscribe(transactions => {
      length = transactions.length;
    }).unsubscribe();
    return length;
  }

  newTransaction: TransactionCreateAdvancedDto = {
    orderId: 0,
    amount: 0,
    paymentMethod: PaymentMethod.Card,
    status: TransactionStatus.Pending.toString(),
    transactionReference: null,
    paymentGatewayResponse: null,
    notes: null
  };

  editTransaction: TransactionUpdateDto = {
    id: 0,
    status: '',
    transactionReference: null,
    paymentGatewayResponse: null,
    notes: null
  };

  refundTransaction: TransactionRefundDto = {
    transactionId: 0,
    refundAmount: 0,
    refundReason: '',
    notes: null
  };

  statusUpdate: UpdateTransactionStatusDto = {
    status: '',
    gatewayResponse: ''
  };

  completeTransaction: CompleteTransactionDto = {
    reference: ''
  };

  failTransaction: FailTransactionDto = {
    reason: ''
  };

  paymentProcessing: PaymentProcessingDto = {
    orderId: 0,
    paymentMethod: PaymentMethod.Card,
    cardNumber: null,
    cardExpiryMonth: null,
    cardExpiryYear: null,
    cardCvv: null,
    cardHolderName: null,
    payPalEmail: null,
    bankAccountNumber: null,
    bankRoutingNumber: null,
    bankName: null,
    notes: null
  };

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadTransactions(filters);
    });
  }

  ngOnInit() {
    // Initial load
    this.loadAllTransactionsForChart();
  }
  
  loadAllTransactionsForChart() {
    // Load a large number of transactions for chart visualization
    const chartFilters: TransactionFilterDto = {
      orderId: null,
      orderNumber: null,
      appUserId: null,
      paymentMethod: this.chartPaymentMethodFilter(),
      status: this.chartStatusFilter(),
      startDate: this.chartStartDate() || null,
      endDate: this.chartEndDate() || null,
      minAmount: null,
      maxAmount: null,
      isRefunded: null,
      pageNumber: 1,
      pageSize: 1000,
      sortBy: 'transactionDate',
      sortDirection: 'desc'
    };
    
    this.transactionService.getTransactions(chartFilters).subscribe({
      next: () => {
        this.transactions$.subscribe(transactions => {
          this.allTransactionsForChart.set(transactions);
          this.updateChartsData();
        }).unsubscribe();
      },
      error: (error) => {
        console.error('Error loading transactions for chart:', error);
      }
    });
  }
  
  applyChartFilters() {
    this.loadAllTransactionsForChart();
  }
  
  clearChartFilters() {
    this.chartStartDate.set('');
    this.chartEndDate.set('');
    this.chartStatusFilter.set(null);
    this.chartPaymentMethodFilter.set(null);
    this.loadAllTransactionsForChart();
  }
  
  loadTransactions(filters: TransactionFilterDto) {
    this.isLoading.set(true);
    this.transactionService.getTransactions(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load transactions');
        this.isLoading.set(false);
        console.error('Error loading transactions:', error);
      }
    });
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
  }

  clearFilters() {
    this.searchTerm.set('');
    this.orderIdFilter.set(null);
    this.orderNumberFilter.set('');
    this.paymentMethodFilter.set(null);
    this.statusFilter.set(null);
    this.startDateFilter.set('');
    this.endDateFilter.set('');
    this.minAmountFilter.set(null);
    this.maxAmountFilter.set(null);
    this.isRefundedFilter.set(null);
    this.currentPage.set(1);
  }

  toggleTransactionSelection(transactionId: number) {
    const current = this.selectedTransactions();
    const index = current.indexOf(transactionId);
    if (index > -1) {
      this.selectedTransactions.set(current.filter(id => id !== transactionId));
    } else {
      this.selectedTransactions.set([...current, transactionId]);
    }
  }

  toggleSelectAll() {
    this.transactions$.pipe(
      map(transactions => {
        const current = this.selectedTransactions();
        if (current.length === transactions.length) {
          this.selectedTransactions.set([]);
        } else {
          this.selectedTransactions.set(transactions.map(t => t.id));
        }
      })
    ).subscribe();
  }

  deleteSelected() {
    const selected = this.selectedTransactions();
    if (selected.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selected.length} transaction(s)?`)) {
      return;
    }

    const loadingToastId = this.toastService.loading('Deleting', `Deleting ${selected.length} transactions...`);
    this.isLoading.set(true);
    
    // Delete transactions one by one (or implement bulk delete if available)
    let completed = 0;
    let errors = 0;
    
    selected.forEach(id => {
      this.transactionService.deleteTransaction(id).subscribe({
        next: () => {
          completed++;
          if (completed + errors === selected.length) {
            this.selectedTransactions.set([]);
            this.loadTransactions(this.filters$());
            this.isLoading.set(false);
            if (errors === 0) {
              this.toastService.updateToSuccess(loadingToastId, 'Success', `${selected.length} transactions deleted successfully`);
            } else {
              this.toastService.updateToError(loadingToastId, 'Partial Success', `${completed} transactions deleted, ${errors} failed`);
            }
          }
        },
        error: (error) => {
          errors++;
          if (completed + errors === selected.length) {
            this.isLoading.set(false);
            this.toastService.updateToError(loadingToastId, 'Error', `${errors} transactions failed to delete`);
          }
        }
      });
    });
  }

  addTransaction() {
    if (!this.newTransaction.orderId || !this.newTransaction.amount || this.newTransaction.amount <= 0) {
      this.toastService.warning('Validation Error', 'Order ID and amount are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Creating', 'Creating new transaction...');
    this.isLoading.set(true);
    this.transactionService.createTransaction(this.newTransaction).subscribe({
      next: () => {
        this.resetNewTransaction();
        this.showAddModal.set(false);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction created successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to create transaction');
        this.isLoading.set(false);
        console.error('Error creating transaction:', error);
      }
    });
  }

  editTransactionStart(transaction: TransactionAdvancedDto) {
    const statusNum = typeof transaction.status === 'string' ? parseInt(transaction.status, 10) : transaction.status;
    this.editTransaction = {
      id: transaction.id,
      status: statusNum.toString(),
      transactionReference: transaction.transactionReference,
      paymentGatewayResponse: transaction.paymentGatewayResponse,
      notes: transaction.notes
    };
    this.showEditModal.set(true);
  }

  updateTransaction() {
    if (!this.editTransaction.status) {
      this.toastService.warning('Validation Error', 'Status is required');
      return;
    }

    const loadingToastId = this.toastService.loading('Updating', 'Updating transaction...');
    this.isLoading.set(true);
    this.transactionService.updateTransaction(this.editTransaction).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update transaction');
        this.isLoading.set(false);
        console.error('Error updating transaction:', error);
      }
    });
  }

  deleteTransaction(id: number) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    const loadingToastId = this.toastService.loading('Deleting', 'Deleting transaction...');
    this.isLoading.set(true);
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => {
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction deleted successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete transaction');
        this.isLoading.set(false);
        console.error('Error deleting transaction:', error);
      }
    });
  }

  refundTransactionStart(transaction: TransactionAdvancedDto) {
    this.refundTransaction = {
      transactionId: transaction.id,
      refundAmount: transaction.amount,
      refundReason: '',
      notes: null
    };
    this.selectedTransaction.set(transaction);
    this.showRefundModal.set(true);
  }

  processRefund() {
    if (!this.refundTransaction.refundReason || !this.refundTransaction.refundAmount || this.refundTransaction.refundAmount <= 0) {
      this.toastService.warning('Validation Error', 'Refund amount and reason are required');
      return;
    }

    const transaction = this.selectedTransaction();
    if (!transaction || this.refundTransaction.refundAmount > transaction.amount) {
      this.toastService.warning('Validation Error', 'Refund amount cannot exceed transaction amount');
      return;
    }

    const loadingToastId = this.toastService.loading('Processing', 'Processing refund...');
    this.isLoading.set(true);
    this.transactionService.processRefund(this.refundTransaction).subscribe({
      next: () => {
        this.showRefundModal.set(false);
        this.selectedTransaction.set(null);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Refund processed successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to process refund');
        this.isLoading.set(false);
        console.error('Error processing refund:', error);
      }
    });
  }

  updateStatusStart(transaction: TransactionAdvancedDto) {
    this.selectedTransaction.set(transaction);
    const statusNum = typeof transaction.status === 'string' ? parseInt(transaction.status, 10) : transaction.status;
    this.statusUpdate = {
      status: statusNum.toString(),
      gatewayResponse: transaction.paymentGatewayResponse || ''
    };
    this.showStatusModal.set(true);
  }

  updateStatus() {
    if (!this.statusUpdate.status) {
      this.toastService.warning('Validation Error', 'Status is required');
      return;
    }

    const transaction = this.selectedTransaction();
    if (!transaction) return;

    const loadingToastId = this.toastService.loading('Updating', 'Updating transaction status...');
    this.isLoading.set(true);
    this.transactionService.updateTransactionStatus(
      transaction.id, 
      this.statusUpdate.status,
      this.statusUpdate.gatewayResponse
    ).subscribe({
      next: () => {
        this.showStatusModal.set(false);
        this.selectedTransaction.set(null);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction status updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update transaction status');
        this.isLoading.set(false);
        console.error('Error updating transaction status:', error);
      }
    });
  }

  markAsCompleted(transaction: TransactionAdvancedDto) {
    this.selectedTransaction.set(transaction);
    this.completeTransaction = { reference: transaction.transactionReference || '' };
    
    const loadingToastId = this.toastService.loading('Updating', 'Marking transaction as completed...');
    this.isLoading.set(true);
    this.transactionService.markTransactionAsCompleted(
      transaction.id,
      this.completeTransaction.reference
    ).subscribe({
      next: () => {
        this.selectedTransaction.set(null);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction marked as completed');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to mark transaction as completed');
        this.isLoading.set(false);
        console.error('Error marking transaction as completed:', error);
      }
    });
  }

  markAsFailed(transaction: TransactionAdvancedDto) {
    this.selectedTransaction.set(transaction);
    this.failTransaction = { reason: '' };
    
    const loadingToastId = this.toastService.loading('Updating', 'Marking transaction as failed...');
    this.isLoading.set(true);
    this.transactionService.markTransactionAsFailed(
      transaction.id,
      this.failTransaction.reason || 'Marked as failed by admin'
    ).subscribe({
      next: () => {
        this.selectedTransaction.set(null);
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction marked as failed');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to mark transaction as failed');
        this.isLoading.set(false);
        console.error('Error marking transaction as failed:', error);
      }
    });
  }

  markAsPending(transaction: TransactionAdvancedDto) {
    const loadingToastId = this.toastService.loading('Updating', 'Marking transaction as pending...');
    this.isLoading.set(true);
    this.transactionService.markTransactionAsPending(transaction.id).subscribe({
      next: () => {
        this.loadTransactions(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transaction marked as pending');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to mark transaction as pending');
        this.isLoading.set(false);
        console.error('Error marking transaction as pending:', error);
      }
    });
  }

  viewAnalytics() {
    this.showAnalyticsModal.set(true);
    this.isLoading.set(true);
    this.transactionService.getTransactionAnalytics(
      this.startDateFilter() ? new Date(this.startDateFilter()) : undefined,
      this.endDateFilter() ? new Date(this.endDateFilter()) : undefined
    ).subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load analytics');
        this.isLoading.set(false);
        console.error('Error loading analytics:', error);
      }
    });
  }

  viewDetails(transaction: TransactionAdvancedDto) {
    this.selectedTransaction.set(transaction);
    this.showDetailsModal.set(true);
  }

  exportToCsv() {
    const loadingToastId = this.toastService.loading('Exporting', 'Exporting transactions to CSV...');
    this.isLoading.set(true);
    this.transactionService.exportTransactionsToCsv(this.filters$()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transactions exported to CSV');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to export transactions');
        this.isLoading.set(false);
        console.error('Error exporting transactions:', error);
      }
    });
  }

  exportToExcel() {
    const loadingToastId = this.toastService.loading('Exporting', 'Exporting transactions to Excel...');
    this.isLoading.set(true);
    this.transactionService.exportTransactionsToExcel(this.filters$()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Transactions exported to Excel');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to export transactions');
        this.isLoading.set(false);
        console.error('Error exporting transactions:', error);
      }
    });
  }

  resetNewTransaction() {
    this.newTransaction = {
      orderId: 0,
      amount: 0,
      paymentMethod: PaymentMethod.Card,
      status: TransactionStatus.Pending.toString(),
      transactionReference: null,
      paymentGatewayResponse: null,
      notes: null
    };
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showRefundModal.set(false);
    this.showStatusModal.set(false);
    this.showAnalyticsModal.set(false);
    this.showDetailsModal.set(false);
    this.selectedTransaction.set(null);
    this.resetNewTransaction();
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

  // Payment method helper
  getPaymentMethodName(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.Card: return 'Card';
      case PaymentMethod.Cod: return 'Cash on Delivery';
      case PaymentMethod.Paypal: return 'PayPal';
      case PaymentMethod.Bank: return 'Bank Transfer';
      default: return 'Unknown';
    }
  }

  getStatusBadgeClass(status: string | number): string {
    const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;
    
    switch (statusNum) {
      case TransactionStatus.Paid:
        return 'badge-success';
      case TransactionStatus.Pending:
        return 'badge-warning';
      case TransactionStatus.Failed:
      case TransactionStatus.Cancelled:
        return 'badge-error';
      case TransactionStatus.Refunded:
        return 'badge-info';
      default:
        return 'badge-info';
    }
  }

  getStatusName(status: string | number): string {
    const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;
    
    switch (statusNum) {
      case TransactionStatus.Pending:
        return 'Pending';
      case TransactionStatus.Paid:
        return 'Paid';
      case TransactionStatus.Failed:
        return 'Failed';
      case TransactionStatus.Cancelled:
        return 'Cancelled';
      case TransactionStatus.Refunded:
        return 'Refunded';
      default:
        return 'Unknown';
    }
  }

  getStatusNumber(status: string | number): number {
    return typeof status === 'string' ? parseInt(status, 10) : status;
  }

  // Make Math and parseInt available in template
  Math = Math;
  parseInt = parseInt;
  PaymentMethod = PaymentMethod;
  TransactionStatus = TransactionStatus;
  
  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
  
  // Chart Configurations
  // Transactions by Status Chart (Doughnut)
  public transactionsByStatusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
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

  public transactionsByStatusChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(251, 191, 36, 0.8)',   // Pending - Yellow
        'rgba(16, 185, 129, 0.8)',    // Paid - Green
        'rgba(239, 68, 68, 0.8)',     // Failed - Red
        'rgba(107, 114, 128, 0.8)',   // Cancelled - Gray
        'rgba(139, 92, 246, 0.8)'     // Refunded - Purple
      ],
      borderColor: [
        'rgb(251, 191, 36)',
        'rgb(16, 185, 129)',
        'rgb(239, 68, 68)',
        'rgb(107, 114, 128)',
        'rgb(139, 92, 246)'
      ],
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 4
    }]
  };

  public transactionsByStatusChartType: ChartType = 'doughnut';

  // Transactions by Payment Method Chart (Doughnut)
  public transactionsByPaymentMethodChartOptions: ChartConfiguration<'doughnut'>['options'] = {
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

  public transactionsByPaymentMethodChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',    // Card - Blue
        'rgba(16, 185, 129, 0.8)',    // COD - Green
        'rgba(251, 191, 36, 0.8)',    // PayPal - Yellow
        'rgba(139, 92, 246, 0.8)'     // Bank - Purple
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(251, 191, 36)',
        'rgb(139, 92, 246)'
      ],
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 4
    }]
  };

  public transactionsByPaymentMethodChartType: ChartType = 'doughnut';

  // Transactions Over Time Chart (Line)
  public transactionsOverTimeChartOptions: ChartConfiguration<'line'>['options'] = {
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

  public transactionsOverTimeChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Transactions',
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

  public transactionsOverTimeChartType: ChartType = 'line';

  // Transaction Amount Over Time Chart (Bar)
  public amountOverTimeChartOptions: ChartConfiguration<'bar'>['options'] = {
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
            return `Amount: ${(yValue || 0).toLocaleString()} KWD`;
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

  public amountOverTimeChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Transaction Amount',
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
      hoverBorderColor: 'rgb(16, 185, 129)',
      hoverBorderWidth: 2
    }]
  };

  public amountOverTimeChartType: ChartType = 'bar';

  // Update chart data based on transactions
  updateChartsData() {
    const transactions = this.allTransactionsForChart();
    if (transactions.length === 0) return;

    // Update Transactions by Status Chart
    const statusCounts: { [key: number]: number } = {
      [TransactionStatus.Pending]: 0,
      [TransactionStatus.Paid]: 0,
      [TransactionStatus.Failed]: 0,
      [TransactionStatus.Cancelled]: 0,
      [TransactionStatus.Refunded]: 0
    };

    transactions.forEach(transaction => {
      const statusNum = typeof transaction.status === 'string' ? parseInt(transaction.status, 10) : transaction.status;
      if (statusCounts[statusNum] !== undefined) {
        statusCounts[statusNum]++;
      }
    });

    const statusLabels: string[] = [];
    const statusData: number[] = [];
    Object.keys(statusCounts).forEach(statusKey => {
      const statusNum = parseInt(statusKey, 10);
      if (statusCounts[statusNum] > 0) {
        statusLabels.push(this.getStatusName(statusNum));
        statusData.push(statusCounts[statusNum]);
      }
    });

    this.transactionsByStatusChartData = {
      ...this.transactionsByStatusChartData,
      labels: statusLabels,
      datasets: [{
        ...this.transactionsByStatusChartData.datasets[0],
        data: statusData
      }]
    };

    // Update Transactions by Payment Method Chart
    const paymentMethodCounts: { [key: number]: number } = {};
    Object.values(PaymentMethod)
      .filter(v => !isNaN(Number(v)))
      .forEach(method => {
        paymentMethodCounts[Number(method)] = 0;
      });

    transactions.forEach(transaction => {
      paymentMethodCounts[transaction.paymentMethod] = (paymentMethodCounts[transaction.paymentMethod] || 0) + 1;
    });

    const paymentMethodLabels: string[] = [];
    const paymentMethodData: number[] = [];
    Object.keys(paymentMethodCounts).forEach(methodKey => {
      const methodNum = Number(methodKey);
      if (!isNaN(methodNum) && paymentMethodCounts[methodNum] > 0) {
        paymentMethodLabels.push(this.getPaymentMethodName(methodNum));
        paymentMethodData.push(paymentMethodCounts[methodNum]);
      }
    });

    this.transactionsByPaymentMethodChartData = {
      ...this.transactionsByPaymentMethodChartData,
      labels: paymentMethodLabels,
      datasets: [{
        ...this.transactionsByPaymentMethodChartData.datasets[0],
        data: paymentMethodData
      }]
    };

    // Update Transactions Over Time Chart
    const transactionsByDate: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      transactionsByDate[dateKey] = (transactionsByDate[dateKey] || 0) + 1;
    });

    // Sort dates
    const sortedDates = Object.keys(transactionsByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const transactionsData = sortedDates.map(date => transactionsByDate[date]);

    this.transactionsOverTimeChartData = {
      ...this.transactionsOverTimeChartData,
      labels: sortedDates,
      datasets: [{
        ...this.transactionsOverTimeChartData.datasets[0],
        data: transactionsData
      }]
    };

    // Update Amount Over Time Chart
    const amountByDate: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      amountByDate[dateKey] = (amountByDate[dateKey] || 0) + transaction.amount;
    });

    // Sort dates
    const sortedAmountDates = Object.keys(amountByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const amountData = sortedAmountDates.map(date => amountByDate[date]);

    this.amountOverTimeChartData = {
      ...this.amountOverTimeChartData,
      labels: sortedAmountDates,
      datasets: [{
        ...this.amountOverTimeChartData.datasets[0],
        data: amountData
      }]
    };
  }
  
  toggleCharts() {
    this.showCharts.set(!this.showCharts());
    if (this.showCharts()) {
      this.loadAllTransactionsForChart();
    }
  }
}
