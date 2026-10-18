import { Component, computed, input, inject, OnInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CartItem } from '../../../Models/order';
import { CartService } from '../../service/cart-service';
import { ServiceAuth } from '../../../auth/service-auth';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css'
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private router = inject(Router);
  private cartService = inject(CartService);
  private authService = inject(ServiceAuth);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  currentLanguage = signal<'ar' | 'en'>('ar');
  translations = {
    ar: {
      orderSummary: 'ملخص الطلب', items: 'العناصر', discount: 'الخصم', deliveryFee: 'رسوم التوصيل',
      total: 'الإجمالي', checkout: 'إتمام الطلب', cartEmpty: 'سلة التسوق فارغة.',
      guestCheckoutPrompt: 'هل تريد تسجيل الدخول قبل إتمام الطلب؟', guestCheckoutTitle: 'إتمام الشراء كزائر',
      login: 'تسجيل الدخول', continueAsGuest: 'متابعة كزائر', warningTitle: 'تنبيه',
      warningMessage: 'قد تفقد بياناتك إذا تابعت كزائر.', back: 'رجوع',
    },
    en: {
      orderSummary: 'Order summary', items: 'Items', discount: 'Discount', deliveryFee: 'Delivery fee',
      total: 'Total', checkout: 'Checkout', cartEmpty: 'Your cart is empty.',
      guestCheckoutPrompt: 'Would you like to sign in before checkout?', guestCheckoutTitle: 'Guest checkout',
      login: 'Sign in', continueAsGuest: 'Continue as guest', warningTitle: 'Warning',
      warningMessage: 'Continuing as a guest may cause you to lose your data.', back: 'Back',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    return this.translations[this.currentLanguage()][key];
  }
  showGuestLoginModal = signal(false);
  showGuestWarningModal = signal(false);

  goToCheckout(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/checkout']);
      return;
    }
    this.showGuestLoginModal.set(true);
  }

  onLoginChoice(shouldLogin: boolean): void {
    this.showGuestLoginModal.set(false);
    if (shouldLogin) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.showGuestWarningModal.set(true);
  }

  onGuestWarningContinue(): void {
    this.showGuestWarningModal.set(false);
    this.router.navigate(['/checkout']);
  }

  private updateLanguage = (): void => {
    try {
      this.currentLanguage.set(window.localStorage.getItem('language') === 'en' ? 'en' : 'ar');
    } catch {
      // Keep the default language if browser storage is blocked.
    }
  };

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.updateLanguage();
    window.addEventListener('storage', this.updateLanguage);
    this.languageCheckInterval = setInterval(this.updateLanguage, 500);
  }

  ngOnDestroy(): void {
    if (this.isBrowser) window.removeEventListener('storage', this.updateLanguage);
    if (this.languageCheckInterval) clearInterval(this.languageCheckInterval);
  }

  cartItems = input<CartItem[]>([]);
  subtotal = computed(() => this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0));
  itemCount = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));
  tax = computed(() => 0);
  discountAmount = computed(() => this.cartService.getDiscountAmount());
  hasAppliedCoupon = computed(() => this.cartService.hasAppliedCoupon());
  total = computed(() => {
    const baseTotal = this.hasAppliedCoupon() ? this.cartService.getTotalPriceWithDiscount() : this.subtotal();
    return baseTotal + this.deliveryFee();
  });
  showTax = input(true);
  showCheckoutButton = input(false);
  showEmptyMessage = input(true);
  deliveryFee = input(0);
}
