import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, inject, signal, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';
import { ServiceAuth } from '../../auth/service-auth';
import { UserResponseDto } from '../../auth/auth.models';
import { CartService } from '../../core/service/cart-service';
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
  selectedLanguage: string = 'العربية';
  selectedCurrency: string = 'SYP';
  
  // Dropdown states
  isLanguageDropdownOpen: boolean = false;
  isCurrencyDropdownOpen: boolean = false;
  isUserDropdownOpen: boolean = false;
  
  // Cart and wishlist counts
  cartItems = this.cartService.getCartItemsSignal();
  wishlistCount: number = 3;
  
  // Computed cart count
  get cartCount(): number {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
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
    { code: 'ar', name: 'العربية', flag: '🇸🇾' },
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
  }

  ngOnInit() {
    // Initialize component - defer non-critical operations
    this.loadUserData();
    
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
    this.isLanguageDropdownOpen = false;
    console.log('Language changed to:', language.code);
    // Reload categories with new language
    this.loadCategories();
    // Implement language switching logic here
    // this.translateService.use(language.code);
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
    this.activeTab = 'search';
    if (this.showMobileSearch) {
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
    }
  }

  closeMobileSearch() {
    this.showMobileSearch = false;
  }

  toggleCategoriesMobile() {
    this.showMobileCategories = !this.showMobileCategories;
    this.activeTab = 'categories';
    if (this.showMobileCategories) {
      this.showMobileSearch = false;
      this.showMobileAccount = false;
    }
  }

  closeMobileCategories() {
    this.showMobileCategories = false;
  }

  toggleAccountMobile() {
    this.showMobileAccount = !this.showMobileAccount;
    this.activeTab = 'account';
    if (this.showMobileAccount) {
      this.showMobileSearch = false;
      this.showMobileCategories = false;
    }
  }

  closeMobileAccount() {
    this.showMobileAccount = false;
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
    // this.router.navigate(['/wishlist']);
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
