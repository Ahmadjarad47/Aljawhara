import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, inject, signal, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, filter } from 'rxjs';
import { ServiceAuth } from '../../auth/service-auth';
import { UserResponseDto } from '../../auth/auth.models';
import { CartService } from '../../core/service/cart-service';
import { WishlistService } from '../../core/service/wishlist-service';
import { ProductService } from '../product/product-service';
import { ProductSummaryDto, CategoryDto } from '../product/product.models';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true,
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {
  @ViewChild('mobileMenuTemplate', { static: true }) mobileMenuTemplate!: TemplateRef<any>;
  @ViewChild('mobileSearchInput', { static: false }) mobileSearchInput!: ElementRef<HTMLInputElement>;
  
  // Services
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private productService = inject(ProductService);
  private activatedRoute = inject(ActivatedRoute);
  
  // Authentication
  private authSubscription?: Subscription;
  private userSubscription?: Subscription;
  private searchSubscription?: Subscription;
  private categoriesSubscription?: Subscription;
  
  // Search functionality - Using signals for reactive state management
  searchQuery = signal('');
  searchSuggestions = signal<string[]>([]);
  searchProducts = signal<ProductSummaryDto[]>([]);
  showSearchSuggestions = signal(false);
  isSearching = signal(false);
  selectedSuggestionIndex = signal(-1);
  
  // Debounced search subject
  private searchSubject = new Subject<string>();
  
  // Language and currency
  currentLanguage = signal<'ar' | 'en'>('ar');
  selectedLanguage: string = 'العربية';
  selectedCurrency: string = 'SYP';
  
  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Top bar
      freeShipping: 'شحن مجاني للطلبات أكثر من 50$',
      followUs: 'تابعنا:',
      // Search
      searchPlaceholder: 'ابحث عن المنتجات، العلامات التجارية، الفئات...',
      search: 'بحث',
      searching: 'جاري البحث...',
      // Navigation
      allCategories: 'جميع الفئات',
      home: 'الرئيسية',
      products: 'المنتجات',
      mostRating: 'الأكثر تقييماً',
      bestDiscount: 'أفضل خصم',
      about: 'من نحن',
      contact: 'اتصل بنا',
      // User
      signIn: 'تسجيل الدخول',
      signOut: 'تسجيل الخروج',
      createAccount: 'إنشاء حساب',
      welcome: 'مرحباً بك في الجوهرة',
      welcomeDesc: 'سجل الدخول للوصول إلى حسابك والاستمتاع بالتسوق المخصص',
      myProfile: 'ملفي الشخصي',
      myOrders: 'طلباتي',
      settings: 'الإعدادات',
      // Mobile
      categories: 'الفئات',
      pages: 'الصفحات',
      language: 'اللغة',
      wishlist: 'قائمة الأمنيات',
      cart: 'السلة',
      account: 'الحساب',
      login: 'تسجيل الدخول',
      register: 'التسجيل',
      logout: 'تسجيل الخروج',
      searchProducts: 'ابحث عن المنتجات',
      // Special offers
      hot: 'مميز',
      new: 'جديد',
      upTo50Off: 'خصم حتى 50%',
      freeShippingText: 'شحن مجاني',
      // Account overlay
      welcomeToAljawhara: 'مرحباً بك في الجوهرة',
      signInToAccess: 'سجل الدخول للوصول إلى حسابك'
    },
    en: {
      // Top bar
      freeShipping: 'Free shipping on orders over $50',
      followUs: 'Follow us:',
      // Search
      searchPlaceholder: 'Search products, brands, categories...',
      search: 'Search',
      searching: 'Searching...',
      // Navigation
      allCategories: 'All Categories',
      home: 'Home',
      products: 'Products',
      mostRating: 'Most Rating',
      bestDiscount: 'Best Discount',
      about: 'About',
      contact: 'Contact',
      // User
      signIn: 'Sign In',
      signOut: 'Sign Out',
      createAccount: 'Create Account',
      welcome: 'Welcome to Aljawhara',
      welcomeDesc: 'Sign in to access your account and enjoy personalized shopping',
      myProfile: 'My Profile',
      myOrders: 'My Orders',
      settings: 'Settings',
      // Mobile
      categories: 'Categories',
      pages: 'Pages',
      language: 'Language',
      wishlist: 'Wishlist',
      cart: 'Cart',
      account: 'Account',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      searchProducts: 'Search Products',
      // Special offers
      hot: 'HOT',
      new: 'NEW',
      upTo50Off: 'Up to 50% OFF',
      freeShippingText: 'Free Shipping',
      // Account overlay
      welcomeToAljawhara: 'Welcome to Aljawhara',
      signInToAccess: 'Sign in to access your account'
    }
  };
  
  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
  
  // Dropdown states
  isLanguageDropdownOpen: boolean = false;
  isCurrencyDropdownOpen: boolean = false;
  isUserDropdownOpen: boolean = false;
  
  // Cart and wishlist counts
  cartItems = this.cartService.getCartItemsSignal();
  wishlistItems = this.wishlistService.getWishlistItemsSignal();
  
  // Computed cart count
  get cartCount(): number {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  }
  
  // Computed wishlist count
  get wishlistCount(): number {
    return this.wishlistItems().length;
  }
  
  // Mobile menu state
  isMobileMenuOpen: boolean = false;
  
  // Mobile bottom navbar state
  activeTab: string = 'home';
  showMobileSearch: boolean = false;
  showMobileCategories: boolean = false;
  showMobileAccount: boolean = false;
  
  // Popular searches for mobile
  popularSearches: string[] = [
    'iPhone 15',
    'Samsung Galaxy',
    'MacBook Pro',
    'Nike Shoes',
    'Adidas',
    'Sony Headphones',
    'Apple Watch',
    'iPad Pro'
  ];
  
  // User authentication state
  isLoggedIn: boolean = false;
  userProfile: UserResponseDto | null = null;

  // Language options
  languages = [
    { code: 'ar', name: 'العربية', flag: '🇰🇼' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];



  // Categories - using signal for reactive updates
  categories = signal<Array<{ name: string; icon: string; href: string; id: number; subCategories?: any[] }>>([]);
  
 
  constructor(
    public router: Router,
    private authService: ServiceAuth
  ) {
    // Set up debounced search effect
    effect(() => {
      const query = this.searchQuery();
      if (query.trim()) {
        this.searchSubject.next(query.trim());
      } else {
        this.searchSuggestions.set([]);
        this.searchProducts.set([]);
        this.showSearchSuggestions.set(false);
      }
    });

    // Sync activeTab with current route (for bottom mobile navbar)
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updateActiveTabFromRoute(event.urlAfterRedirects);
      });
  }

  ngOnInit() {
    // Initialize component - defer non-critical operations
    this.loadUserData();
    
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
      this.selectedLanguage = savedLang === 'ar' ? 'العربية' : 'English';
      // Set document direction
      if (savedLang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
      }
    } else {
      // Default to Arabic
      this.currentLanguage.set('ar');
      this.selectedLanguage = 'العربية';
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
    
    // Load categories from API (defer to avoid blocking initial render)
    setTimeout(() => {
      this.loadCategories();
    }, 100);
    
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isLoggedIn = isAuth;
    });
    
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.userProfile = user;
    });
    
    // Set up debounced search subscription
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(150), // Wait for 150ms pause in events (faster search)
      distinctUntilChanged(), // Only proceed if the value has changed
      switchMap(query => {
        if (!query || query.length < 2) {
          this.searchSuggestions.set([]);
          this.searchProducts.set([]);
          return of([]);
        }
        
        this.isSearching.set(true);
        return this.productService.searchProducts(query).pipe(
          catchError(error => {
            console.error('Search error:', error);
            this.isSearching.set(false);
            return of([]);
          })
        );
      })
    ).subscribe(products => {
      this.isSearching.set(false);
      
      // Store products directly (we'll show products with images instead of just titles)
      const limitedProducts = products.slice(0, 5); // Limit to 5 results
      
      // Keep suggestions for backward compatibility, but we'll primarily use products
      const suggestions = limitedProducts
        .map(p => p.title)
        .filter((title, index, self) => self.indexOf(title) === index); // Remove duplicates
      
      this.searchSuggestions.set(suggestions);
      this.searchProducts.set(limitedProducts);
      
      // Show suggestions if we have results and query is still active
      if (limitedProducts.length > 0 && this.searchQuery().trim()) {
        this.showSearchSuggestions.set(true);
      }
    });
    
    // Check if there's a search query in route params
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['search'] && params['search'] !== this.searchQuery()) {
        this.searchQuery.set(params['search']);
      }
    });

    // Initialize activeTab based on the current route
    this.updateActiveTabFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.authSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.categoriesSubscription?.unsubscribe();
    this.searchSubject.complete();
  }

  // Search functionality
  onSearch() {
    const query = this.searchQuery().trim();
    if (query) {
      this.showSearchSuggestions.set(false);
      // Navigate to products page with search query
      this.router.navigate(['/product'], { 
        queryParams: { search: query } 
      });
    }
  }

  onSearchKeyPress(event: KeyboardEvent) {
    const products = this.searchProducts();
    const currentIndex = this.selectedSuggestionIndex();
    
    if (event.key === 'Enter') {
      event.preventDefault();
      if (currentIndex >= 0 && currentIndex < products.length) {
        this.selectProductSuggestion(products[currentIndex]);
      } else {
        this.onSearch();
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIndex = Math.min(currentIndex + 1, products.length - 1);
      this.selectedSuggestionIndex.set(newIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIndex = Math.max(currentIndex - 1, -1);
      this.selectedSuggestionIndex.set(newIndex);
    } else if (event.key === 'Escape') {
      this.showSearchSuggestions.set(false);
      this.selectedSuggestionIndex.set(-1);
    }
  }

  onSearchFocus() {
    const query = this.searchQuery().trim();
    if (query && this.searchProducts().length > 0) {
      this.showSearchSuggestions.set(true);
    }
  }

  onSearchBlur() {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      this.showSearchSuggestions.set(false);
      this.selectedSuggestionIndex.set(-1);
    }, 200);
  }

  selectSuggestion(suggestion: string) {
    this.searchQuery.set(suggestion);
    this.showSearchSuggestions.set(false);
    this.selectedSuggestionIndex.set(-1);
    this.onSearch();
  }

  selectProductSuggestion(product: ProductSummaryDto) {
    this.searchQuery.set(product.title);
    this.showSearchSuggestions.set(false);
    this.selectedSuggestionIndex.set(-1);
    this.onSearch();
  }

  // Dropdown toggle methods
  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    if (this.isLanguageDropdownOpen) {
      this.isCurrencyDropdownOpen = false;
      this.isUserDropdownOpen = false;
    }
  }

  closeLanguageDropdown() {
    this.isLanguageDropdownOpen = false;
  }

  toggleCurrencyDropdown() {
    this.isCurrencyDropdownOpen = !this.isCurrencyDropdownOpen;
    if (this.isCurrencyDropdownOpen) {
      this.isLanguageDropdownOpen = false;
      this.isUserDropdownOpen = false;
    }
  }

  closeCurrencyDropdown() {
    this.isCurrencyDropdownOpen = false;
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    if (this.isUserDropdownOpen) {
      this.isLanguageDropdownOpen = false;
      this.isCurrencyDropdownOpen = false;
    }
  }

  closeUserDropdown() {
    this.isUserDropdownOpen = false;
  }

  // Language switching
  changeLanguage(language: any) {
    this.selectedLanguage = language.name;
    this.currentLanguage.set(language.code);
    this.isLanguageDropdownOpen = false;
    
    // Update document direction for RTL/LTR
    if (language.code === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
    
    // Save to localStorage
    localStorage.setItem('language', language.code);
    
    console.log('Language changed to:', language.code);
    // Reload categories with new language
    this.loadCategories();
  }

  // Currency switching
  changeCurrency(currency: any) {
    this.selectedCurrency = currency.code;
    this.isCurrencyDropdownOpen = false;
    console.log('Currency changed to:', currency.code);
    // Implement currency switching logic here
  }

  // Mobile menu toggle
  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Mobile bottom navbar methods
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  toggleSearchMobile() {
    this.showMobileSearch = !this.showMobileSearch;
    if (this.showMobileSearch) {
      this.activeTab = 'search';
      this.showMobileCategories = false;
      this.showMobileAccount = false;
      // Focus the input after the view updates
      setTimeout(() => {
        if (this.mobileSearchInput?.nativeElement) {
          this.mobileSearchInput.nativeElement.focus();
          // Show keyboard on mobile devices
          this.mobileSearchInput.nativeElement.click();
        }
      }, 100);
    } else {
      this.updateActiveTabFromRoute();
    }
  }

  closeMobileSearch() {
    this.showMobileSearch = false;
    this.updateActiveTabFromRoute();
  }

  toggleCategoriesMobile() {
    this.showMobileCategories = !this.showMobileCategories;
    if (this.showMobileCategories) {
      this.activeTab = 'categories';
      this.showMobileSearch = false;
      this.showMobileAccount = false;
    } else {
      this.updateActiveTabFromRoute();
    }
  }

  closeMobileCategories() {
    this.showMobileCategories = false;
    this.updateActiveTabFromRoute();
  }

  toggleAccountMobile() {
    this.showMobileAccount = !this.showMobileAccount;
    if (this.showMobileAccount) {
      this.activeTab = 'account';
      this.showMobileSearch = false;
      this.showMobileCategories = false;
    } else {
      this.updateActiveTabFromRoute();
    }
  }

  closeMobileAccount() {
    this.showMobileAccount = false;
    this.updateActiveTabFromRoute();
  }

  searchPopular(term: string) {
    this.searchQuery.set(term);
    this.onSearch();
    this.closeMobileSearch();
  }

  // Authentication methods
  login() {
    this.router.navigate(['/auth/login']);
  }

  register() {
    this.router.navigate(['/auth/register']);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('User logged out successfully');
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if API call fails, user is logged out locally
        this.router.navigate(['/']);
      }
    });
  }

  // Cart and wishlist methods
  goToCart() {
    console.log('Navigate to cart');
    this.activeTab = 'cart';
    this.router.navigate(['/cart']);
  }

  goToWishlist() {
    console.log('Navigate to wishlist');
    this.activeTab = 'wishlist';
    // Navigate directly to the wishlist route for faster and more reliable loading
    this.router.navigate(['/wishlist']);
  }

  // Profile methods
  goToProfile() {
    this.router.navigate(['/user/dashboard']);
  }

  goToOrders() {
    this.router.navigate(['/user/orders']);
  }

  goToSettings() {
    this.router.navigate(['/user/settings']);
  }

  // Navigation methods
  navigateToCategory(category: any) {
    console.log('Navigate to category:', category.name);
    this.activeTab = 'categories';
    this.router.navigate(['/product'], { 
      queryParams: { categoryId: category.id } 
    });
  }

  navigateToPage(page: string) {
    console.log('Navigate to page:', page);
    this.activeTab = page;
    // this.router.navigate([`/${page}`]);
  }

  // Private helper methods
  private loadUserData() {
    // User data is now loaded through the auth service subscriptions
    this.isLoggedIn = this.authService.isAuthenticated;
    this.userProfile = this.authService.currentUser;
  }

  // Determine which bottom tab should be active based on the current route / overlays
  private updateActiveTabFromRoute(url?: string) {
    // If any mobile overlay is open, keep its tab active
    if (this.showMobileSearch) {
      this.activeTab = 'search';
      return;
    }
    if (this.showMobileCategories) {
      this.activeTab = 'categories';
      return;
    }
    if (this.showMobileAccount) {
      this.activeTab = 'account';
      return;
    }

    const currentUrl = url || this.router.url || '/';

    if (currentUrl === '/' || currentUrl.startsWith('/home')) {
      this.activeTab = 'home';
    } else if (currentUrl.startsWith('/wishlist')) {
      this.activeTab = 'wishlist';
    } else if (currentUrl.startsWith('/cart')) {
      this.activeTab = 'cart';
    } else if (currentUrl.startsWith('/user')) {
      this.activeTab = 'account';
    } else {
      // Default
      this.activeTab = 'home';
    }
  }

  private loadCategories() {
    this.categoriesSubscription = this.productService.getCategories(true).pipe(
      catchError(error => {
        console.error('Error loading categories:', error);
        return of([]);
      })
    ).subscribe(categories => {
      // Transform API categories to match the template structure
      const transformedCategories = categories
        .filter(cat => cat.isActive) // Only show active categories
        .map(cat => {
          const categoryName = this.selectedLanguage === 'العربية' ? cat.nameAr : cat.name;
          const categoryNameLower = categoryName.toLowerCase();
          
        
          
          return {
            id: cat.id,
            name: categoryName,
            icon: '',
            href: `/product?categoryId=${cat.id}`,
            subCategories: cat.subCategories || []
          };
        });
      
      this.categories.set(transformedCategories);
    });
  }

  // Get category display name based on current language
  getCategoryName(category: any): string {
    // Categories are already transformed with the correct language in loadCategories
    return category.name;
  }

}
