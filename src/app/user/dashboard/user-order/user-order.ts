import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserOrderService } from './user-order.service';
import { OrderSummaryDto, OrderDto, OrderStatus, RatingCreateDto, RatingDto } from './models.order';
import { Observable, map, forkJoin } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../../core/components/toast/toast.component';

@Component({
  selector: 'app-user-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-order.html',
  styleUrl: './user-order.css'
})
export class UserOrder implements OnInit, OnDestroy {
  public readonly orderService = inject(UserOrderService);
  public readonly toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      myOrders: 'طلباتي',
      viewAndManage: 'عرض وإدارة سجل طلباتك',
      refresh: 'تحديث',
      searchPlaceholder: 'البحث برقم الطلب أو اسم العميل...',
      allStatus: 'جميع الحالات',
      clearFilters: 'مسح الفلاتر',
      orderNumber: 'رقم الطلب',
      customer: 'العميل',
      items: 'العناصر',
      total: 'الإجمالي',
      status: 'الحالة',
      orderDate: 'تاريخ الطلب',
      actions: 'الإجراءات',
      view: 'عرض',
      cancel: 'إلغاء',
      noOrdersFound: 'لم يتم العثور على طلبات',
      orderDetails: 'تفاصيل الطلب',
      orderDateLabel: 'تاريخ الطلب',
      shippingAddress: 'عنوان الشحن',
      orderItems: 'عناصر الطلب',
      product: 'المنتج',
      price: 'السعر',
      quantity: 'الكمية',
      rating: 'التقييم',
      rated: 'تم التقييم',
      rate: 'قيم',
      subtotal: 'المجموع الفرعي',
      discount: 'خصم',
      shipping: 'الشحن',
      tax: 'الضريبة',
      cancelOrder: 'إلغاء الطلب',
      close: 'إغلاق',
      rateProduct: 'قيم المنتج',
      yourRating: 'تقييمك',
      selectedStars: 'محدد',
      outOfStars: 'من 5 نجوم',
      yourReview: 'تقييمك',
      required: 'مطلوب',
      shareExperience: 'شاركنا تجربتك مع هذا المنتج...',
      characters: 'حرف',
      submitRating: 'إرسال التقييم',
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      unknown: 'غير معروف',
      error: 'خطأ',
      failedToLoadOrders: 'فشل تحميل الطلبات',
      loading: 'جاري التحميل',
      loadingOrderDetails: 'جاري تحميل تفاصيل الطلب...',
      failedToLoadOrderDetails: 'فشل تحميل تفاصيل الطلب',
      validationError: 'خطأ في التحقق',
      pleaseEnterReview: 'يرجى إدخال تعليق التقييم',
      ratingRange: 'يجب أن يكون التقييم بين 1 و 5',
      submitting: 'جاري الإرسال',
      submittingRating: 'جاري إرسال تقييمك...',
      success: 'نجح',
      thankYouRating: 'شكراً لك على تقييمك!',
      failedToSubmitRating: 'فشل إرسال التقييم',
      cancelling: 'جاري الإلغاء',
      cancellingOrder: 'جاري إلغاء الطلب...',
      orderCancelled: 'تم إلغاء الطلب بنجاح',
      failedToCancelOrder: 'فشل إلغاء الطلب',
      areYouSure: 'هل أنت متأكد أنك تريد إلغاء هذا الطلب؟'
    },
    en: {
      myOrders: 'My Orders',
      viewAndManage: 'View and manage your order history',
      refresh: 'Refresh',
      searchPlaceholder: 'Search by order number or customer name...',
      allStatus: 'All Status',
      clearFilters: 'Clear Filters',
      orderNumber: 'Order Number',
      customer: 'Customer',
      items: 'Items',
      total: 'Total',
      status: 'Status',
      orderDate: 'Order Date',
      actions: 'Actions',
      view: 'View',
      cancel: 'Cancel',
      noOrdersFound: 'No orders found',
      orderDetails: 'Order Details',
      orderDateLabel: 'Order Date',
      shippingAddress: 'Shipping Address',
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
      selectedStars: 'Selected',
      outOfStars: 'out of 5 stars',
      yourReview: 'Your Review',
      required: 'Required',
      shareExperience: 'Share your experience with this product...',
      characters: 'characters',
      submitRating: 'Submit Rating',
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      unknown: 'Unknown',
      error: 'Error',
      failedToLoadOrders: 'Failed to load orders',
      loading: 'Loading',
      loadingOrderDetails: 'Loading order details...',
      failedToLoadOrderDetails: 'Failed to load order details',
      validationError: 'Validation Error',
      pleaseEnterReview: 'Please enter a review comment',
      ratingRange: 'Rating must be between 1 and 5',
      submitting: 'Submitting',
      submittingRating: 'Submitting your rating...',
      success: 'Success',
      thankYouRating: 'Thank you for your rating!',
      failedToSubmitRating: 'Failed to submit rating',
      cancelling: 'Cancelling',
      cancellingOrder: 'Cancelling order...',
      orderCancelled: 'Order cancelled successfully',
      failedToCancelOrder: 'Failed to cancel order',
      areYouSure: 'Are you sure you want to cancel this order?'
    }
  };

  // Translation helper
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations.ar] || key;
  }
  
  // Signals for reactive state management
  isLoading = signal(false);
  showDetailsModal = signal(false);
  selectedOrderDetails = signal<OrderDto | null>(null);
  
  // Rating modal signals
  showRatingModal = signal(false);
  selectedProductForRating = signal<{ productId: number; productName: string } | null>(null);
  ratingForm = signal<{ ratingNumber: number; content: string }>({
    ratingNumber: 5,
    content: ''
  });
  productRatings = signal<Map<number, RatingDto | null>>(new Map()); // productId -> RatingDto | null
  checkingRatings = signal(false);
  
  // Filter signals
  statusFilter = signal<OrderStatus | null>(null);
  searchTerm = signal('');
  
  // Main data observables
  orders$: Observable<OrderSummaryDto[]> = this.orderService.orders$;
  
  // Filtered orders
  filteredOrders$ = computed(() => {
    let orders: OrderSummaryDto[] = [];
    this.orders$.subscribe(o => orders = o).unsubscribe();
    
    // Apply filters
    if (this.statusFilter() !== null) {
      orders = orders.filter(order => order.status === this.statusFilter());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      orders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term)
      );
    }
    
    return orders;
  });
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // OrderStatus enum for template
  OrderStatus = OrderStatus;
  
  constructor() {
    // Initial load effect
    effect(() => {
      this.loadOrders();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
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
  
  loadOrders() {
    this.isLoading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('failedToLoadOrders'));
        this.isLoading.set(false);
        console.error('Error loading orders:', error);
      }
    });
  }

  onSearch() {
    // The computed signal will automatically update the filtered results
  }

  onStatusFilterChange(status: OrderStatus | null) {
    this.statusFilter.set(status);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  viewOrderDetails(orderId: number) {
    const loadingToastId = this.toastService.loading(this.t('loading'), this.t('loadingOrderDetails'));
    this.isLoading.set(true);
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.selectedOrderDetails.set(order);
        this.showDetailsModal.set(true);
        this.isLoading.set(false);
        this.toastService.removeToast(loadingToastId);
        // Check ratings for all products in this order
        this.checkProductRatings(order);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('failedToLoadOrderDetails'));
        this.isLoading.set(false);
        console.error('Error loading order details:', error);
      }
    });
  }

  checkProductRatings(order: OrderDto) {
    if (!order.items || order.items.length === 0) {
      return;
    }

    this.checkingRatings.set(true);
    const ratingChecks = order.items.map(item => 
      this.orderService.checkMyProductRating(item.productId).pipe(
        map(rating => ({ productId: item.productId, rating: rating }))
      )
    );

    forkJoin(ratingChecks).subscribe({
      next: (results) => {
        const ratingsMap = new Map<number, RatingDto | null>();
        results.forEach(result => {
          ratingsMap.set(result.productId, result.rating);
        });
        this.productRatings.set(ratingsMap);
        this.checkingRatings.set(false);
      },
      error: (error) => {
        console.error('Error checking product ratings:', error);
        this.checkingRatings.set(false);
      }
    });
  }

  hasRatedProduct(productId: number): boolean {
    const rating = this.productRatings().get(productId);
    return rating !== null && rating !== undefined;
  }

  getProductRating(productId: number): RatingDto | null {
    return this.productRatings().get(productId) ?? null;
  }

  openRatingModal(productId: number, productName: string) {
    // Check if already rated - if yes, don't open modal for new rating
    const existingRating = this.getProductRating(productId);
    if (existingRating) {
      // User has already rated, modal should not open for new rating
      return;
    }
    
    this.selectedProductForRating.set({ productId, productName });
    this.ratingForm.set({ ratingNumber: 5, content: '' });
    this.showRatingModal.set(true);
  }

  closeRatingModal() {
    this.showRatingModal.set(false);
    this.selectedProductForRating.set(null);
    this.ratingForm.set({ ratingNumber: 5, content: '' });
  }

  updateRatingNumber(ratingNumber: number) {
    const current = this.ratingForm();
    this.ratingForm.set({ ...current, ratingNumber });
  }

  updateRatingContent(content: string) {
    const current = this.ratingForm();
    this.ratingForm.set({ ...current, content });
  }

  submitRating() {
    const product = this.selectedProductForRating();
    if (!product) return;

    const form = this.ratingForm();
    if (!form.content || form.content.trim().length === 0) {
      this.toastService.error(this.t('validationError'), this.t('pleaseEnterReview'));
      return;
    }

    if (form.ratingNumber < 1 || form.ratingNumber > 5) {
      this.toastService.error(this.t('validationError'), this.t('ratingRange'));
      return;
    }

    const ratingDto: RatingCreateDto = {
      productId: product.productId,
      ratingNumber: form.ratingNumber,
      content: form.content.trim()
    };

    const loadingToastId = this.toastService.loading(this.t('submitting'), this.t('submittingRating'));
    this.orderService.addProductRating(ratingDto).subscribe({
      next: (newRating) => {
        // Update the rating data for this product
        const ratingsMap = new Map(this.productRatings());
        ratingsMap.set(product.productId, newRating);
        this.productRatings.set(ratingsMap);
        
        this.closeRatingModal();
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('thankYouRating'));
      },
      error: (error) => {
        this.toastService.updateToError(
          loadingToastId, 
          this.t('error'), 
          error.error?.message || this.t('failedToSubmitRating')
        );
        console.error('Error submitting rating:', error);
      }
    });
  }

  cancelOrder(orderId: number) {
    if (!confirm(this.t('areYouSure'))) {
      return;
    }

    const loadingToastId = this.toastService.loading(this.t('cancelling'), this.t('cancellingOrder'));
    this.isLoading.set(true);
    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        this.loadOrders();
        this.closeDetailsModal();
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('orderCancelled'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), error.error?.message || this.t('failedToCancelOrder'));
        this.isLoading.set(false);
        console.error('Error cancelling order:', error);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedOrderDetails.set(null);
    // Clear ratings cache when closing modal
    this.productRatings.set(new Map());
  }

  getOrderStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'badge-warning';
      case OrderStatus.Processing:
        return 'badge-info';
      case OrderStatus.Shipped:
        return 'badge-primary';
      case OrderStatus.Delivered:
        return 'badge-success';
      case OrderStatus.Cancelled:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getOrderStatusText(status: OrderStatus): string {
    const isArabic = this.currentLanguage() === 'ar';
    switch (status) {
      case OrderStatus.Pending:
        return isArabic ? this.t('pending') : 'Pending';
      case OrderStatus.Processing:
        return isArabic ? this.t('processing') : 'Processing';
      case OrderStatus.Shipped:
        return isArabic ? this.t('shipped') : 'Shipped';
      case OrderStatus.Delivered:
        return isArabic ? this.t('delivered') : 'Delivered';
      case OrderStatus.Cancelled:
        return isArabic ? this.t('cancelled') : 'Cancelled';
      default:
        return isArabic ? this.t('unknown') : 'Unknown';
    }
  }

  canCancelOrder(order: OrderDto | OrderSummaryDto): boolean {
    return order.status === OrderStatus.Pending || order.status === OrderStatus.Processing;
  }

  getFilteredOrdersLength(): number {
    return this.filteredOrders$().length;
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }

  // Make Math available in template
  Math = Math;
}
