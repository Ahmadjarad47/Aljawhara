import { Component, OnInit, OnDestroy, ElementRef, afterRenderEffect, viewChild, inject, signal, computed } from '@angular/core';
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
import { combineLatest, map, startWith, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { PaymentInitializationStatus } from '../../../core/Models/checkout-payment';

declare const window: any;

registerLocaleData(arabicLocale);

@Component({
  selector: 'app-user-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-order.html',
  styleUrl: './user-order.css'
})
export class UserOrderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private orderService = inject(UserOrderService);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  private detailsDialog = viewChild<ElementRef<HTMLDialogElement>>('detailsDialog');
  private ratingDialog = viewChild<ElementRef<HTMLDialogElement>>('ratingDialog');

  constructor() {
    afterRenderEffect(() => {
      for (const dialog of [this.detailsDialog(), this.ratingDialog()]) {
        if (dialog && !dialog.nativeElement.open) dialog.nativeElement.showModal();
      }
    });
  }

  // Expose OrderStatus enum to template
  OrderStatus = OrderStatus;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // State signals
  isLoading = signal(false);
  orders = signal<OrderSummaryDto[]>([]);
  searchTerm = signal('');
  statusFilter = signal<OrderStatus | null>(null);
  selectedOrderDetails = signal<OrderDto | null>(null);
  showDetailsModal = signal(false);
  showRatingModal = signal(false);
  selectedProductForRating = signal<{ productId: number; productName: string } | null>(null);
  checkingRatings = signal(false);
  productRatings = signal<Map<number, RatingDto>>(new Map());

  // Rating form
  ratingForm = signal<RatingCreateDto>({
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
      downloadInvoice: 'تحميل الفاتورة',
      payNow: 'ادفع الآن'
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
      downloadInvoice: 'Download Invoice',
      payNow: 'Pay Now'
    }
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }

  ngOnInit(): void {
    this.loadOrders();
    this.checkLanguage();
    this.languageCheckInterval = setInterval(() => this.checkLanguage(), 1000);
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  checkLanguage(): void {
    const lang = (localStorage.getItem('language') as 'ar' | 'en' | null) ?? 'ar';
    if (lang !== this.currentLanguage()) {
      this.currentLanguage.set(lang);
    }
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getMyOrders().pipe(
      catchError(error => {
        console.error('Error loading orders:', error);
        this.toastService.error('خطأ', 'فشل تحميل الطلبات');
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
        this.toastService.error('خطأ', 'فشل تحميل تفاصيل الطلب');
        return of(null);
      })
    ).subscribe({
      next: (order) => {
        if (order) {
          this.selectedOrderDetails.set(order);
          this.showDetailsModal.set(true);
          this.checkProductRatings(order.items);
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
  cancelOrder(orderId: number): void {
    if (!confirm(this.currentLanguage() === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?')) {
      return;
    }

    this.isLoading.set(true);
    this.orderService.cancelOrder(orderId).pipe(
      catchError(error => {
        console.error('Error cancelling order:', error);
        this.toastService.error('خطأ', 'فشل إلغاء الطلب');
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.toastService.success('نجح', 'تم إلغاء الطلب بنجاح');
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

  checkProductRatings(items: OrderDto['items']): void {
    this.checkingRatings.set(true);
    const ratingChecks = items.map(item =>
      this.orderService.checkMyProductRating(item.productId).pipe(
        map(rating => ({ productId: item.productId, rating })),
        catchError(() => of({ productId: item.productId, rating: null }))
      )
    );

    combineLatest(ratingChecks).subscribe({
      next: (results) => {
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
        this.checkingRatings.set(false);
      }
    });
  }

  hasRatedProduct(productId: number): boolean {
    return this.productRatings().has(productId);
  }

  getProductRating(productId: number): RatingDto | undefined {
    return this.productRatings().get(productId);
  }

  openRatingModal(productId: number, productName: string): void {
    this.selectedProductForRating.set({ productId, productName });
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
    if (!form.content.trim()) {
      return;
    }

    this.isLoading.set(true);
    this.orderService.addProductRating(form).pipe(
      catchError(error => {
        console.error('Error submitting rating:', error);
        this.toastService.error('خطأ', 'فشل إرسال التقييم');
        return of(null);
      })
    ).subscribe({
      next: (rating) => {
        if (rating) {
          this.productRatings.update(map => {
            map.set(form.productId, rating);
            return new Map(map);
          });
          this.toastService.success('نجح', 'تم إرسال التقييم بنجاح');
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
        this.toastService.error('خطأ', 'فشل تحميل بيانات الفاتورة');
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe({
      next: async (invoiceData) => {
        if (invoiceData && invoiceData.success) {
          await this.generatePDF(invoiceData);
        } else {
          this.toastService.error('خطأ', invoiceData?.message || 'فشل تحميل بيانات الفاتورة');
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
      this.toastService.success('نجح', 'تم تحميل الفاتورة بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.error('خطأ', 'فشل إنشاء ملف PDF');
    }
  }

}
