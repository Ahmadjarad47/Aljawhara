import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from "../navbar/navbar";
import { ProductService, ProductResponse } from '../product/product-service';
import { ProductSummaryDto } from '../product/product.models';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePage implements OnInit, OnDestroy {
  private countdownInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Hero section
      trustedBy: 'موثوق به من قبل',
      activeUsers: 'مستخدم نشط',
      productsSold: 'منتج مباع',
      merchants: 'تاجر',
      satisfaction: 'رضا',
      scroll: 'انتقل',
      // Featured section
      featuredCollection: 'مجموعة مميزة',
      handpickedProducts: 'منتجات مختارة بعناية',
      discoverProducts: 'اكتشف منتجاتنا المختارة بعناية، المختارة خصيصاً لك',
      viewAllProducts: 'عرض جميع المنتجات',
      addToCart: 'أضف إلى السلة',
      quickView: 'عرض سريع',
      save: 'وفر',
      // Stats
      totalProducts: 'إجمالي المنتجات',
      availableInStore: 'متوفر في متجرنا',
      qualityGuarantee: 'ضمان الجودة',
      satisfactionGuaranteed: 'رضا مضمون',
      support: 'الدعم',
      customerService: 'خدمة العملاء',
      // Special offers
      specialOffer: 'عرض خاص',
      specialOfferDesc: 'احصل على خصم يصل إلى 50% على المنتجات المحددة. عرض محدود الوقت! لا تفوت هذه الصفقات الرائعة.',
      shopSale: 'تسوق العروض',
      learnMore: 'اعرف المزيد',
      offerEndsIn: 'ينتهي العرض في',
      days: 'أيام',
      hours: 'ساعات',
      minutes: 'دقائق',
      seconds: 'ثواني',
      // Testimonials
      whatCustomersSay: 'ماذا يقول عملاؤنا',
      testimonialsDesc: 'لا تأخذ كلمتنا فقط. إليك ما يقوله عملاؤنا الراضون عن تجربة التسوق الخاصة بهم.',
      // Newsletter
      stayUpdated: 'ابق على اطلاع',
      newsletterDesc: 'اشترك في نشرتنا الإخبارية وكن أول من يعرف عن المنتجات الجديدة والعروض الحصرية والعروض الخاصة.',
      enterEmail: 'أدخل عنوان بريدك الإلكتروني',
      subscribe: 'اشترك',
      subscribed: 'تم الاشتراك!',
      privacyNote: 'نحترم خصوصيتك. يمكنك إلغاء الاشتراك في أي وقت.',
      // Features
      freeShipping: 'شحن مجاني',
      freeShippingDesc: 'شحن مجاني للطلبات أكثر من 50 دولاراً. توصيل سريع وموثوق إلى باب منزلك.',
      qualityGuaranteeTitle: 'ضمان الجودة',
      qualityGuaranteeDesc: 'منتجات أصلية 100% مع ضمان الجودة. تسوق بثقة.',
      support247: 'دعم 24/7',
      support247Desc: 'دعم العملاء على مدار الساعة لمساعدتك في أي أسئلة أو مخاوف.'
    },
    en: {
      // Hero section
      trustedBy: 'Trusted by',
      activeUsers: 'Active Users',
      productsSold: 'Products Sold',
      merchants: 'Merchants',
      satisfaction: 'Satisfaction',
      scroll: 'Scroll',
      // Featured section
      featuredCollection: 'Featured Collection',
      handpickedProducts: 'Handpicked Products',
      discoverProducts: 'Discover our carefully selected premium products, chosen just for you',
      viewAllProducts: 'View All Products',
      addToCart: 'Add to Cart',
      quickView: 'Quick View',
      save: 'Save',
      // Stats
      totalProducts: 'Total Products',
      availableInStore: 'Available in our store',
      qualityGuarantee: 'Quality Guarantee',
      satisfactionGuaranteed: 'Satisfaction guaranteed',
      support: 'Support',
      customerService: 'Customer service',
      // Special offers
      specialOffer: 'Special Offer',
      specialOfferDesc: 'Get up to 50% off on selected items. Limited time offer! Don\'t miss out on these amazing deals.',
      shopSale: 'Shop Sale',
      learnMore: 'Learn More',
      offerEndsIn: 'Offer Ends In',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      // Testimonials
      whatCustomersSay: 'What Our Customers Say',
      testimonialsDesc: 'Don\'t just take our word for it. Here\'s what our satisfied customers have to say about their shopping experience.',
      // Newsletter
      stayUpdated: 'Stay Updated',
      newsletterDesc: 'Subscribe to our newsletter and be the first to know about new products, exclusive deals, and special offers.',
      enterEmail: 'Enter your email address',
      subscribe: 'Subscribe',
      subscribed: 'Subscribed!',
      privacyNote: 'We respect your privacy. Unsubscribe at any time.',
      // Features
      freeShipping: 'Free Shipping',
      freeShippingDesc: 'Free shipping on orders over $50. Fast and reliable delivery to your doorstep.',
      qualityGuaranteeTitle: 'Quality Guarantee',
      qualityGuaranteeDesc: '100% authentic products with quality guarantee. Shop with confidence.',
      support247: '24/7 Support',
      support247Desc: 'Round-the-clock customer support to help you with any questions or concerns.'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  constructor(
    private router: Router,
    private productService: ProductService
  ) {}

  // Loading states
  isLoadingCategories: boolean = false;
  isLoadingProducts: boolean = true;
  isLoadingStats: boolean = false;

  // Newsletter subscription
  newsletterEmail: string = '';
  isNewsletterSubscribed: boolean = false;

  // Featured Products
  featuredProducts: any[] = [];
  // Store original products from API to avoid re-fetching
  private originalProducts: ProductSummaryDto[] = [];

  // Hero section stats
  stats = {
    activeUsers: 25000,
    productsSold: 150000,
    merchants: 1200,
    satisfactionRate: 96
  };

  // Hero Carousel
  currentSlide = 0;
  private carouselInterval?: ReturnType<typeof setInterval>;
  
  // Hero slides with translations
  heroSlidesAr = [
    {
      id: 1,
      title: 'اكتشف منتجات',
      titleHighlight: 'رائعة',
      titleEnd: 'بأسعار ممتازة',
      subtitle: 'تسوق من آلاف البائعين المعتمدين وابحث عن ما تبحث عنه بالضبط. توصيل سريع ودفع آمن وخدمة عملاء ممتازة مضمونة.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
      ctaPrimary: 'تسوق الآن',
      ctaSecondary: 'اعرف المزيد',
      theme: 'primary'
    },
    {
      id: 2,
      title: 'إلكترونيات',
      titleHighlight: 'بجودة عالية',
      titleEnd: 'أفضل الصفقات أونلاين',
      subtitle: 'احصل على أحدث الأجهزة والإلكترونيات بأسعار لا تقبل المنافسة. شحن مجاني للطلبات أكثر من 50 دولاراً وضمان استرداد الأموال لمدة 30 يوماً.',
      image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1920&h=1080&fit=crop',
      ctaPrimary: 'تصفح الإلكترونيات',
      ctaSecondary: 'عرض الصفقات',
      theme: 'secondary'
    },
    {
      id: 3,
      title: 'مجموعة',
      titleHighlight: 'أزياء عصرية',
      titleEnd: 'الأناقة تلتقي بالراحة',
      subtitle: 'ارتقِ بخزانة ملابسك مع مجموعتنا المختارة من الأزياء. من الكاجوال إلى الرسمي، ابحث عن الإطلالة المثالية لكل مناسبة.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=1080&fit=crop',
      ctaPrimary: 'تسوق الأزياء',
      ctaSecondary: 'وصل حديثاً',
      theme: 'accent'
    },
    {
      id: 4,
      title: 'أساسيات',
      titleHighlight: 'المنزل الذكي',
      titleEnd: 'عيش عصري',
      subtitle: 'حوّل مساحتك مع حلول المنزل الذكي المبتكرة. موفرة للطاقة، سهلة التركيب، ومصممة لأنماط الحياة العصرية.',
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1920&h=1080&fit=crop',
      ctaPrimary: 'استكشف المنزل الذكي',
      ctaSecondary: 'اعرف المزيد',
      theme: 'success'
    }
  ];

  heroSlidesEn = [
    {
      id: 1,
      title: 'Discover Amazing',
      titleHighlight: 'Products',
      titleEnd: 'at Great Prices',
      subtitle: 'Shop from thousands of verified sellers and find exactly what you\'re looking for. Fast delivery, secure payments, and excellent customer service guaranteed.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Shop Now',
      ctaSecondary: 'Learn More',
      theme: 'primary'
    },
    {
      id: 2,
      title: 'Premium Quality',
      titleHighlight: 'Electronics',
      titleEnd: 'Best Deals Online',
      subtitle: 'Get the latest gadgets and electronics at unbeatable prices. Free shipping on orders over $50 and 30-day money-back guarantee.',
      image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Browse Electronics',
      ctaSecondary: 'View Deals',
      theme: 'secondary'
    },
    {
      id: 3,
      title: 'Trendy Fashion',
      titleHighlight: 'Collection',
      titleEnd: 'Style Meets Comfort',
      subtitle: 'Elevate your wardrobe with our curated fashion collection. From casual to formal, find the perfect outfit for every occasion.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Shop Fashion',
      ctaSecondary: 'New Arrivals',
      theme: 'accent'
    },
    {
      id: 4,
      title: 'Smart Home',
      titleHighlight: 'Essentials',
      titleEnd: 'Modern Living',
      subtitle: 'Transform your space with innovative smart home solutions. Energy-efficient, easy to install, and designed for modern lifestyles.',
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Explore Smart Home',
      ctaSecondary: 'Learn More',
      theme: 'success'
    }
  ];

  // Get hero slides based on current language
  get heroSlides() {
    return this.currentLanguage() === 'ar' ? this.heroSlidesAr : this.heroSlidesEn;
  }

  // Countdown timer for special offer
  countdown = {
    days: 5,
    hours: 12,
    minutes: 45,
    seconds: 30
  };

  ngOnInit() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      // Default to Arabic
      this.currentLanguage.set('ar');
    }

    // Listen for language changes from localStorage (when changed in navbar)
    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
        }
      }
    });

    // Also check periodically for language changes (for same-window updates)
    setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
        // Update products language when language changes (without re-fetching)
        this.updateProductsLanguage();
      }
    }, 500);

    this.startCountdown();
    this.startCarousel();
    this.loadFeaturedProducts();
  }

  // Load featured products from API
  loadFeaturedProducts() {
    this.isLoadingProducts = true;
    this.productService.getProducts({ 
      pageNumber: 1, 
      pageSize: 8,
      sortBy: 'highRating' // Get highest rated products
    }).subscribe({
      next: (response) => {
        const products = this.extractProducts(response);
        // Store original products for language switching
        this.originalProducts = products;
        this.updateProductsLanguage();
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  // Update products language when language changes (without re-fetching from API)
  private updateProductsLanguage() {
    if (this.originalProducts.length > 0) {
      this.featuredProducts = this.originalProducts.map(product => this.transformProduct(product));
    }
  }

  // Extract products from response (handles both array and object responses)
  private extractProducts(response: ProductSummaryDto[] | ProductResponse): ProductSummaryDto[] {
    if (Array.isArray(response)) {
      return response;
    }
    return response.Products || response.products || [];
  }

  // Transform API product to HTML expected format
  private transformProduct(product: ProductSummaryDto): any {
    const hasDiscount = product.oldPrice > product.newPrice;
    const discountPercentage = hasDiscount 
      ? Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100)
      : 0;

    // Use Arabic or English fields based on current language
    const isArabic = this.currentLanguage() === 'ar';
    const productName = isArabic ? (product.titleAr || product.title) : product.title;
    const productDescription = isArabic ? (product.descriptionAr || product.description) : product.description;

    return {
      id: product.id,
      name: productName,
      description: productDescription,
      price: product.newPrice,
      originalPrice: hasDiscount ? product.oldPrice : null,
      image: product.mainImage || 'https://via.placeholder.com/400x300?text=No+Image',
      rating: product.averageRating || 0,
      badge: hasDiscount ? 'SALE' : (!product.isInStock ? 'OUT OF STOCK' : null),
      discount: discountPercentage,
      isWishlisted: product.isInWishlist || false,
      isInStock: product.isInStock
    };
  }

  // Newsletter subscription
  subscribeNewsletter() {
    if (this.newsletterEmail && this.isValidEmail(this.newsletterEmail)) {
      this.isNewsletterSubscribed = true;
      console.log('Newsletter subscription:', this.newsletterEmail);
      // Here you would typically send the email to your backend
      setTimeout(() => {
        this.isNewsletterSubscribed = false;
        this.newsletterEmail = '';
      }, 3000);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Countdown timer
  startCountdown() {
    this.countdownInterval = setInterval(() => {
      // Defer update to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        if (this.countdown.seconds > 0) {
          this.countdown.seconds--;
        } else if (this.countdown.minutes > 0) {
          this.countdown.minutes--;
          this.countdown.seconds = 59;
        } else if (this.countdown.hours > 0) {
          this.countdown.hours--;
          this.countdown.minutes = 59;
          this.countdown.seconds = 59;
        } else if (this.countdown.days > 0) {
          this.countdown.days--;
          this.countdown.hours = 23;
          this.countdown.minutes = 59;
          this.countdown.seconds = 59;
        }
      }, 0);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  // Product actions
  addToCart(product: any) {
    console.log('Adding to cart:', product.name);
    // Implement add to cart logic
  }

  addToWishlist(product: any) {
    product.isWishlisted = !product.isWishlisted;
    console.log(product.isWishlisted ? 'Added to wishlist:' : 'Removed from wishlist:', product.name);
    // TODO: Implement API call to save wishlist state
  }

  // Navigation actions
  goToCategory(category: any) {
    console.log('Navigate to category:', category.name);
    // Implement navigation logic
  }

  goToProduct(product: any) {
    console.log('Navigate to product:', product.name);
    this.router.navigate(['/product', product.id]);
  }

  // Hero section actions
  shopNow() {
    console.log('Shop now clicked');
    // Implement navigation to products page
  }

  viewAllProducts() {
    console.log('View all products clicked');
    // Implement navigation to products page
  }

  viewAllCategories() {
    console.log('View all categories clicked');
    // Implement navigation to categories page
  }

  // CTA actions
  learnMore() {
    console.log('Learn more clicked');
    // Implement navigation to about page
  }

  shopSale() {
    console.log('Shop sale clicked');
    // Implement navigation to sale page
  }

  // Carousel controls
  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Auto-advance every 5 seconds
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prevSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.heroSlides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    // Reset auto-advance timer
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
  }

  pauseCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  resumeCarousel() {
    this.startCarousel();
  }
}
