import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../service/cart-service';
import { CoponeService } from '../../../admin/copone/copone-service';
import { OrderSummaryComponent } from '../order-summary/order-summary';
import { CartItem } from '../../../Models/order';
import { CouponDto, CouponValidationDto, CouponValidationResultDto } from '../../../admin/copone/copone.models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, OrderSummaryComponent, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private couponService = inject(CoponeService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      yourCart: 'سلة التسوق الخاصة بك',
      itemsInCart: 'عنصر في السلة',
      clearCart: 'مسح السلة',
      cartEmpty: 'سلة التسوق فارغة',
      browseProducts: 'تصفح المنتجات وأضف العناصر إلى سلة التسوق لرؤيتها هنا.',
      continueShopping: 'متابعة التسوق',
      added: 'تمت الإضافة',
      coupon: 'كوبون:',
      applyCoupon: 'تطبيق كوبون',
      enterCouponCode: 'أدخل رمز الكوبون',
      apply: 'تطبيق',
      couponApplied: 'تم تطبيق الكوبون!',
      discount: 'الخصم:',
      pleaseEnterCoupon: 'يرجى إدخال رمز كوبون',
      invalidCoupon: 'رمز كوبون غير صحيح',
      failedToValidate: 'فشل التحقق من الكوبون. يرجى المحاولة مرة أخرى.',
      failedToApply: 'فشل تطبيق الكوبون. يرجى المحاولة مرة أخرى.',
      each: 'لكل',
      clearCartConfirm: 'هل أنت متأكد أنك تريد مسح سلة التسوق؟'
    },
    en: {
      yourCart: 'Your Cart',
      itemsInCart: 'item in cart',
      clearCart: 'Clear cart',
      cartEmpty: 'Your cart is empty',
      browseProducts: 'Browse products and add items to your cart to see them here.',
      continueShopping: 'Continue shopping',
      added: 'Added',
      coupon: 'Coupon:',
      applyCoupon: 'Apply Coupon',
      enterCouponCode: 'Enter coupon code',
      apply: 'Apply',
      couponApplied: 'Coupon Applied!',
      discount: 'Discount:',
      pleaseEnterCoupon: 'Please enter a coupon code',
      invalidCoupon: 'Invalid coupon code',
      failedToValidate: 'Failed to validate coupon. Please try again.',
      failedToApply: 'Failed to apply coupon. Please try again.',
      each: 'each',
      clearCartConfirm: 'Are you sure you want to clear your cart?'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
  
  // Get cart items from the service
  cartItems = this.cartService.getCartItemsSignal();
  
  // Get applied coupon from the service
  appliedCoupon = this.cartService.getAppliedCouponSignal();
  couponValidationResult = this.cartService.getCouponValidationResultSignal();
  
  // Coupon input
  couponCode = '';
  isApplyingCoupon = false;
  couponError = '';
  
  // Total price
  get totalPrice(): number {
    return this.cartService.getTotalPrice();
  }
  
  // Item count
  get itemCount(): number {
    return this.cartService.getCartItemCount();
  }
  
  // Remove item
  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }
  
  // Update quantity
  updateQuantity(itemId: string, quantity: number): void {
    this.cartService.updateQuantity(itemId, quantity);
  }
  
  // Clear cart
  clearCart(): void {
    if (confirm(this.t('clearCartConfirm'))) {
      this.cartService.clearCart();
    }
  }
  
  // Get item total
  getItemTotal(price: number, quantity: number): number {
    return price * quantity;
  }

  // Apply coupon
  async applyCoupon(): Promise<void> {
    if (!this.couponCode.trim()) {
      this.couponError = this.t('pleaseEnterCoupon');
      return;
    }

    this.isApplyingCoupon = true;
    this.couponError = '';

    try {
      const validationDto: CouponValidationDto = {
        code: this.couponCode.trim().toUpperCase(),
        orderAmount: this.totalPrice,
        userId: null // You can get this from auth service if needed
      };

      const result = await this.couponService.validateCoupon(validationDto).toPromise();
      
      if (!result) {
        this.couponError = this.t('failedToValidate');
        return;
      }
      
      if (result.isValid && result.coupon) {
        this.cartService.applyCoupon(result.coupon, result);
        this.couponCode = '';
        this.couponError = '';
      } else {
        this.couponError = result.message || this.t('invalidCoupon');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      this.couponError = this.t('failedToApply');
    } finally {
      this.isApplyingCoupon = false;
    }
  }

  // Remove applied coupon
  removeCoupon(): void {
    this.cartService.removeCoupon();
    this.couponCode = '';
    this.couponError = '';
  }

  // Get discount amount
  get discountAmount(): number {
    return this.cartService.getDiscountAmount();
  }

  // Get total with discount
  get totalWithDiscount(): number {
    return this.cartService.getTotalPriceWithDiscount();
  }

  // Check if coupon is applied
  get hasAppliedCoupon(): boolean {
    return this.cartService.hasAppliedCoupon();
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
}
