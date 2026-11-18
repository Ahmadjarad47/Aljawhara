import { ChangeDetectionStrategy, Component, OnInit, ElementRef, afterRenderEffect, viewChild, inject, signal, computed } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import arabicLocale from '@angular/common/locales/ar';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { UserOrderService } from './user-order.service';
import { 
  OrderSummaryDto, 
  OrderDto, 
  OrderStatus,
  normalizeOrderStatus,
  RatingDto, 
  RatingCreateDto,
  InvoicePaymentDto 
} from './models.order';
import { combineLatest, map, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { PaymentInitializationStatus } from '../../../core/Models/checkout-payment';
import { LanguageService } from '../../../services/language.service';

declare const window: any;

registerLocaleData(arabicLocale);

@Component({
  selector: 'app-user-order',
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-order.html',
  styleUrls: ['../account-page.css', './user-order.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserOrderComponent implements OnInit {
  private router = inject(Router);
  private orderService = inject(UserOrderService);
  public toastService = inject(ToastService);
  private detailsDialog = viewChild<ElementRef<HTMLDialogElement>>('detailsDialog');
  private ratingDialog = viewChild<ElementRef<HTMLDialogElement>>('ratingDialog');
  private cancelDialog = viewChild<ElementRef<HTMLDialogElement>>('cancelDialog');

  constructor() {
    afterRenderEffect(() => {
      for (const dialog of [this.detailsDialog(), this.ratingDialog(), this.cancelDialog()]) {
        if (dialog && !dialog.nativeElement.open) dialog.nativeElement.showModal();
      }
    });
  }

  // Expose OrderStatus enum to template
  OrderStatus = OrderStatus;

  readonly currentLanguage = inject(LanguageService).current;

  readonly stars = [1, 2, 3, 4, 5] as const;

  /** Shipping address lines, rendered as a list instead of 14 copies of the same markup. */
  readonly shippingFields = [
    { key: 'street', label: 'addressLine' },
    { key: 'alQataa', label: 'block' },
    { key: 'alSharee', label: 'street' },
    { key: 'alJada', label: 'avenue' },
    { key: 'alManzil', label: 'house' },
    { key: 'alDor', label: 'floor' },
    { key: 'alShakka', label: 'apartment' }
  ] as const;

  // State signals
  isLoading = signal(false);
  loadError = signal(false);
  pendingCancelId = signal<number | null>(null);
  orders = signal<OrderSummaryDto[]>([]);
  searchTerm = signal('');
  statusFilter = signal<OrderStatus | null>(null);
  selectedOrderDetails = signal<OrderDto | null>(null);
  showDetailsModal = signal(false);
  showRatingModal = signal(false);
  selectedProductForRating = signal<{ orderId: number; productId: number; productName: string } | null>(null);
  checkingRatings = signal(false);
  productRatings = signal<Map<number, RatingDto>>(new Map());

  // Rating form
  ratingForm = signal<Omit<RatingCreateDto, 'orderId'>>({
    content: '',
    ratingNumber: 5,
    productId: 0
  });

  // Filtered orders
  filteredOrders$ = computed(() => {
    const ordersList = this.orders();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    return ordersList.filter(order => {
      const matchesSearch = !search || 
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search);
      const matchesStatus = status === null || normalizeOrderStatus(order.status) === status;
      return matchesSearch && matchesStatus;
    });
  });

  // Toasts
  get toasts(): ToastMessage[] {
    return this.toastService.toasts$();
  }

  // Translations
  translations = {
    ar: {
      myOrders: 'طلباتي',
      viewAndManage: 'عرض وإدارة طلباتك',
      refresh: 'تحديث',
      searchPlaceholder: 'ابحث عن طلب...',
      allStatus: 'جميع الحالات',
      pending: 'قيد الانتظار',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      refunded: 'تم الاسترداد',
      expired: 'منتهي الصلاحية',
      requiresReconciliation: 'بانتظار مراجعة الدفع',
      unknownStatus: 'حالة غير معروفة',
      paid: 'تم الدفع',
      clearFilters: 'مسح الفلاتر',
      orderNumber: 'رقم الطلب',
      customer: 'العميل',
      items: 'عناصر',
      total: 'الإجمالي',
      status: 'حالة الطلب',
      paymentStatus: 'حالة الدفع',
      orderDate: 'تاريخ الطلب',
      actions: 'الإجراءات',
      view: 'عرض',
      cancel: 'إلغاء',
      noOrdersFound: 'لم يتم العثور على طلبات',
      tryOtherFilters: 'جرّب البحث برقم آخر أو تغيير حالة الطلب.',
      ordersAppearHere: 'ستظهر طلباتك هنا بعد إتمام أول طلب.',
      loadingOrders: 'جارٍ تحميل الطلبات...',
      currency: 'د.ك',
      orderDetails: 'تفاصيل الطلب',
      orderDateLabel: 'تاريخ الطلب',
      shippingAddress: 'عنوان الشحن',
      fullName: 'الاسم',
      phone: 'الهاتف',
      street: 'الشارع',
      block: 'القطعة',
      avenue: 'الجادة',
      house: 'المنزل',
      floor: 'الدور',
      apartment: 'الشقة',
      city: 'المدينة',
      state: 'المحافظة',
      postalCode: 'الرمز البريدي',
      country: 'الدولة',
      orderItems: 'عناصر الطلب',
      product: 'المنتج',
      price: 'السعر',
      quantity: 'الكمية',
      rating: 'التقييم',
      rated: 'تم التقييم',
      rate: 'قيم',
      subtotal: 'المجموع الفرعي',
      discount: 'الخصم',
      shipping: 'الشحن',
      tax: 'الضريبة',
      cancelOrder: 'إلغاء الطلب',
      close: 'إغلاق',
      rateProduct: 'تقييم المنتج',
      yourRating: 'تقييمك',
      selectedStars: 'النجوم المحددة',
      outOfStars: 'من 5',
      yourReview: 'مراجعتك',
      required: 'مطلوب',
      shareExperience: 'شارك تجربتك مع هذا المنتج...',
      characters: 'حرف',
      submitRating: 'إرسال التقييم',
      ratingNotAllowed: 'يمكن تقييم المنتج فقط من طلب تم تسليمه.',
      downloadInvoice: 'تحميل الفاتورة',
      payNow: 'ادفع الآن',
      error: 'خطأ',
      success: 'نجح',
      retry: 'إعادة المحاولة',
      addressLine: 'العنوان',
      failedToLoadOrders: 'فشل تحميل الطلبات',
      loadErrorTitle: 'تعذّر تحميل الطلبات',
      loadErrorHint: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
      failedToLoadDetails: 'فشل تحميل تفاصيل الطلب',
      failedToCancelOrder: 'فشل إلغاء الطلب',
      orderCancelled: 'تم إلغاء الطلب بنجاح',
      confirmCancelTitle: 'إلغاء هذا الطلب؟',
      confirmCancelBody: 'لا يمكن التراجع عن إلغاء الطلب. إذا كنت قد دفعت، تتم معالجة الاسترداد وفق سياسة المتجر.',
      keepOrder: 'الاحتفاظ بالطلب',
      failedToSubmitRating: 'فشل إرسال التقييم',
      ratingSubmitted: 'تم إرسال التقييم بنجاح',
      failedToLoadInvoice: 'فشل تحميل بيانات الفاتورة',
      invoiceDownloaded: 'تم تحميل الفاتورة بنجاح',
      failedToGeneratePdf: 'فشل إنشاء ملف PDF'
    },
    en: {
      myOrders: 'My Orders',
      viewAndManage: 'View and manage your orders',
      refresh: 'Refresh',
      searchPlaceholder: 'Search for an order...',
      allStatus: 'All Status',
      pending: 'Pending',
      processing: 'Preparing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      expired: 'Expired',
      requiresReconciliation: 'Payment under review',
      unknownStatus: 'Unknown status',
      paid: 'Paid',
      clearFilters: 'Clear Filters',
      orderNumber: 'Order Number',
      customer: 'Customer',
      items: 'Items',
      total: 'Total',
      status: 'Order status',
      paymentStatus: 'Payment status',
      orderDate: 'Order Date',
      actions: 'Actions',
      view: 'View',
      cancel: 'Cancel',
      noOrdersFound: 'No orders found',
      tryOtherFilters: 'Try another order number or change the status filter.',
      ordersAppearHere: 'Your orders will appear here after your first purchase.',
      loadingOrders: 'Loading your orders...',
      currency: 'KWD',
      orderDetails: 'Order Details',
      orderDateLabel: 'Order Date',
      shippingAddress: 'Shipping Address',
      fullName: 'Name',
      phone: 'Phone',
      street: 'Street',
      block: 'Block',
      avenue: 'Avenue',
      house: 'House',
      floor: 'Floor',
      apartment: 'Apartment',
      city: 'City',
      state: 'State',
      postalCode: 'Postal code',
      country: 'Country',
      orderItems: 'Order Items',
      product: 'Product',
      price: 'Price',
      quantity: 'Quantity',
      rating: 'Rating',
      rated: 'Rated',
      rate: 'Rate',
      subtotal: 'Subtotal',
      discount: 'Discount',
      shipping: 'Shipping',
      tax: 'Tax',
      cancelOrder: 'Cancel Order',
      close: 'Close',
      rateProduct: 'Rate Product',
      yourRating: 'Your Rating',
      selectedStars: 'Selected Stars',
      outOfStars: 'out of 5',
      yourReview: 'Your Review',
      required: 'Required',
      shareExperience: 'Share your experience with this product...',
      characters: 'characters',
      submitRating: 'Submit Rating',
      ratingNotAllowed: 'You can only rate a product from a delivered order.',
      downloadInvoice: 'Download Invoice',
      payNow: 'Pay Now',
      error: 'Error',
      success: 'Done',
      retry: 'Try again',
      addressLine: 'Address',
      failedToLoadOrders: 'Could not load your orders',
      loadErrorTitle: 'We could not load your orders',
      loadErrorHint: 'Check your internet connection and try again.',
      failedToLoadDetails: 'Could not load the order details',
      failedToCancelOrder: 'Could not cancel the order',
      orderCancelled: 'Order cancelled',
      confirmCancelTitle: 'Cancel this order?',
      confirmCancelBody: 'Cancelling an order cannot be undone. If you have already paid, the refund follows the store policy.',
      keepOrder: 'Keep order',
      failedToSubmitRating: 'Could not submit your rating',
      ratingSubmitted: 'Rating submitted',
      failedToLoadInvoice: 'Could not load the invoice data',
      invoiceDownloaded: 'Invoice downloaded',
      failedToGeneratePdf: 'Could not generate the PDF'
    }
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.orderService.getMyOrders().pipe(
      catchError(error => {
        console.error('Error loading orders:', error);
        this.loadError.set(true);
        this.toastService.error(this.t('error'), this.t('failedToLoadOrders'));
        return of([]);
      })
    ).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    // Filtering is handled by computed signal
  }

  onStatusFilterChange(status: OrderStatus | null): void {
    this.statusFilter.set(status);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  viewOrderDetails(orderId: number): void {
    this.isLoading.set(true);
    this.orderService.getOrderById(orderId).pipe(
      catchError(error => {
        console.error('Error loading order details:', error);
        this.toastService.error(this.t('error'), this.t('failedToLoadDetails'));
        return of(null);
      })
    ).subscribe({
      next: (order) => {
        if (order) {
          this.closeRatingModal();
          this.productRatings.set(new Map());
          this.checkingRatings.set(false);
          this.selectedOrderDetails.set(order);
          this.showDetailsModal.set(true);
          if (this.canRateOrder(order) && order.items.length > 0) {
            this.checkProductRatings(order);
          }
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  closeDetailsModal(): void {
    this.closeRatingModal();
    this.detailsDialog()?.nativeElement.close();
    this.showDetailsModal.set(false);
    this.selectedOrderDetails.set(null);
  }

  onDetailsCancel(event: Event): void {
    event.preventDefault();
    if (!this.isLoading()) this.closeDetailsModal();
  }

  onRatingCancel(event: Event): void {
    event.preventDefault();
    if (!this.isLoading()) this.closeRatingModal();
  }

  canCancelOrder(order: OrderSummaryDto | OrderDto): boolean {
    const status = normalizeOrderStatus(order.status);
    return status === OrderStatus.Pending || status === OrderStatus.Processing;
  }

  canPayOrder(order: OrderSummaryDto | OrderDto): boolean {
    if (order.paymentInitializationStatus === PaymentInitializationStatus.NotApplicable) return false;
    const status = normalizeOrderStatus(order.status);
    if (status !== OrderStatus.Pending && status !== OrderStatus.Processing) return false;
    if (typeof order.isPaid === 'boolean') {
      return !order.isPaid;
    }

    const paymentStatus = order.paymentStatus;
    if (typeof paymentStatus === 'string') {
      const normalizedStatus = paymentStatus.trim().toLowerCase();
      if (['paid', 'completed', 'captured', 'success'].includes(normalizedStatus)) {
        return false;
      }
      if (['unpaid', 'pending', 'failed'].includes(normalizedStatus)) {
        return true;
      }
    }

    return status === OrderStatus.Pending;
  }

  payOrder(orderId: number): void {
    // Inspect the existing attempt before opening payment or offering a terminal retry.
    this.router.navigate(['/checkout/success'], { queryParams: { orderId, prepare: '1' } });
  }
  /** Cancelling is irreversible, so it goes through a confirmation step. */
  requestCancel(orderId: number): void {
    this.pendingCancelId.set(orderId);
  }

  closeCancelConfirm(event?: Event): void {
    event?.preventDefault();
    if (this.isLoading()) return;
    this.cancelDialog()?.nativeElement.close();
    this.pendingCancelId.set(null);
  }

  confirmCancel(): void {
    const orderId = this.pendingCancelId();
    if (orderId === null || this.isLoading()) return;
    this.cancelDialog()?.nativeElement.close();
    this.pendingCancelId.set(null);
    this.cancelOrder(orderId);
  }

  private cancelOrder(orderId: number): void {
    this.isLoading.set(true);
    this.orderService.cancelOrder(orderId).pipe(
      catchError(error => {
        console.error('Error cancelling order:', error);
        this.toastService.error(this.t('error'), this.t('failedToCancelOrder'));
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.toastService.success(this.t('success'), this.t('orderCancelled'));
        this.loadOrders();
        if (this.selectedOrderDetails()?.id === orderId) {
          this.closeDetailsModal();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getOrderStatusClass(status: OrderStatus | string | null | undefined): string {
    const classes: Record<OrderStatus, string> = {
      [OrderStatus.Pending]: 'badge-warning',
      [OrderStatus.Processing]: 'badge-info',
      [OrderStatus.Shipped]: 'badge-primary',
      [OrderStatus.Delivered]: 'badge-success',
      [OrderStatus.Cancelled]: 'badge-error',
      [OrderStatus.Refunded]: 'badge-neutral',
      [OrderStatus.Expired]: 'badge-error',
      [OrderStatus.RequiresReconciliation]: 'badge-warning'
    };
    return classes[normalizeOrderStatus(status)!] || 'badge-ghost';
  }

  getOrderStatusText(status: OrderStatus | string | null | undefined): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.Pending]: this.t('pending'),
      [OrderStatus.Processing]: this.t('processing'),
      [OrderStatus.Shipped]: this.t('shipped'),
      [OrderStatus.Delivered]: this.t('delivered'),
      [OrderStatus.Cancelled]: this.t('cancelled'),
      [OrderStatus.Refunded]: this.t('refunded'),
      [OrderStatus.Expired]: this.t('expired'),
      [OrderStatus.RequiresReconciliation]: this.t('requiresReconciliation')
    };
    return statusMap[normalizeOrderStatus(status)!] || this.t('unknownStatus');
  }

  canRateOrder(order: OrderDto | null): boolean {
    return normalizeOrderStatus(order?.status) === OrderStatus.Delivered;
  }

  private checkProductRatings(order: OrderDto): void {
    this.checkingRatings.set(true);
    const ratingChecks = order.items.map(item =>
      this.orderService.checkMyProductRating(item.productId).pipe(
        map(rating => ({ productId: item.productId, rating })),
        catchError(() => of({ productId: item.productId, rating: null }))
      )
    );

    combineLatest(ratingChecks).subscribe({
      next: (results) => {
        if (this.selectedOrderDetails() !== order) return;
        const ratingsMap = new Map<number, RatingDto>();
        results.forEach(({ productId, rating }) => {
          if (rating) {
            ratingsMap.set(productId, rating);
          }
        });
        this.productRatings.set(ratingsMap);
        this.checkingRatings.set(false);
      },
      error: () => {
        if (this.selectedOrderDetails() === order) this.checkingRatings.set(false);
      }
    });
  }

  getProductRating(productId: number): RatingDto | undefined {
    return this.productRatings().get(productId);
  }

  openRatingModal(productId: number, productName: string): void {
    const order = this.selectedOrderDetails();
    if (!order || !this.canRateOrder(order) || !order.items.some(item => item.productId === productId)) {
      return;
    }

    this.selectedProductForRating.set({ orderId: order.id, productId, productName });
    this.ratingForm.set({
      content: '',
      ratingNumber: 5,
      productId
    });
    this.showRatingModal.set(true);
  }

  closeRatingModal(): void {
    this.ratingDialog()?.nativeElement.close();
    this.showRatingModal.set(false);
    this.selectedProductForRating.set(null);
  }

  updateRatingNumber(rating: number): void {
    this.ratingForm.update(form => ({ ...form, ratingNumber: rating }));
  }

  updateRatingContent(content: string): void {
    this.ratingForm.update(form => ({ ...form, content }));
  }

  submitRating(): void {
    const form = this.ratingForm();
    const selection = this.selectedProductForRating();
    const order = this.selectedOrderDetails();
    if (this.isLoading() || !form.content.trim() || !selection || !order ||
        selection.orderId !== order.id || selection.productId !== form.productId || !this.canRateOrder(order)) {
      return;
    }

    this.isLoading.set(true);
    this.orderService.addProductRating({ ...form, orderId: selection.orderId }).pipe(
      catchError(error => {
        console.error('Error submitting rating:', error);
        this.toastService.error(this.t('error'), error.status === 403 ? this.t('ratingNotAllowed') : this.t('failedToSubmitRating'));
        return of(null);
      })
    ).subscribe({
      next: (rating) => {
        if (rating) {
          this.productRatings.update(map => {
            map.set(form.productId, rating);
            return new Map(map);
          });
          this.toastService.success(this.t('success'), this.t('ratingSubmitted'));
          this.closeRatingModal();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onToastClose(toastId: string): void {
    this.toastService.removeToast(toastId);
  }

  // PDF Invoice Generation
  downloadInvoice(orderId: number): void {
    this.isLoading.set(true);
    this.orderService.getInvoicePaymentData(orderId).pipe(
      catchError(error => {
        console.error('Error loading invoice data:', error);
        this.toastService.error(this.t('error'), this.t('failedToLoadInvoice'));
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe({
      next: async (invoiceData) => {
        if (invoiceData && invoiceData.success) {
          await this.generatePDF(invoiceData);
        } else {
          this.toastService.error(this.t('error'), invoiceData?.message || this.t('failedToLoadInvoice'));
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
      const { downloadInvoicePDF } = await import('../../../core/utils/invoice-pdf');
      await downloadInvoicePDF(invoice);
      this.toastService.success(this.t('success'), this.t('invoiceDownloaded'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.error(this.t('error'), this.t('failedToGeneratePdf'));
    }
  }

}
