import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService, ProductFilters, ProductResponse } from './product-service';
import { CategoryDto, ProductSummaryDto, SubCategoryDto } from './product.models';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

export interface RatingOption {
  value: number;
  count: number;
}

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export interface Filters {
  inStock: boolean;
  onSale: boolean;
  newArrival: boolean;
}

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './product.html',
  styleUrl: './product.css'
})
export class Product implements OnInit, OnDestroy {
  public productService = inject(ProductService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private cartService = inject(CartService);
  public toastService = inject(ToastService);
  private wishlistService = inject(WishlistService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  
  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Header
      products: 'المنتجات',
      discoverProducts: 'اكتشف منتجات رائعة مصممة خصيصاً لك',
      searchProducts: 'ابحث عن المنتجات...',
      // Filters
      filters: 'الفلاتر',
      categories: 'الفئات',
      subcategories: 'الفئات الفرعية',
      priceRange: 'نطاق السعر',
      min: 'الحد الأدنى',
      max: 'الحد الأقصى',
      to: 'إلى',
      apply: 'تطبيق',
      clear: 'مسح',
      rating: 'التقييم',
      andUp: 'فأكثر',
      availability: 'التوفر',
      inStock: 'متوفر',
      onSale: 'عرض',
      newArrivals: 'وصل حديثاً',
      sortBy: 'ترتيب حسب',
      clearAllFilters: 'مسح جميع الفلاتر',
      // Sort options
      newestFirst: 'الأحدث أولاً',
      oldestFirst: 'الأقدم أولاً',
      ratingHighToLow: 'التقييم من الأعلى للأقل',
      ratingLowToHigh: 'التقييم من الأقل للأعلى',
      priceLowToHigh: 'السعر من الأقل للأعلى',
      priceHighToLow: 'السعر من الأعلى للأقل',
      nameAZ: 'الاسم أ-ي',
      nameZA: 'الاسم ي-أ',
      // Results
      productsFound: 'منتج موجود',
      categoriesSelected: 'فئة',
      subcategoriesSelected: 'فئة فرعية',
      stars: 'نجمة',
      showing: 'عرض',
      of: 'من',
      // Stock limit
      stockLimit: 'حد المخزون',
      onlyAvailable: 'متوفر فقط',
      itemsAvailable: 'عناصر متاحة',
      // Product actions
      active: 'نشط',
      sale: 'عرض',
      addToWishlist: 'أضف إلى قائمة الأمنيات',
      removeFromWishlist: 'إزالة من قائمة الأمنيات',
      addedToWishlist: 'تمت إضافة المنتج إلى قائمة الأمنيات',
      removedFromWishlist: 'تمت إزالة المنتج من قائمة الأمنيات',
      inStockCount: 'متوفر',
      outOfStock: 'غير متوفر',
      details: 'التفاصيل',
      addToCart: 'أضف إلى السلة',
      viewDetails: 'عرض التفاصيل',
      // No results
      noProductsFound: 'لم يتم العثور على منتجات',
      tryAdjustingFilters: 'حاول تعديل الفلاتر أو مصطلحات البحث',
      // Errors
      failedToLoadProducts: 'فشل تحميل المنتجات',
      // Toast messages
      addedToCart: 'تمت الإضافة إلى السلة',
      hasBeenAdded: 'تمت إضافته إلى سلة التسوق الخاصة بك',
      error: 'خطأ',
      failedToAddToCart: 'فشل إضافة المنتج إلى السلة'
    },
    en: {
      // Header
      products: 'Products',
      discoverProducts: 'Discover amazing products tailored for you',
      searchProducts: 'Search products...',
      // Filters
      filters: 'Filters',
      categories: 'Categories',
      subcategories: 'Subcategories',
      priceRange: 'Price Range',
      min: 'Min',
      max: 'Max',
      to: 'to',
      apply: 'Apply',
      clear: 'Clear',
      rating: 'Rating',
      andUp: '& up',
      availability: 'Availability',
      inStock: 'In Stock',
      onSale: 'On Sale',
      newArrivals: 'New Arrivals',
      sortBy: 'Sort By',
      clearAllFilters: 'Clear All Filters',
      // Sort options
      newestFirst: 'Newest First',
      oldestFirst: 'Oldest First',
      ratingHighToLow: 'Rating High to Low',
      ratingLowToHigh: 'Rating Low to High',
      priceLowToHigh: 'Price Low to High',
      priceHighToLow: 'Price High to Low',
      nameAZ: 'Name A-Z',
      nameZA: 'Name Z-A',
      // Results
      productsFound: 'Products Found',
      categoriesSelected: 'Categories',
      subcategoriesSelected: 'Subcategories',
      stars: 'Stars',
      showing: 'Showing',
      of: 'of',
      // Stock limit
      stockLimit: 'Stock Limit',
      onlyAvailable: 'Only',
      itemsAvailable: 'items available',
      // Product actions
      active: 'Active',
      sale: 'Sale',
      addToWishlist: 'Add to wishlist',
      removeFromWishlist: 'Remove from wishlist',
      addedToWishlist: 'Added to wishlist',
      removedFromWishlist: 'Removed from wishlist',
      inStockCount: 'In Stock',
      outOfStock: 'Out of Stock',
      details: 'Details',
      addToCart: 'Add to Cart',
      viewDetails: 'View details',
      // No results
      noProductsFound: 'No products found',
      tryAdjustingFilters: 'Try adjusting your filters or search terms',
      // Errors
      failedToLoadProducts: 'Failed to load products',
      // Toast messages
      addedToCart: 'Added to Cart',
      hasBeenAdded: 'has been added to your cart',
      error: 'Error',
      failedToAddToCart: 'Failed to add product to cart'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  // Get product display name based on current language
  getProductName(product: ProductSummaryDto): string {
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.titleAr || product.title) : product.title;
  }

  // Get product description based on current language
  getProductDescription(product: ProductSummaryDto): string {
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (product.descriptionAr || product.description || 'لا يوجد وصف متاح') : (product.description || 'No description available');
  }

  // Get category name based on current language
  getCategoryName(category: CategoryDto | SubCategoryDto): string {
    const isArabic = this.currentLanguage() === 'ar';
    return isArabic ? (category.nameAr || category.name) : category.name;
  }
  
  // Signals for reactive state management
  isLoading = signal(false);
  errorMessage = signal('');
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);
  
