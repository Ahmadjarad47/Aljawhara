import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShippingStepComponent } from './shipping-step/shipping-step';
import { PaymentTimingStepComponent } from './payment-timing-step/payment-timing-step';
import { CartService } from '../service/cart-service';
import { ServiceStepper } from './service-stepper';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule, RouterLink, ShippingStepComponent, PaymentTimingStepComponent],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
})
export class StepperComponent {
  private cartService = inject(CartService);
  private stepperService = inject(ServiceStepper);
  shipping = viewChild(ShippingStepComponent);
  payment = viewChild(PaymentTimingStepComponent);
  isSubmitting = signal(false);
  currentLanguage = signal<'ar' | 'en'>(localStorage.getItem('language') === 'en' ? 'en' : 'ar');
  cartItems = this.cartService.getCartItemsSignal();
  subtotal = computed(() => this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0));
  deliveryFee = computed(() => this.stepperService.checkoutData().deliveryFee ?? (this.subtotal() >= 20 ? 0 : 2));
  discount = computed(() => this.cartService.getDiscountAmount());
  total = computed(() => this.cartService.getTotalPriceWithDiscount() + this.deliveryFee());
  translations = {
    ar: {
      checkoutTitle: 'إتمام الطلب', checkoutSubtitle: 'أدخل بيانات التوصيل واختر طريقة الدفع في صفحة واحدة',
      orderSummary: 'ملخص الطلب', quantity: 'الكمية', subtotal: 'المجموع الفرعي', deliveryFee: 'رسوم التوصيل',
      discount: 'الخصم', total: 'الإجمالي', confirmOrder: 'تأكيد الطلب', backToCart: 'العودة للسلة',
      processing: 'جاري تأكيد الطلب...', cartEmpty: 'سلة التسوق فارغة',
    },
    en: {
      checkoutTitle: 'Checkout', checkoutSubtitle: 'Enter delivery details and choose your payment method on one page',
      orderSummary: 'Order summary', quantity: 'Quantity', subtotal: 'Subtotal', deliveryFee: 'Delivery fee',
      discount: 'Discount', total: 'Total', confirmOrder: 'Confirm order', backToCart: 'Back to cart',
      processing: 'Confirming your order...', cartEmpty: 'Your cart is empty',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    return this.translations[this.currentLanguage()][key];
  }

  canConfirm(): boolean {
    const shipping = this.shipping();
    return !!this.cartItems().length && !!shipping?.isFormValid()
      && !shipping.isLoading() && !shipping.isSubmitting() && !this.isSubmitting();
  }

  async confirmOrder(): Promise<void> {
    const shipping = this.shipping();
    const payment = this.payment();
    if (!this.canConfirm() || !shipping || !payment) return;
    this.isSubmitting.set(true);
    try {
      if (await shipping.saveAddress()) await payment.createOrder();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
