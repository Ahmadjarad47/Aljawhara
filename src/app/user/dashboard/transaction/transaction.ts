import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService } from '../../../services/toast.service';
import { ServiceTransaction } from './service-transaction';
import { Observable, map } from 'rxjs';
import { PaymentMethod, TransactionAdvancedDto, TransactionFilterDto, PagedResult } from './transaction.models';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css'
})
export class Transaction implements OnInit {
  public service = inject(ServiceTransaction);
  public toastService = inject(ToastService);

  // UI state
  isLoading = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Sorting
  sortBy = signal<'TransactionDate' | 'Amount' | 'Status' | 'PaymentMethod' | 'OrderNumber'>('TransactionDate');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Filters
  orderId = signal<number | null>(null);
  orderNumber = signal('');
  paymentMethod = signal<PaymentMethod | null>(null);
  status = signal('');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);
  isRefunded = signal<boolean | null>(null);

  // Derived filters
  filters$ = computed((): TransactionFilterDto => ({
    orderId: this.orderId() ?? undefined,
    orderNumber: this.orderNumber() || undefined,
    paymentMethod: this.paymentMethod() ?? undefined,
    status: this.status() || undefined,
    startDate: this.startDate() || undefined,
    endDate: this.endDate() || undefined,
    minAmount: this.minAmount() ?? undefined,
    maxAmount: this.maxAmount() ?? undefined,
    isRefunded: this.isRefunded() ?? undefined,
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    sortBy: this.sortBy(),
    sortDirection: this.sortDirection()
  }));

  // Data streams
  transactions$: Observable<TransactionAdvancedDto[]> = this.service.transactions$;
  pagination$: Observable<{ totalCount: number; totalPages: number; currentPage: number; pageSize: number }> = this.service.pagination$;

  // Quick helpers for template
  currentPage$ = this.pagination$.pipe(map(p => p.currentPage));
  totalPages$ = this.pagination$.pipe(map(p => p.totalPages));

  pageNumbers$ = this.pagination$.pipe(map(p => this.getPageNumbers(p.totalPages, p.currentPage)));

  // Make enum available to template
  PaymentMethod = PaymentMethod;
  Math = Math;

  constructor() {
    effect(() => {
      const f = this.filters$();
      this.loadTransactions(f);
    });
  }

  ngOnInit(): void {}

  loadTransactions(filters: TransactionFilterDto) {
    this.isLoading.set(true);
    this.service.getTransactions(filters).subscribe({
      next: (_result: PagedResult<TransactionAdvancedDto>) => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Error', 'Failed to load transactions');
      }
    });
  }

  getCurrentPage(): number {
    let currentPage = 1;
    this.pagination$.subscribe(p => (currentPage = p.currentPage)).unsubscribe();
    return currentPage;
  }

  getTotalPages(): number {
    let totalPages = 0;
    this.pagination$.subscribe(p => (totalPages = p.totalPages)).unsubscribe();
    return totalPages;
  }

  onSearch() {
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onSortChange(sortBy: string) {
    this.sortBy.set(sortBy as any);
    this.currentPage.set(1);
  }

  onSortDirectionChange(dir: 'asc' | 'desc') {
    this.sortDirection.set(dir);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.orderId.set(null);
    this.orderNumber.set('');
    this.paymentMethod.set(null);
    this.status.set('');
    this.startDate.set(null);
    this.endDate.set(null);
    this.minAmount.set(null);
    this.maxAmount.set(null);
    this.isRefunded.set(null);
    this.currentPage.set(1);
  }

  getPageNumbers(totalPages: number, currentPage: number): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }

  // Toast binding
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(id: string) {
    this.toastService.removeToast(id);
  }
}