  // Search and filter signals
  searchQuery = signal('');
  viewMode = signal<'list' | 'grid'>('list');
  selectedCategories = signal<number[]>([]);
  selectedSubCategories = signal<number[]>([]);
  selectedRating = signal(0);
  priceRange = signal<PriceRange>({ min: null, max: null });
  sortBy = signal('newest');
  filters = signal<Filters>({
    inStock: false,
    onSale: false,
    newArrival: false
  });
  bestDiscount = signal(false);
  
  // Data observables
  products$: Observable<ProductSummaryDto[]> = new Observable();
  categories$: Observable<CategoryDto[]> = new Observable();
  subCategories$: Observable<SubCategoryDto[]> = new Observable();
  
  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    searchTerm: this.searchQuery() || undefined,
    categoryId: this.selectedCategories().length === 1 ? this.selectedCategories()[0] : undefined,
    subCategoryId: this.selectedSubCategories().length === 1 ? this.selectedSubCategories()[0] : undefined,
    minPrice: this.priceRange().min ?? undefined,
    maxPrice: this.priceRange().max ?? undefined,
    sortBy: this.sortBy(),
    inStock: this.filters().inStock || undefined,
    onSale: this.filters().onSale || undefined,
    newArrival: this.filters().newArrival || undefined,
    bestDiscount: this.bestDiscount() || undefined
  }));
  
  // Computed properties
  totalPages$ = computed(() => Math.ceil(this.totalCount() / this.pageSize()));
  
  // Filter options
  ratingOptions: RatingOption[] = [
    { value: 4, count: 0 },
    { value: 3, count: 0 },
    { value: 2, count: 0 },
    { value: 1, count: 0 }
  ];

  // Math reference for template
  Math = Math;

  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadProducts(filters);
    });
  }

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
    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);

    this.loadCategories();
    this.loadSubCategories();
    
    // Read query params from route
    this.activatedRoute.queryParams.subscribe(params => {
      // Handle search parameter
      if (params['search'] && params['search'] !== this.searchQuery()) {
        this.searchQuery.set(params['search']);
        this.currentPage.set(1);
      } else if (!params['search'] && this.searchQuery()) {
        this.searchQuery.set('');
      }
      
      // Handle sortBy parameter (for Most Rating, Best Discount, etc.)
      if (params['sortBy']) {
        const validSortOptions = ['newest', 'oldest', 'highRating', 'lowRating', 'mostRating', 'bestDiscount'];
        if (validSortOptions.includes(params['sortBy'])) {
          this.sortBy.set(params['sortBy']);
          this.currentPage.set(1);
        }
      }
      
      // Handle categoryId parameter
      if (params['categoryId']) {
        const categoryId = parseInt(params['categoryId']);
        if (!isNaN(categoryId)) {
          this.selectedCategories.set([categoryId]);
          this.currentPage.set(1);
        }
      }
      
      // Handle bestDiscount parameter
      if (params['bestDiscount'] === 'true') {
        this.bestDiscount.set(true);
        if (!this.sortBy().includes('bestDiscount')) {
          this.sortBy.set('bestDiscount');
        }
        this.currentPage.set(1);
      }
      
      // Handle onSale parameter (keep for backward compatibility)
      if (params['onSale'] === 'true') {
        this.filters.set({ ...this.filters(), onSale: true });
        this.currentPage.set(1);
      }
    });
  }

  loadProducts(filters: ProductFilters) {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    this.productService.getProducts(filters).subscribe({
      next: (response) => {
        const wishlistIds = new Set(
          this.wishlistService.getWishlistItems().map(item => item.id)
        );

        if (Array.isArray(response)) {
          // Simple array response
          const products = response.map(p => ({
            ...p,
            isInWishlist: wishlistIds.has(p.id)
          }));
          this.products$ = of(products);
          this.totalCount.set(products.length);
        } else {
          // Paginated response - backend returns { Products, TotalCount, PageNumber, PageSize }
          const productsRaw = (response as any).Products || (response as any).products || response.products || [];
          const totalCount = (response as any).TotalCount || (response as any).totalCount || response.totalCount || 0;
          const products = productsRaw.map((p: ProductSummaryDto) => ({
            ...p,
            isInWishlist: wishlistIds.has(p.id)
          }));
          this.products$ = of(products);
          this.totalCount.set(totalCount);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.t('failedToLoadProducts'));
        this.isLoading.set(false);
        console.error('Error loading products:', error);
      }
    });
  }

  loadCategories() {
    this.categories$ = this.productService.getCategories().pipe(
      catchError(error => {
        console.error('Error loading categories:', error);
        return of([]);
      })
    );
  }

  loadSubCategories() {
    // Subcategories are loaded with categories, so we'll extract them from categories
    this.subCategories$ = this.categories$.pipe(
      map(categories => {
        const subCategories: SubCategoryDto[] = [];
        categories.forEach(category => {
          if (category.subCategories) {
            subCategories.push(...category.subCategories);
          }
        });
        return subCategories;
      })
    );
  }

  // Search functionality
  onSearchChange() {
    this.currentPage.set(1);
  }

  // View mode toggle
  setViewMode(mode: 'list' | 'grid') {
    this.viewMode.set(mode);
  }

  // Category filtering
  toggleCategory(categoryId: number) {
    const current = this.selectedCategories();
    const index = current.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.set(current.filter(id => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
    this.currentPage.set(1);
  }

  // Subcategory filtering
  toggleSubCategory(subCategoryId: number) {
    const current = this.selectedSubCategories();
    const index = current.indexOf(subCategoryId);
    if (index > -1) {
      this.selectedSubCategories.set(current.filter(id => id !== subCategoryId));
    } else {
      this.selectedSubCategories.set([...current, subCategoryId]);
    }
    this.currentPage.set(1);
  }

  // Price range filtering
  onPriceRangeChange() {
    // Debounce or apply immediately
  }

  applyPriceFilter() {
    this.currentPage.set(1);
  }

  clearPriceFilter() {
    this.priceRange.set({ min: null, max: null });
    this.currentPage.set(1);
  }

  // Rating filtering
  onRatingChange() {
    this.currentPage.set(1);
  }

  // Sort functionality
  onSortChange() {
    this.currentPage.set(1);
  }

  // Pagination
  goToPage(page: number) {
    const totalPages = this.totalPages$();
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = this.totalPages$();
    const currentPage = this.currentPage();
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

  // Clear all filters
  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedCategories.set([]);
    this.selectedSubCategories.set([]);
    this.selectedRating.set(0);
    this.priceRange.set({ min: null, max: null });
    this.filters.set({
      inStock: false,
      onSale: false,
      newArrival: false
    });
    this.sortBy.set('newest');
    this.currentPage.set(1);
  }

  // Button animation helpers
  addBounceClass(event: Event) {
    const element = event.currentTarget as HTMLElement;
    element?.classList.add('btn-bounce');
  }

  removeBounceClass(event: Event) {
    const element = event.currentTarget as HTMLElement;
    element?.classList.remove('btn-bounce');
  }

  addSlideClass(event: Event) {
    const element = event.currentTarget as HTMLElement;
    element?.classList.add('btn-slide');
  }

  removeSlideClass(event: Event) {
    const element = event.currentTarget as HTMLElement;
    element?.classList.remove('btn-slide');
  }

  // Product actions
  addToCart(product: ProductSummaryDto) {
    try {
      const productName = this.getProductName(product);
      const existingItem = this.cartService.getItemByProductId(product.id);
      const existingQty = existingItem ? existingItem.quantity : 0;

      // Prevent adding more than in stock
      if (existingQty >= product.totalInStock) {
        this.toastService.warning(
          this.t('stockLimit'),
          `${this.t('onlyAvailable')} ${product.totalInStock} ${this.t('itemsAvailable')}`
        );
        return;
      }

      const cartItem = {
        productId: product.id,
        name: productName,
        image: product.mainImage,
        price: product.newPrice,
        quantity: 1
      };

      this.cartService.addItem(cartItem);
      
      this.toastService.success(
        this.t('addedToCart'),
        `${productName} ${this.t('hasBeenAdded')}`
      );
    } catch (error) {
      this.toastService.error(
        this.t('error'),
        this.t('failedToAddToCart')
      );
      console.error('Error adding to cart:', error);
    }
  }

  toggleWishlist(product: ProductSummaryDto) {
    const nowInWishlist = this.wishlistService.toggleItem(product);
    product.isInWishlist = nowInWishlist;

    const productName = this.getProductName(product);
    if (nowInWishlist) {
      this.toastService.success(
        this.t('addedToWishlist'),
        productName
      );
    } else {
      this.toastService.success(
        this.t('removedFromWishlist'),
        productName
      );
    }
  }

  viewProductDetails(productId: number) {
    this.router.navigate(['/product', productId]);
  }

  // Note: trackBy function removed as we're using @for with inline tracking

  // Helper methods for template
  getCurrentPage(): number {
    return this.currentPage();
  }

  getTotalPages(): number {
    return this.totalPages$();
  }

  getProductsLength(): number {
    return this.totalCount();
  }

  updatePriceRange(field: 'min' | 'max', value: number | null) {
    const current = this.priceRange();
    this.priceRange.set({ ...current, [field]: value });
    this.onPriceRangeChange();
  }

  updateFilter(field: keyof Filters, value: boolean) {
    const current = this.filters();
    this.filters.set({ ...current, [field]: value });
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }

  ngOnDestroy() {
    // Cleanup if needed
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
}
