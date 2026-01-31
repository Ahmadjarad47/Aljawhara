import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../product/product-service';
import { ProductDto, ProductSummaryDto } from '../product/product.models';
import { Observable, catchError, of } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { ServiceAuth } from '../../auth/service-auth';
import { RatingDto } from '../../admin/product/product.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  public authService = inject(ServiceAuth);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      home: 'الرئيسية',
      category: 'الفئة',
      product: 'منتج',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      available: 'متوفر',
      inCart: 'في السلة:',
      quantity: 'الكمية',
      addToCart: 'أضف إلى السلة',
      buyNow: 'اشتري الآن',
      details: 'التفاصيل',
      specifications: 'المواصفات',
      reviews: 'التقييمات',
      shippingInfo: 'معلومات الشحن',
      returnPolicy: 'سياسة الإرجاع',
      keyFeatures: 'المميزات الرئيسية',
      readMore: 'اقرأ المزيد',
      showLess: 'عرض أقل',
      noDescription: 'لا يوجد وصف متاح',
      verifiedPurchase: 'شراء موثق',
      reviewsCount: 'تقييم',
      youSave: 'وفرت',
      freeShipping: 'شحن مجاني',
      onOrdersOver: 'للطلبات أكثر من',
      fastDelivery: 'توصيل سريع',
      businessDays: 'أيام عمل',
      easyReturns: 'إرجاع سهل',
      dayReturnPolicy: 'إرجاع خلال 24 ساعة',
      deliveryAllKuwait: 'توصيل لجميع مناطق الكويت',
      deliveryTimeOnConfirm: 'وقت التوصيل يُحدد عند تأكيد الطلب',
      rescheduleFeesIfAbsent: 'إعادة جدولة التوصيل برسوم إضافية عند الغياب',
      returnExchangePolicyTitle: 'سياسة الإرجاع والاستبدال',
      returnIntro: 'نحرص على رضاكم الكامل ونلتزم بسياسة إرجاع واستبدال واضحة.',
      returnWindow: 'حقكم طلب الإرجاع أو الاستبدال خلال 24 ساعة من استلام الطلب.',
      returnConditions: 'شروط الإرجاع والاستبدال:',
      returnCondition1: 'المنتج بحالته الأصلية وغير مستخدم وغير مفتوح وبالتغليف الأصلي',
      returnCondition2: 'المنتجات الاستهلاكية ومواد التنظيف والورقيات لا تُسترجع إذا فُتحت أو استُخدمت (لأسباب السلامة والصحة العامة)',
      returnStoreResponsibility: 'إذا وصل المنتج تالفاً أو لا يطابق الطلب، تتحمل المتجر تكلفة الاستبدال أو الإرجاع كاملة.',
      returnCustomerResponsibility: 'إذا رغب العميل بالإرجاع دون أي خطأ من المتجر، يتحمل العميل رسوم التوصيل.',
      returnRefundProcess: 'يتم استرداد المبلغ بنفس وسيلة الدفع المستخدمة للشراء، أو كما يُتفق عليه مع خدمة العملاء.',
      deliveryPolicyTitle: 'سياسة التوصيل',
      deliveryAllRegions: 'توصيل سريع لجميع مناطق الكويت',
      deliveryTimeSpecified: 'وقت التوصيل يُحدد عند تأكيد الطلب',
      deliveryAbsentReschedule: 'في حال غياب العميل عند الاستلام، يحق للمتجر إعادة جدولة التوصيل برسوم إضافية.',
      relatedProducts: 'منتجات ذات صلة',
      loginRequired: 'تسجيل الدخول مطلوب',
      pleaseLogin: 'يرجى تسجيل الدخول أولاً لكتابة تقييم',
      login: 'تسجيل الدخول',
      checkingRating: 'جاري التحقق من تقييمك...',
      yourReview: 'تقييمك',
      submitted: 'تم الإرسال',
      writeReview: 'اكتب تقييماً',
      rating: 'التقييم',
      title: 'العنوان',
      summarizeReview: 'لخص تقييمك',
      review: 'التقييم',
      tellUsExperience: 'أخبرنا عن تجربتك مع هذا المنتج',
      submitReview: 'إرسال التقييم',
      submittedOn: 'تم الإرسال في',
      basedOn: 'بناءً على',
      reviewsText: 'تقييم',
      removeFromCart: 'إزالة من السلة',
      cartUpdated: 'تم تحديث السلة',
      addedToCart: 'تمت الإضافة إلى السلة',
      hasBeenAdded: 'تمت إضافته إلى سلة التسوق الخاصة بك',
      error: 'خطأ',
      failedToAdd: 'فشل إضافة المنتج إلى السلة',
      outOfStockMsg: 'هذا المنتج غير متوفر حالياً',
      selectionRequired: 'الاختيار مطلوب',
      pleaseSelectAll: 'يرجى اختيار جميع خيارات المتغيرات',
      stockLimit: 'حد المخزون',
      onlyAvailable: 'متوفر فقط',
      itemsAvailable: 'عنصر متوفر',
      removed: 'تمت الإزالة',
      hasBeenRemoved: 'تمت إزالته من السلة',
      addToWishlist: 'أضف إلى قائمة الأمنيات',
      removeFromWishlist: 'إزالة من قائمة الأمنيات',
      addedToWishlist: 'تمت إضافة المنتج إلى قائمة الأمنيات',
      removedFromWishlist: 'تمت إزالة المنتج من قائمة الأمنيات'
    },
    en: {
      home: 'Home',
      category: 'Category',
      product: 'Product',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      available: 'available',
      inCart: 'In cart:',
      quantity: 'Quantity',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      details: 'Details',
      specifications: 'Specifications',
      reviews: 'Reviews',
      shippingInfo: 'Shipping Info',
      returnPolicy: 'Return Policy',
      keyFeatures: 'Key Features',
      readMore: 'Read More',
      showLess: 'Show Less',
      noDescription: 'No description available',
      verifiedPurchase: 'Verified Purchase',
      reviewsCount: 'reviews',
      youSave: 'You save',
      freeShipping: 'Free Shipping',
      onOrdersOver: 'On orders over',
      fastDelivery: 'Fast Delivery',
      businessDays: 'business days',
      easyReturns: 'Easy Returns',
      dayReturnPolicy: '24-hour return policy',
      deliveryAllKuwait: 'Delivery to all regions of Kuwait',
      deliveryTimeOnConfirm: 'Delivery time specified upon order confirmation',
      rescheduleFeesIfAbsent: 'Reschedule delivery with additional fees if absent',
      returnExchangePolicyTitle: 'Return and Exchange Policy',
      returnIntro: 'We are committed to customer satisfaction and maintain a clear return and exchange policy.',
      returnWindow: 'You have the right to request a return or exchange within 24 hours of receiving your order.',
      returnConditions: 'Return and Exchange Conditions:',
      returnCondition1: 'Product must be in original condition, unused, unopened, and with original packaging',
      returnCondition2: 'Consumable products, cleaning materials, or paper products cannot be returned if opened or used (for public safety and health reasons)',
      returnStoreResponsibility: 'If the product arrives damaged or does not match the order, the store bears the full cost of exchange or return.',
      returnCustomerResponsibility: 'If the customer wishes to return without any error from the store, the customer will bear the delivery fees.',
      returnRefundProcess: 'Refunds are issued using the same payment method used for purchase, or as agreed with customer service.',
      deliveryPolicyTitle: 'Delivery Policy',
      deliveryAllRegions: 'Fast delivery to all regions of Kuwait',
      deliveryTimeSpecified: 'Delivery time is specified upon order confirmation',
      deliveryAbsentReschedule: 'If the customer is not present at delivery, the store reserves the right to reschedule delivery with additional fees.',
      relatedProducts: 'Related Products',
      loginRequired: 'Login Required',
      pleaseLogin: 'Please login first to write a review',
      login: 'Login',
      checkingRating: 'Checking your rating...',
      yourReview: 'Your Review',
      submitted: 'Submitted',
      writeReview: 'Write a Review',
      rating: 'Rating',
      title: 'Title',
      summarizeReview: 'Summarize your review',
      review: 'Review',
      tellUsExperience: 'Tell us about your experience with this product',
      submitReview: 'Submit Review',
      submittedOn: 'Submitted on',
      basedOn: 'Based on',
      reviewsText: 'reviews',
      removeFromCart: 'Remove from cart',
      cartUpdated: 'Cart Updated',
      addedToCart: 'Added to Cart',
      hasBeenAdded: 'has been added to your cart',
      error: 'Error',
      failedToAdd: 'Failed to add product to cart',
      outOfStockMsg: 'This product is currently out of stock',
      selectionRequired: 'Selection Required',
      pleaseSelectAll: 'Please select all variant options',
      stockLimit: 'Stock Limit',
      onlyAvailable: 'Only',
      itemsAvailable: 'items available',
      removed: 'Removed',
      hasBeenRemoved: 'has been removed from cart',
      addToWishlist: 'Add to wishlist',
      removeFromWishlist: 'Remove from wishlist',
      addedToWishlist: 'Added to wishlist',
      removedFromWishlist: 'Removed from wishlist'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  // Get product display name based on current language
  getProductName(product: ProductDto | null): string {
    if (!product) return this.t('product');
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.titleAr || product.title) : product.title;
  }

  // Get product description based on current language
  getProductDescription(product: ProductDto | null): string {
    if (!product) return this.t('noDescription');
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.descriptionAr || product.description || this.t('noDescription')) : (product.description || this.t('noDescription'));
  }

  // Get category name based on current language
  getCategoryName(product: ProductDto | null): string {
    if (!product) return this.t('category');
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.categoryNameAr || product.categoryName) : product.categoryName;
  }

  // Get subcategory name based on current language
  getSubCategoryName(product: ProductDto | null): string {
    if (!product) return this.t('category');
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.subCategoryNameAr || product.subCategoryName) : product.subCategoryName;
  }

  // Get variant name based on current language
  getVariantName(variant: any): string {
    if (!variant) return '';
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (variant.nameAr || variant.name) : variant.name;
  }

  // Get variant value based on current language
  getVariantValue(value: any): string {
    if (!value) return '';
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (value.valueAr || value.value) : value.value;
  }

  // Get product detail label based on current language
  getProductDetailLabel(detail: any): string {
    if (!detail) return '';
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (detail.labelAr || detail.label) : detail.label;
  }

  // Get product detail value based on current language
  getProductDetailValue(detail: any): string {
    if (!detail) return '';
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (detail.valueAr || detail.value) : detail.value;
  }

  // Signals for reactive state management
  isLoading = signal(true);
  errorMessage = signal('');
  product = signal<ProductDto | null>(null);
  userRating = signal<RatingDto | null>(null);
  isCheckingRating = signal(false);

  // Wishlist state
  isInWishlist = signal(false);

  // Component state
  selectedImageIndex = 0;
  selectedColor = { name: 'Default', code: '#000000', available: true };
  selectedSize = 'One Size';
  quantity = 1;
  showFullDescription = false;
  showSpecifications = false;
  showReviews = false;
  showShippingInfo = false;
  showReturnPolicy = false;
  
  // Variants state
  selectedVariants = signal<{ [variantId: number]: number }>({}); // { variantId: valueId }
  currentPrice = signal<number>(0);

  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }

  // Reviews data
  reviews = [
    {
      id: 1,
      user: 'Ahmed Al-Mahmoud',
      avatar: 'A',
      rating: 5,
      date: '2024-01-15',
      title: 'Excellent sound quality!',
      comment: 'These headphones are amazing. The noise cancellation works perfectly and the sound quality is crystal clear. Highly recommended!',
      verified: true,
      helpful: 12
    },
    {
      id: 2,
      user: 'Sarah Johnson',
      avatar: 'S',
      rating: 4,
      date: '2024-01-10',
      title: 'Great value for money',
      comment: 'Good headphones for the price. Battery life is excellent and they are very comfortable to wear for long periods.',
      verified: true,
      helpful: 8
    },
    {
      id: 3,
      user: 'Mohammed Ali',
      avatar: 'M',
      rating: 5,
      date: '2024-01-08',
      title: 'Perfect for work',
      comment: 'I use these for my daily work calls and music. The microphone quality is great and the noise cancellation helps me focus.',
      verified: false,
      helpful: 5
    }
  ];

  // Related products
  relatedProducts: Array<{
    id: number;
    name: string;
    price: number;
    originalPrice: number | null;
    image: string;
    rating: number;
    discount: number;
  }> = [];
  
  // Store original related products data for language switching
  private originalRelatedProducts: ProductSummaryDto[] = [];

  // New review form
  newReview = {
    rating: 5,
    title: '',
    comment: ''
  };

  ngOnInit() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
          // Update related products language when language changes
          this.updateRelatedProductsLanguage();
        }
      }
    });

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
        // Update related products language when language changes
        this.updateRelatedProductsLanguage();
      }
    }, 500);

    // Get product ID from route parameters
    this.route.params.subscribe(params => {
      const productId = +params['id'];
      if (productId) {
        this.loadProduct(productId);
      } else {
        this.errorMessage.set('Invalid product ID');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  loadProduct(id: number) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.productService.getProductById(id).pipe(
      catchError(error => {
        console.error('Error loading product:', error);
        this.errorMessage.set(this.t('failedToAdd')); // reuse generic error text
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe(product => {
      if (product) {
        console.log(product.ratings);
        
        this.product.set(product);
        // Reset selected image index when product changes
        this.selectedImageIndex = 0;
        
        // Initialize price with base price
        this.currentPrice.set(product.newPrice);
        
        // Reset selected variants
        this.selectedVariants.set({});

        // Sync wishlist state from local storage
        this.isInWishlist.set(this.wishlistService.isProductInWishlist(product.id));
        
        // Check if product is already in cart and set quantity
        const cartItem = this.cartService.getItemByProductId(product.id);
        if (cartItem) {
          this.quantity = cartItem.quantity;
        } else {
          this.quantity = 1;
        }

        // Check if user is authenticated and has rated this product
        this.checkUserRating(product.id);

        // Load related products from the same subcategory
        if (product.subCategoryId) {
          this.loadRelatedProducts(product.subCategoryId, product.id);
        }
      }
      this.isLoading.set(false);
    });
  }

  checkUserRating(productId: number) {
    if (!this.authService.isAuthenticated) {
      this.userRating.set(null);
      return;
    }

    this.isCheckingRating.set(true);
    this.productService.getUserRating(productId).pipe(
      catchError(error => {
        // If 404, user hasn't rated yet - this is expected
        if (error.status === 404) {
          this.userRating.set(null);
        } else {
          console.error('Error checking user rating:', error);
        }
        this.isCheckingRating.set(false);
        return of(null);
      })
    ).subscribe(rating => {
      if (rating) {
        this.userRating.set(rating);
        // Pre-fill the review form with existing rating
        this.newReview = {
          rating: rating.ratingNumber,
          title: '', // RatingDto might not have title
          comment: rating.content || ''
        };
      } else {
        this.userRating.set(null);
      }
      this.isCheckingRating.set(false);
    });
  }

  // Image gallery methods
  selectImage(index: number) {
    const images = this.product()?.images || [];
    if (index >= 0 && index < images.length) {
      this.selectedImageIndex = index;
    }
  }

  nextImage() {
    const images = this.product()?.images || [];
    if (images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
    }
  }

  previousImage() {
    const images = this.product()?.images || [];
    if (images.length > 0) {
      this.selectedImageIndex = this.selectedImageIndex === 0 
        ? images.length - 1 
        : this.selectedImageIndex - 1;
    }
  }

  // Product options
  selectColor(color: any) {
    if (color.available) {
      this.selectedColor = color;
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
  }

  // Variants selection methods
  selectVariantValue(variantId: number, valueId: number, price: number) {
    const current = this.selectedVariants();
    this.selectedVariants.set({ ...current, [variantId]: valueId });
    this.currentPrice.set(price);
  }

  isVariantValueSelected(variantId: number, valueId: number): boolean {
    return this.selectedVariants()[variantId] === valueId;
  }

  getSelectedVariantValueId(variantId: number): number | undefined {
    return this.selectedVariants()[variantId];
  }

  areAllVariantsSelected(): boolean {
    const product = this.product();
    if (!product || !product.variants || product.variants.length === 0) {
      return true; // No variants required
    }
    
    return product.variants.every(variant => 
      this.selectedVariants()[variant.id!] !== undefined
    );
  }

  getFinalPrice(): number {
    return this.currentPrice();
  }

  // Quantity controls
  increaseQuantity() {
    const product = this.product();
    if (product && this.quantity < product.totalInStock) {
      this.quantity++;
    } else if (product && this.quantity >= product.totalInStock) {
      this.toastService.warning(
        this.t('stockLimit'),
        `${this.t('onlyAvailable')} ${product.totalInStock} ${this.t('itemsAvailable')}`
      );
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Actions
  addToCart() {
    const product = this.product();
    if (!product) {
      this.toastService.error(this.t('error'), this.t('product'));
      return;
    }

    if (!product.isInStock) {
      this.toastService.warning(
        this.t('outOfStockMsg'),
        this.t('outOfStockMsg')
      );
      return;
    }

    // Respect stock including existing cart quantity
    const existingItem = this.cartService.getItemByProductId(product.id);
    const existingQty = existingItem ? existingItem.quantity : 0;

    if (existingQty >= product.totalInStock) {
      this.toastService.warning(
        this.t('stockLimit'),
        `${this.t('onlyAvailable')} ${product.totalInStock} ${this.t('itemsAvailable')}`
      );
      return;
    }

    if (existingQty + this.quantity > product.totalInStock) {
      const allowed = product.totalInStock - existingQty;
      this.quantity = allowed;
      this.toastService.warning(
        this.t('stockLimit'),
        `${this.t('onlyAvailable')} ${product.totalInStock} ${this.t('itemsAvailable')}`
      );
      return;
    }

    try {
      const finalPrice = this.getFinalPrice();
      const cartItem = {
        productId: product.id,
        name: product.title,
        image: (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/400x400?text=No+Image',
        price: finalPrice,
        quantity: this.quantity,
        selectedVariants: this.selectedVariants()
      };

      // Check if item is already in cart (with same variants)
      const existingItem = this.cartService.getItemByProductId(product.id);
      
      this.cartService.addItem(cartItem);
      
      if (existingItem) {
        // Update total quantity after adding
        const updatedItem = this.cartService.getItemByProductId(product.id);
        const totalQuantity = updatedItem ? updatedItem.quantity : this.quantity;
        
        this.quantity = totalQuantity;
        
        this.toastService.success(
          this.t('cartUpdated'),
          `${product.title} - ${totalQuantity} ${this.t('inCart')}`
        );
      } else {
        this.toastService.success(
          this.t('addedToCart'),
          `${product.title} x${this.quantity} ${this.t('hasBeenAdded')}`
        );
      }
    } catch (error) {
      this.toastService.error(
        this.t('error'),
        this.t('failedToAdd')
      );
      console.error('Error adding to cart:', error);
    }
  }

  addToWishlist() {
    const product = this.product();
    if (!product) {
      return;
    }

    // Map ProductDto to ProductSummaryDto shape for wishlist service
    const summary: ProductSummaryDto = {
      id: product.id,
      title: product.title,
      titleAr: product.titleAr,
      description: product.description,
      descriptionAr: product.descriptionAr,
      oldPrice: product.oldPrice,
      newPrice: product.newPrice,
      isInStock: product.isInStock,
      totalInStock: product.totalInStock,
      mainImage: (product.images && product.images.length > 0)
        ? product.images[0]
        : 'https://via.placeholder.com/400x400?text=No+Image',
      subCategoryName: product.subCategoryName,
      subCategoryNameAr: product.subCategoryNameAr,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
      isActive: true,
      isInWishlist: this.isInWishlist()
    };

    const nowInWishlist = this.wishlistService.toggleItem(summary);
    this.isInWishlist.set(nowInWishlist);

    const name = this.getProductName(product);
    if (nowInWishlist) {
      this.toastService.success(this.t('addedToWishlist'), name);
    } else {
      this.toastService.success(this.t('removedFromWishlist'), name);
    }
  }

  buyNow() {
    const product = this.product();
    console.log('Buy now:', {
      product: product,
      color: this.selectedColor,
      size: this.selectedSize,
      quantity: this.quantity
    });
    // Implement buy now logic
    this.router.navigate(['/cart']);
  }

  // Toggle sections
  toggleDescription() {
    this.showFullDescription = !this.showFullDescription;
  }

  toggleSpecifications() {
    this.showSpecifications = !this.showSpecifications;
  }

  toggleReviews() {
    this.showReviews = !this.showReviews;
  }

  toggleShippingInfo() {
    this.showShippingInfo = !this.showShippingInfo;
  }

  toggleReturnPolicy() {
    this.showReturnPolicy = !this.showReturnPolicy;
  }

  // Review methods
  submitReview() {
    if (!this.authService.isAuthenticated) {
      this.toastService.warning(this.t('loginRequired'), this.t('pleaseLogin'));
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (this.newReview.title && this.newReview.comment) {
      const review = {
        id: this.reviews.length + 1,
        user: 'You',
        avatar: 'Y',
        rating: this.newReview.rating,
        date: new Date().toISOString().split('T')[0],
        title: this.newReview.title,
        comment: this.newReview.comment,
        verified: false,
        helpful: 0
      };
      this.reviews.unshift(review);
      this.newReview = { rating: 5, title: '', comment: '' };
      // After submitting, check for user rating again
      const product = this.product();
      if (product) {
        this.checkUserRating(product.id);
      }
    }
  }

  // Navigate to login
  navigateToLogin() {
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }

  markReviewHelpful(reviewId: number) {
    const review = this.reviews.find(r => r.id === reviewId);
    if (review) {
      review.helpful++;
    }
  }

  // Utility methods
  getStarsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 1 : 0);
  }

  getDiscountPercentage(): number {
    const product = this.product();
    if (product?.oldPrice && product?.newPrice) {
      return Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100);
    }
    return 0;
  }

  getAverageRating(): number {
    const product = this.product();
    return product?.averageRating || 0;
  }

  getRatingDistribution(): { [key: number]: number } {
    const product = this.product();
    const ratings = product?.ratings || [];
    const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(rating => {
      distribution[rating.ratingNumber]++;
    });
    return distribution;
  }

  // Math utility methods for template
  floor(value: number): number {
    return Math.floor(value);
  }

  round(value: number): number {
    return Math.round(value);
  }

  // Get rating count for specific rating
  getRatingCount(rating: number): number {
    return this.getRatingDistribution()[rating] || 0;
  }

  // Get rating percentage for specific rating
  getRatingPercentage(rating: number): number {
    const count = this.getRatingCount(rating);
    const product = this.product();
    const totalReviews = product?.totalReviews || 0;
    return totalReviews > 0 ? (count / totalReviews) * 100 : 0;
  }

  // Helper method to get cart status
  isProductInCart(): boolean {
    const product = this.product();
    if (!product) return false;
    return this.cartService.isProductInCart(product.id);
  }

  getCartQuantity(): number {
    const product = this.product();
    if (!product) return 0;
    const cartItem = this.cartService.getItemByProductId(product.id);
    return cartItem ? cartItem.quantity : 0;
  }

  // Increment cart quantity
  incrementCartQuantity() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + 1;
    
    if (newQuantity > product.totalInStock) {
      this.toastService.warning(
        this.t('stockLimit'),
        `${this.t('onlyAvailable')} ${product.totalInStock} ${this.t('itemsAvailable')}`
      );
      return;
    }

    this.cartService.updateQuantity(cartItem.id, newQuantity);
    this.quantity = newQuantity;
  }

  // Decrement cart quantity
  decrementCartQuantity() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity - 1;
    
    if (newQuantity < 1) {
      return;
    }

    this.cartService.updateQuantity(cartItem.id, newQuantity);
    this.quantity = newQuantity;
  }

  // Remove from cart
  removeFromCart() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    this.cartService.removeItem(cartItem.id);
    this.quantity = 1;
    this.toastService.success(this.t('removed'), `${product.title} ${this.t('hasBeenRemoved')}`);
  }

  // Load related products
  loadRelatedProducts(subCategoryId: number, currentProductId: number) {
    this.productService.getRandomProductsBySubCategory(subCategoryId, 3).pipe(
      catchError(error => {
        console.error('Error loading related products:', error);
        return of([]);
      })
    ).subscribe(products => {
      // Store original products for language switching
      this.originalRelatedProducts = products.filter(p => p.id !== currentProductId);
      
      // Transform to match template expectations
      this.transformRelatedProducts();
    });
  }

  // Transform related products based on current language
  private transformRelatedProducts() {
    const isArabic = this.currentLanguage() === 'ar';
    
    this.relatedProducts = this.originalRelatedProducts.map(p => {
      const discount = p.oldPrice && p.newPrice && p.oldPrice > p.newPrice
        ? Math.round(((p.oldPrice - p.newPrice) / p.oldPrice) * 100)
        : 0;
      
      return {
        id: p.id,
        name: isArabic ? (p.titleAr || p.title) : p.title,
        price: p.newPrice,
        originalPrice: p.oldPrice && p.oldPrice > p.newPrice ? p.oldPrice : null,
        image: p.mainImage || 'https://via.placeholder.com/400x400?text=No+Image',
        rating: p.averageRating || 0,
        discount: discount
      };
    });
  }

  // Update related products when language changes
  updateRelatedProductsLanguage() {
    if (this.originalRelatedProducts.length > 0) {
      this.transformRelatedProducts();
    }
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
