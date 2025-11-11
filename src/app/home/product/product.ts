import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService, ProductFilters, ProductResponse } from './product-service';
import { CategoryDto, ProductSummaryDto, SubCategoryDto } from './product.models';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
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
        if (Array.isArray(response)) {
          // Simple array response
          this.products$ = of(response);
          this.totalCount.set(response.length);
        } else {
          // Paginated response - backend returns { Products, TotalCount, PageNumber, PageSize }
          const products = (response as any).Products || (response as any).products || response.products || [];
          const totalCount = (response as any).TotalCount || (response as any).totalCount || response.totalCount || 0;
          this.products$ = of(products);
          this.totalCount.set(totalCount);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load products');
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
      const cartItem = {
        productId: product.id,
        name: product.title,
        image: product.mainImage || 'https://via.placeholder.com/400x400?text=No+Image',
        price: product.newPrice,
        quantity: 1
      };

      this.cartService.addItem(cartItem);
      
      this.toastService.success(
        'Added to Cart',
        `${product.title} has been added to your cart`
      );
    } catch (error) {
      this.toastService.error(
        'Error',
        'Failed to add product to cart'
      );
      console.error('Error adding to cart:', error);
    }
  }

  toggleWishlist(product: ProductSummaryDto) {
    console.log('Toggled wishlist for:', product.title);
    // Toggle wishlist state
    product.isInWishlist = !product.isInWishlist;
    
    // Implement wishlist functionality
    // You can save to localStorage or call API here
    if (product.isInWishlist) {
      console.log('Added to wishlist');
    } else {
      console.log('Removed from wishlist');
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
  }
}
