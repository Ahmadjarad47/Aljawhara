import { Component, computed, input, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartItem } from '../../../Models/order';
import { CartService } from '../../service/cart-service';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css'
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private cartService = inject(CartService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      orderSummary: 'ملخص الطلب',
      items: 'العناصر',
      estimatedTax: 'الضريبة المقدرة',
      discount: 'الخصم',
      total: 'الإجمالي',
      checkout: 'إتمام الطلب',
      cartEmpty: 'سلة التسوق فارغة.'
    },
    en: {
      orderSummary: 'Order summary',
      items: 'Items',
      estimatedTax: 'Estimated tax',
      discount: 'Discount',
      total: 'Total',
      checkout: 'Checkout',
      cartEmpty: 'Your cart is empty.'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
  
  goToCheckout() {
    this.router.navigate(['/checkout']);
  }

  ngOnInit() {
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
        }
      }
    });

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
  // Input for cart items
  cartItems = input<CartItem[]>([]);
  
  // Computed values
  subtotal = computed(() => 
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );
  
  itemCount = computed(() => 
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );
  
  tax = computed(() => 0); // Tax set to zero
  
  // Coupon-related computed values
  discountAmount = computed(() => this.cartService.getDiscountAmount());
  hasAppliedCoupon = computed(() => this.cartService.hasAppliedCoupon());
  
  total = computed(() => {
    return this.hasAppliedCoupon() ? this.cartService.getTotalPriceWithDiscount() : this.subtotal();
  });
  
  // Optional inputs
  showTax = input<boolean>(true);
  showCheckoutButton = input<boolean>(false);
  showEmptyMessage = input<boolean>(true);
}

