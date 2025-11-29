import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { WishlistService, WishlistItem } from '../../core/service/wishlist-service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css'
})
export class Wishlist implements OnInit, OnDestroy {
  private readonly wishlistService = inject(WishlistService);
  private readonly router = inject(Router);

  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Expose wishlist items as a signal for template
  wishlistItems = this.wishlistService.getWishlistItemsSignal();

  // Derived state
  isEmpty = computed(() => this.wishlistItems().length === 0);

  // Translations
  translations = {
    ar: {
      wishlist: 'قائمة الأمنيات',
      wishlistDesc: 'تصفح المنتجات التي قمت بحفظها للشراء لاحقاً',
      emptyTitle: 'قائمة الأمنيات فارغة',
      emptyDesc: 'أضف المنتجات إلى قائمة الأمنيات للاحتفاظ بها في مكان واحد',
      browseProducts: 'تصفح المنتجات',
      moveAllToCart: 'نقل جميع العناصر إلى السلة',
      clearWishlist: 'مسح قائمة الأمنيات',
      addedAt: 'تمت الإضافة في',
      price: 'السعر',
      goToProduct: 'عرض المنتج',
      remove: 'إزالة',
      totalItems: 'عدد العناصر',
      moveToCart: 'نقل إلى السلة'
    },
    en: {
      wishlist: 'Wishlist',
      wishlistDesc: 'Review the products you saved to buy later',
      emptyTitle: 'Your wishlist is empty',
      emptyDesc: 'Add products to your wishlist to keep them in one place',
      browseProducts: 'Browse products',
      moveAllToCart: 'Move all items to cart',
      clearWishlist: 'Clear wishlist',
      addedAt: 'Added at',
      price: 'Price',
      goToProduct: 'View product',
      remove: 'Remove',
      totalItems: 'Total items',
      moveToCart: 'Move to cart'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  ngOnInit(): void {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang === 'ar' || savedLang === 'en') {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    // Listen for language changes from other parts of the app (e.g. navbar)
    window.addEventListener('storage', this.handleStorageEvent);

    // Periodically check for language changes in same window
    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (
        currentLang &&
        (currentLang === 'ar' || currentLang === 'en') &&
        currentLang !== this.currentLanguage()
      ) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleStorageEvent);
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'language' && event.newValue) {
      const newLang = event.newValue as 'ar' | 'en';
      if (newLang === 'ar' || newLang === 'en') {
        this.currentLanguage.set(newLang);
      }
    }
  };

  // Helpers
  getProductName(item: WishlistItem): string {
    const isArabic = this.currentLanguage() === 'ar';
    const product = item.product;
    return isArabic ? (product.titleAr || product.title) : product.title;
  }

  getProductDescription(item: WishlistItem): string {
    const isArabic = this.currentLanguage() === 'ar';
    const product = item.product;
    return isArabic
      ? (product.descriptionAr || product.description || '')
      : (product.description || '');
  }

  getProductPrice(item: WishlistItem): number | null {
    return item.product.newPrice ?? null;
  }

  // Actions
  removeItem(item: WishlistItem): void {
    this.wishlistService.removeItem(item.id);
  }

  moveItemToCart(item: WishlistItem): void {
    this.wishlistService.moveToCart(item);
  }

  moveAllToCart(): void {
    this.wishlistService.moveAllToCart();
  }

  clearWishlist(): void {
    this.wishlistService.clearWishlist();
  }

  navigateToProduct(item: WishlistItem): void {
    this.router.navigate(['/product', item.product.id]);
  }
}


