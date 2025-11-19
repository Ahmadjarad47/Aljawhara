import { Component, OnInit, OnDestroy, computed, effect, inject, signal } from '@angular/core';
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
export class Transaction implements OnInit, OnDestroy {
  public service = inject(ServiceTransaction);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      myTransactions: 'معاملاتي',
      viewAndFilter: 'عرض وتصفية معاملات الدفع الخاصة بك',
      orderId: 'رقم الطلب',
      orderNumber: 'رقم الطلب',
      paymentMethod: 'طريقة الدفع',
      status: 'الحالة',
      startDate: 'تاريخ البداية',
      endDate: 'تاريخ النهاية',
      minAmount: 'الحد الأدنى للمبلغ',
      maxAmount: 'الحد الأقصى للمبلغ',
      refunded: 'مسترد',
      pageSize: 'حجم الصفحة',
      sortBy: 'ترتيب حسب',
      direction: 'الاتجاه',
      all: 'الكل',
      card: 'بطاقة',
      cashOnDelivery: 'الدفع عند الاستلام',
      paypal: 'باي بال',
      bank: 'بنك',
      yes: 'نعم',
      no: 'لا',
      desc: 'تنازلي',
      asc: 'تصاعدي',
      transactionDate: 'تاريخ المعاملة',
      amount: 'المبلغ',
      paymentMethodName: 'طريقة الدفع',
      orderNumberLabel: 'رقم الطلب',
      apply: 'تطبيق',
      clear: 'مسح',
      order: 'الطلب',
      customer: 'العميل',
      method: 'الطريقة',
      processed: 'تمت المعالجة',
      reference: 'المرجع',
      noTransactionsFound: 'لم يتم العثور على معاملات',
      error: 'خطأ',
      failedToLoad: 'فشل تحميل المعاملات'
    },
    en: {
      myTransactions: 'My Transactions',
      viewAndFilter: 'View and filter your payment transactions',
      orderId: 'Order ID',
      orderNumber: 'Order Number',
      paymentMethod: 'Payment Method',
      status: 'Status',
      startDate: 'Start Date',
      endDate: 'End Date',
      minAmount: 'Min Amount',
      maxAmount: 'Max Amount',
      refunded: 'Refunded',
      pageSize: 'Page Size',
      sortBy: 'Sort By',
      direction: 'Direction',
      all: 'All',
      card: 'Card',
      cashOnDelivery: 'Cash on Delivery',
      paypal: 'Paypal',
      bank: 'Bank',
      yes: 'Yes',
      no: 'No',
      desc: 'Desc',
      asc: 'Asc',
      transactionDate: 'Transaction Date',
      amount: 'Amount',
      paymentMethodName: 'Payment Method',
      orderNumberLabel: 'Order Number',
      apply: 'Apply',
      clear: 'Clear',
      order: 'Order',
      customer: 'Customer',
      method: 'Method',
      processed: 'Processed',
      reference: 'Reference',
      noTransactionsFound: 'No transactions found',
      error: 'Error',
      failedToLoad: 'Failed to load transactions'
    }
  };

  // Translation helper
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations.ar] || key;
  }

  // Get payment method name based on language
  getPaymentMethodName(method: PaymentMethod): string {
    const isArabic = this.currentLanguage() === 'ar';
    switch (method) {
      case PaymentMethod.Card:
        return isArabic ? this.t('card') : 'Card';
      case PaymentMethod.Cod:
        return isArabic ? this.t('cashOnDelivery') : 'Cash on Delivery';
      case PaymentMethod.Paypal:
        return isArabic ? this.t('paypal') : 'Paypal';
      case PaymentMethod.Bank:
        return isArabic ? this.t('bank') : 'Bank';
      default:
        return '-';
    }
  }

  // Get status translation
  getStatusText(status: string): string {
    const isArabic = this.currentLanguage() === 'ar';
    const statusLower = status.toLowerCase();
    if (statusLower === 'succeeded' || statusLower === 'paid') {
      return isArabic ? 'نجح' : 'Succeeded';
    } else if (statusLower === 'failed') {
      return isArabic ? 'فشل' : 'Failed';
    } else if (statusLower === 'pending') {
      return isArabic ? 'قيد الانتظار' : 'Pending';
    }
    return status;
  }

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

  ngOnInit(): void {
    // Load saved language
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang) {
      this.currentLanguage.set(savedLang);
    }

    // Listen for language changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'language') {
        const newLang = e.newValue as 'ar' | 'en' | null;
        if (newLang) {
          this.currentLanguage.set(newLang);
        }
      }
    });

    // Poll for language changes in the same window
    this.languageCheckInterval = setInterval(() => {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (savedLang && savedLang !== this.currentLanguage()) {
        this.currentLanguage.set(savedLang);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  loadTransactions(filters: TransactionFilterDto) {
    this.isLoading.set(true);
    this.service.getTransactions(filters).subscribe({
      next: (_result: PagedResult<TransactionAdvancedDto>) => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.toastService.error(this.t('error'), this.t('failedToLoad'));
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
