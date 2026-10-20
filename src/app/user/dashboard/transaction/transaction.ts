import { Component, OnInit, OnDestroy, ElementRef, afterRenderEffect, viewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import arabicLocale from '@angular/common/locales/ar';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService } from '../../../services/toast.service';
import { ServiceTransaction } from './service-transaction';
import { Observable, map } from 'rxjs';
import { PaymentMethod, TransactionAdvancedDto, TransactionFilterDto, PagedResult } from './transaction.models';

registerLocaleData(arabicLocale);

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './transaction.html',
  styleUrls: ['../account-page.css', './transaction.css']
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
      filters: 'تصفية المعاملات',
      filterHint: 'حدّد الخيارات ثم اضغط تطبيق لعرض النتائج.',
      searchOrders: 'ابحث برقم الطلب...',
      search: 'بحث',
      close: 'إغلاق',
      clearFilters: 'مسح الفلاتر',
      moreOptions: 'المزيد من الخيارات',
      transactionDetails: 'تفاصيل المعاملة',
      currency: 'د.ك',
      loadingTransactions: 'جارٍ تحميل المعاملات...',
      transactionsAppearHere: 'ستظهر معاملات الدفع هنا بعد إتمام طلباتك.',
      tryOtherFilters: 'جرّب تغيير البحث أو خيارات التصفية.',
      pages: 'صفحات المعاملات',
      previous: 'السابق',
      next: 'التالي',
      of: 'من',
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
      filters: 'Filters',
      filterHint: 'Choose your filters, then apply to see the results.',
      searchOrders: 'Order number...',
      search: 'Search',
      close: 'Close',
      clearFilters: 'Clear filters',
      moreOptions: 'More options',
      transactionDetails: 'Transaction details',
      currency: 'KWD',
      loadingTransactions: 'Loading your transactions...',
      transactionsAppearHere: 'Your payment transactions will appear here after you place an order.',
      tryOtherFilters: 'Try another search or change your filters.',
      pages: 'Transaction pages',
      previous: 'Previous',
      next: 'Next',
      of: 'of',
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

  private normalizeStatus(status: string | number | null | undefined): 'paid' | 'pending' | 'failed' | 'unknown' {
    if (typeof status === 'number') {
      if (status === 1) return 'paid';
      if (status === 0) return 'pending';
      if (status === 2 || status === 3) return 'failed';
      return 'unknown';
    }

    const statusLower = String(status ?? '').toLowerCase();
    if (statusLower === 'succeeded' || statusLower === 'paid') return 'paid';
    if (statusLower === 'pending') return 'pending';
    if (statusLower === 'failed' || statusLower === 'cancelled') return 'failed';
    return 'unknown';
  }

  // Get status translation
  getStatusText(status: string | number | null | undefined): string {
    const isArabic = this.currentLanguage() === 'ar';
    const normalizedStatus = this.normalizeStatus(status);

    if (normalizedStatus === 'paid') {
      return isArabic ? 'نجح' : 'Succeeded';
    }
    if (normalizedStatus === 'failed') {
      return isArabic ? 'فشل' : 'Failed';
    }
    if (normalizedStatus === 'pending') {
      return isArabic ? 'قيد الانتظار' : 'Pending';
    }

    return String(status ?? '-');
  }

  isSuccessStatus(status: string | number | null | undefined): boolean {
    return this.normalizeStatus(status) === 'paid';
  }

  isPendingStatus(status: string | number | null | undefined): boolean {
    return this.normalizeStatus(status) === 'pending';
  }

  isFailedStatus(status: string | number | null | undefined): boolean {
    return this.normalizeStatus(status) === 'failed';
  }

  // UI state
  isLoading = signal(false);
  showFilters = signal(false);
  private filtersDialog = viewChild<ElementRef<HTMLDialogElement>>('filtersDialog');
  private appliedFilters = signal<TransactionFilterDto>({ pageSize: 10, sortBy: 'TransactionDate', sortDirection: 'desc' });
  activeFilterCount = computed(() => Object.entries(this.appliedFilters())
    .filter(([key, value]) => !['pageSize', 'sortBy', 'sortDirection'].includes(key) && value != null && value !== '').length);

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
    ...this.appliedFilters(),
    pageNumber: this.currentPage()
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
    effect(onCleanup => {
      const request = this.loadTransactions(this.filters$());
      onCleanup(() => request.unsubscribe());
    });
    afterRenderEffect(() => {
      const dialog = this.filtersDialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
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
    return this.service.getTransactions(filters).subscribe({
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
    this.appliedFilters.set({
      orderId: this.orderId() ?? undefined,
      orderNumber: this.orderNumber().trim() || undefined,
      paymentMethod: this.paymentMethod() ?? undefined,
      status: this.status().trim() || undefined,
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      minAmount: this.minAmount() ?? undefined,
      maxAmount: this.maxAmount() ?? undefined,
      isRefunded: this.isRefunded() ?? undefined,
      pageSize: this.pageSize(), sortBy: this.sortBy(), sortDirection: this.sortDirection()
    });
    this.currentPage.set(1);
    this.filtersDialog()?.nativeElement.close();
    this.showFilters.set(false);
  }

  closeFilters(event?: Event): void {
    event?.preventDefault();
    const filters = this.appliedFilters();
    this.orderId.set(filters.orderId ?? null);
    this.orderNumber.set(filters.orderNumber ?? '');
    this.paymentMethod.set(filters.paymentMethod ?? null);
    this.status.set(filters.status ?? '');
    this.startDate.set(filters.startDate ?? null);
    this.endDate.set(filters.endDate ?? null);
    this.minAmount.set(filters.minAmount ?? null);
    this.maxAmount.set(filters.maxAmount ?? null);
    this.isRefunded.set(filters.isRefunded ?? null);
    this.pageSize.set(filters.pageSize ?? 10);
    this.sortBy.set((filters.sortBy ?? 'TransactionDate') as ReturnType<typeof this.sortBy>);
    this.sortDirection.set(filters.sortDirection ?? 'desc');
    this.filtersDialog()?.nativeElement.close();
    this.showFilters.set(false);
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.getTotalPages()) return;
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
  }

  onSortChange(sortBy: string) {
    this.sortBy.set(sortBy as ReturnType<typeof this.sortBy>);
  }

  onSortDirectionChange(dir: 'asc' | 'desc') {
    this.sortDirection.set(dir);
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
    this.onSearch();
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
