import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { UserOrderService } from './user-order.service';
import { 
  OrderSummaryDto, 
  OrderDto, 
  OrderStatus, 
  RatingDto, 
  RatingCreateDto,
  InvoicePaymentDto 
} from './models.order';
import { combineLatest, map, startWith, catchError, of } from 'rxjs';

declare const window: any;

@Component({
  selector: 'app-user-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-order.html',
  styleUrl: './user-order.css'
})
export class UserOrderComponent implements OnInit, OnDestroy {
  private orderService = inject(UserOrderService);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

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
      const matchesStatus = !status || order.status === status;
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
      processing: 'قيد المعالجة',
      shipped: 'تم الشحن',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      clearFilters: 'مسح الفلاتر',
      orderNumber: 'رقم الطلب',
      customer: 'العميل',
      items: 'عناصر',
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
      downloadInvoice: 'تحميل الفاتورة'
    },
    en: {
      myOrders: 'My Orders',
      viewAndManage: 'View and manage your orders',
      refresh: 'Refresh',
      searchPlaceholder: 'Search for an order...',
      allStatus: 'All Status',
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
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
      selectedStars: 'Selected Stars',
      outOfStars: 'out of 5',
      yourReview: 'Your Review',
      required: 'Required',
      shareExperience: 'Share your experience with this product...',
      characters: 'characters',
      submitRating: 'Submit Rating',
      downloadInvoice: 'Download Invoice'
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
    this.showDetailsModal.set(false);
    this.selectedOrderDetails.set(null);
  }

  canCancelOrder(order: OrderSummaryDto | OrderDto): boolean {
    return order.status === OrderStatus.Pending || order.status === OrderStatus.Processing;
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

  getOrderStatusClass(status: OrderStatus): string {
    const classes: Record<OrderStatus, string> = {
      [OrderStatus.Pending]: 'badge-warning',
      [OrderStatus.Processing]: 'badge-info',
      [OrderStatus.Shipped]: 'badge-primary',
      [OrderStatus.Delivered]: 'badge-success',
      [OrderStatus.Cancelled]: 'badge-error'
    };
    return classes[status] || 'badge-ghost';
  }

  getOrderStatusText(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.Pending]: this.t('pending'),
      [OrderStatus.Processing]: this.t('processing'),
      [OrderStatus.Shipped]: this.t('shipped'),
      [OrderStatus.Delivered]: this.t('delivered'),
      [OrderStatus.Cancelled]: this.t('cancelled')
    };
    return statusMap[status] || '';
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
    try {
      // Check if jsPDF and html2canvas are available
      if (typeof window === 'undefined' || !window.jspdf) {
        this.toastService.error('خطأ', 'مكتبة PDF غير متوفرة');
        return;
      }

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      // Create HTML invoice template
      const invoiceHTML = this.createInvoiceHTML(invoice);
      
      // Create an iframe to isolate styles
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0px';
      iframe.style.width = '210mm';
      iframe.style.height = 'auto'; // Allow content to expand
      iframe.style.minHeight = '297mm'; // Minimum A4 height
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      // Wait for iframe to load
      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.srcdoc = invoiceHTML;
      });

      // Wait a bit for initial rendering
      await new Promise(resolve => setTimeout(resolve, 200));

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      // Wait for images to load (especially logo)
      const images = iframeDoc.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve even on error to not block
        });
      });
      await Promise.all(imagePromises);

      // Wait a bit more for final rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      // Get the invoice container element
      const invoiceContainer = iframeDoc.querySelector('.invoice-container') as HTMLElement;
      if (!invoiceContainer) {
        throw new Error('Invoice container not found');
      }

      // Calculate actual content height and adjust iframe height
      const actualHeight = Math.max(
        invoiceContainer.scrollHeight,
        invoiceContainer.offsetHeight,
        iframeDoc.body.scrollHeight,
        iframeDoc.body.offsetHeight,
        iframeDoc.documentElement.scrollHeight,
        iframeDoc.documentElement.offsetHeight
      );
      
      // Set iframe height to accommodate all content
      iframe.style.height = `${actualHeight}px`;
      
      // Wait a bit for iframe to resize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert HTML to canvas with optimized settings
      const canvas = await html2canvas(invoiceContainer, {
        scale: 6, // Higher scale for maximum resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // White background instead of null to avoid black
        width: invoiceContainer.scrollWidth,
        height: invoiceContainer.scrollHeight,
        windowWidth: invoiceContainer.scrollWidth,
        windowHeight: invoiceContainer.scrollHeight,
        allowTaint: false,
        ignoreElements: (element) => {
          return false;
        }
      });

      // Remove iframe
      document.body.removeChild(iframe);

      // Convert canvas to JPEG with compression
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
      
      // Calculate dimensions to fit width of PDF page
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate ratio to fit the width of the page
      const widthRatio = pdfWidth / imgWidth;
      const ratio = widthRatio; // Fit to width, not max
      
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      // Check if image height exceeds one page
      if (imgScaledHeight <= pdfHeight) {
        // Image fits in one page
        const xOffset = 0;
        const yOffset = 0;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgScaledWidth, imgScaledHeight, undefined, 'FAST');
      } else {
        // Image is taller than one page - split into multiple pages
        const totalPages = Math.ceil(imgScaledHeight / pdfHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          // Calculate source Y position in the original canvas (in pixels)
          const sourceY = Math.floor((page * pdfHeight) / ratio);
          const remainingHeight = imgHeight - sourceY;
          const sourceHeight = Math.min(Math.ceil(pdfHeight / ratio), remainingHeight);
          
          // Ensure we don't go beyond the canvas bounds
          if (sourceY >= imgHeight || sourceHeight <= 0) {
            break;
          }
          
          // Create a temporary canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          if (pageCtx) {
            // Fill with white background
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            
            // Draw the portion of the image for this page
            pageCtx.drawImage(
              canvas,
              0, sourceY, imgWidth, sourceHeight,  // Source rectangle from original canvas
              0, 0, imgWidth, sourceHeight          // Destination rectangle in page canvas
            );
            
            // Convert page canvas to image
            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
            
            // Calculate scaled height for this page
            const pageScaledHeight = sourceHeight * ratio;
            
            // Add to PDF (fill the entire page height)
            pdf.addImage(pageImgData, 'JPEG', 0, 0, imgScaledWidth, pageScaledHeight, undefined, 'FAST');
          }
        }
      }

      // Save the PDF
      const fileName = `Invoice_${invoice.orderNumber}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      
      this.toastService.success('نجح', 'تم تحميل الفاتورة بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.error('خطأ', 'فشل إنشاء ملف PDF');
    }
  }

  private createInvoiceHTML(invoice: InvoicePaymentDto): string {
    const orderDate = new Date(invoice.orderCreatedAt);
    const address = invoice.shippingAddress;
    const cityState = `${address.city}${address.state ? ', ' + address.state : ''} ${address.postalCode}`;
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // Get status text in Arabic for invoice
    const getStatusTextArabic = (status: OrderStatus): string => {
      const statusMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'قيد الانتظار',
        [OrderStatus.Processing]: 'قيد المعالجة',
        [OrderStatus.Shipped]: 'تم الشحن',
        [OrderStatus.Delivered]: 'تم التسليم',
        [OrderStatus.Cancelled]: 'ملغي'
      };
      return statusMap[status] || '';
    };

    // Get status background color
    const getStatusBgColor = (status: OrderStatus): string => {
      const colorMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'rgb(255, 193, 7)', // Yellow/Amber
        [OrderStatus.Processing]: 'rgb(13, 110, 253)', // Blue
        [OrderStatus.Shipped]: 'rgb(13, 202, 240)', // Cyan
        [OrderStatus.Delivered]: 'rgb(25, 135, 84)', // Green
        [OrderStatus.Cancelled]: 'rgb(220, 53, 69)' // Red
      };
      return colorMap[status] || 'rgb(108, 117, 125)'; // Gray default
    };

    // Get status text color (white or black based on background)
    const getStatusTextColor = (status: OrderStatus): string => {
      const colorMap: Record<OrderStatus, string> = {
        [OrderStatus.Pending]: 'rgb(0, 0, 0)', // Black for yellow
        [OrderStatus.Processing]: 'rgb(255, 255, 255)', // White for blue
        [OrderStatus.Shipped]: 'rgb(255, 255, 255)', // White for cyan
        [OrderStatus.Delivered]: 'rgb(255, 255, 255)', // White for green
        [OrderStatus.Cancelled]: 'rgb(255, 255, 255)' // White for red
      };
      return colorMap[status] || 'rgb(255, 255, 255)';
    };
    
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            height: auto;
          }
          body {
            font-family: Arial, DejaVu Sans, Tahoma, sans-serif;
            direction: rtl;
            color: rgb(0, 0, 0);
            background-color: rgb(255, 255, 255);
            padding: 0;
            margin: 0;
            overflow: visible;
            height: auto;
          }
          .invoice-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            background-color: rgb(255, 255, 255);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            position: relative;
            min-height: 297mm;
          }
          .header {
            background-color: rgb(5, 66, 57);
            color: rgb(255, 255, 255);
            padding: 30px 20px;
            text-align: center;
            width: 100%;
            margin: 0;
            position: relative;
          }
          .header h1 {
            font-size: 28px;
            margin: 0;
            font-weight: bold;
          }
          .header h2 {
            font-size: 18px;
            font-weight: normal;
            margin: 0;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            opacity: 0.08;
            z-index: 0;
            pointer-events: none;
            max-width: 600px;
            max-height: 600px;
            width: auto;
            height: auto;
          }
          .invoice-container {
            position: relative;
            z-index: 1;
          }
          .invoice-info {
            padding: 25px 20px;
            background-color: rgb(250, 250, 250);
            border-bottom: 3px solid rgb(5, 66, 57);
          }
          .invoice-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            align-items: center;
          }
          .invoice-info-row:last-child {
            margin-bottom: 0;
          }
          .invoice-info-label {
            font-weight: bold;
            color: rgb(5, 66, 57);
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 13px;
            margin-right: 5px;
          }
          .section {
            padding: 25px 20px;
            border-bottom: 1px solid rgb(230, 230, 230);
            background-color: rgb(255, 255, 255);
          }
          .section:last-of-type {
            border-bottom: none;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: rgb(5, 66, 57);
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgb(5, 66, 57);
            display: inline-block;
            width: 100%;
          }
          .customer-info, .address-info {
            line-height: 1.8;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .items-table thead {
            background-color: rgb(5, 66, 57);
            color: rgb(255, 255, 255);
          }
          .items-table th {
            padding: 12px;
            text-align: right;
            font-weight: bold;
          }
          .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgb(224, 224, 224);
          }
          .items-table tbody tr:nth-child(even) {
            background-color: rgb(245, 245, 245);
          }
          .summary {
            padding: 25px 20px;
            text-align: left;
            background-color: rgb(250, 250, 250);
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            font-size: 14px;
          }
          .summary-label {
            font-weight: bold;
            color: rgb(60, 60, 60);
          }
          .summary-row-discount {
            color: rgb(0, 160, 0);
            font-weight: bold;
          }
          .summary-total {
            border-top: 3px solid rgb(5, 66, 57);
            padding-top: 15px;
            margin-top: 15px;
            background-color: rgb(5, 66, 57);
            color: rgb(255, 255, 255);
            padding: 20px;
            border-radius: 0;
            display: flex;
            justify-content: space-between;
            font-size: 20px;
            font-weight: bold;
            margin-left: -20px;
            margin-right: -20px;
            padding-left: 20px;
            padding-right: 20px;
          }
          .footer {
            text-align: center;
            padding: 25px 20px;
            color: rgb(102, 102, 102);
            font-size: 13px;
            background-color: rgb(255, 255, 255);
            border-top: 1px solid rgb(230, 230, 230);
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <img src="/logo.png" alt="الجوهرة" class="watermark" />
          <div class="header">
            <h1>الجوهرة</h1>
            <h2>فاتورة</h2>
          </div>
          
          <div class="invoice-info">
            <div class="invoice-info-row">
              <div>
                <span class="invoice-info-label">رقم الفاتورة:</span> ${escapeHtml(invoice.orderNumber)}
              </div>
              <div>
                <span class="invoice-info-label">الحالة:</span> 
                <span class="status-badge" style="background-color: ${getStatusBgColor(invoice.status)}; color: ${getStatusTextColor(invoice.status)};">
                  ${escapeHtml(getStatusTextArabic(invoice.status))}
                </span>
              </div>
            </div>
            <div class="invoice-info-row">
              <div>
                <span class="invoice-info-label">تاريخ الطلب:</span> ${escapeHtml(orderDate.toLocaleDateString('ar-SA'))}
              </div>
            </div>
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
              ${address.street ? `<div><strong>الشارع:</strong> ${escapeHtml(address.street)}</div>` : ''}
              ${address.alQataa ? `<div><strong>القطعة:</strong> ${escapeHtml(address.alQataa)}</div>` : ''}
              ${address.alSharee ? `<div><strong>الشارع:</strong> ${escapeHtml(address.alSharee)}</div>` : ''}
              ${address.alJada ? `<div><strong>الجادة:</strong> ${escapeHtml(address.alJada)}</div>` : ''}
              ${address.alManzil ? `<div><strong>المنزل:</strong> ${escapeHtml(address.alManzil)}</div>` : ''}
              ${address.alDor ? `<div><strong>الدور:</strong> ${escapeHtml(address.alDor)}</div>` : ''}
              ${address.alShakka ? `<div><strong>الشقة:</strong> ${escapeHtml(address.alShakka)}</div>` : ''}
              <div><strong>المدينة:</strong> ${escapeHtml(address.city)}</div>
              ${address.state ? `<div><strong>المحافظة:</strong> ${escapeHtml(address.state)}</div>` : ''}
              ${address.postalCode ? `<div><strong>الرمز البريدي:</strong> ${escapeHtml(address.postalCode)}</div>` : ''}
              <div><strong>الدولة:</strong> ${escapeHtml(address.country)}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">عناصر الطلب</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${item.price.toFixed(3)} KWD</td>
                    <td>${item.quantity}</td>
                    <td>${item.total.toFixed(3)} KWD</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">المجموع الفرعي:</span>
              <span>${invoice.subtotal.toFixed(3)} KWD</span>
            </div>
            ${invoice.couponDiscountAmount && invoice.couponDiscountAmount > 0 ? `
            <div class="summary-row summary-row-discount">
              <span class="summary-label">الخصم (${escapeHtml(invoice.couponCode || '')}):</span>
              <span>-${invoice.couponDiscountAmount.toFixed(3)} KWD</span>
            </div>
            ` : ''}
            <div class="summary-row">
              <span class="summary-label">الشحن:</span>
              <span>${invoice.shipping.toFixed(3)} KWD</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">الضريبة:</span>
              <span>${invoice.tax.toFixed(3)} KWD</span>
            </div>
            <div class="summary-total">
              <span>الإجمالي:</span>
              <span>${invoice.total.toFixed(3)} KWD</span>
            </div>
          </div>

          <div class="footer">
            <div>شكراً لاختيارك الجوهرة</div>
            <div style="margin-top: 5px; color: rgb(102, 102, 102);">Thank you for choosing Aljawhara</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

