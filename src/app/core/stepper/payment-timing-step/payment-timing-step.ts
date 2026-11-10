import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServiceStepper, PaymentTiming } from '../service-stepper';
import { CartService } from '../../service/cart-service';
import { OrderCreateDto } from '../../../admin/order/order.models';
import { CheckoutPaymentService } from '../../service/checkout-payment.service';
import { isShippingAddressValid, toOrderShippingAddress } from '../shipping-address';


@Component({
  selector: 'app-payment-timing-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-timing-step.html',
  styleUrl: './payment-timing-step.css'
})
export class PaymentTimingStepComponent {
  private stepperService = inject(ServiceStepper);
  private cartService = inject(CartService);
  private router = inject(Router);
  private payments = inject(CheckoutPaymentService);
  isCreatingOrder = signal(false);
  error = signal('');
  currentLanguage = signal<'ar' | 'en'>(localStorage.getItem('language') === 'en' ? 'en' : 'ar');
  translations = {
    ar: {
      paymentTimingTitle: 'طريقة الدفع', payNow: 'الدفع الآن',
      payNowDescription: 'ادفع الآن باستخدام بطاقة الائتمان أو الخصم',
      payOnDelivery: 'الدفع عند الاستلام', payOnDeliveryDescription: 'ادفع نقداً عند استلام الطلب في منزلك',
      failedToCreate: 'تعذر تأكيد الطلب. يرجى المحاولة مجدداً.',
    },
    en: {
      paymentTimingTitle: 'Payment method', payNow: 'Pay now',
      payNowDescription: 'Pay now using your credit or debit card',
      payOnDelivery: 'Pay on delivery', payOnDeliveryDescription: 'Pay with cash when you receive your order at home',
      failedToCreate: 'Unable to confirm your order. Please try again.',
    },
  } as const;
  t(key: keyof typeof this.translations.ar): string {
    return this.translations[this.currentLanguage()][key];
  }
  isRTL = computed(() => this.currentLanguage() === 'ar');
  selectedTiming = signal<PaymentTiming>(this.stepperService.checkoutData().paymentTiming ?? 'now');

  selectTiming(timing: PaymentTiming): void {
    if (this.isCreatingOrder()) return;
    this.selectedTiming.set(timing);
    this.stepperService.updateCheckoutData({ paymentTiming: timing });
  }

  async createOrder(): Promise<void> {
    if (this.isCreatingOrder()) return;
    const address = this.stepperService.checkoutData().address;
    const cartItems = this.cartService.getCartItems();
    if (!address || !isShippingAddressValid(address) || !cartItems.length) return;

    this.isCreatingOrder.set(true);
    this.error.set('');
    this.stepperService.updateCheckoutData({ paymentTiming: this.selectedTiming() });
    const orderDto: OrderCreateDto = {
      items: cartItems.map(({ productId, name, image, price, quantity, selectedVariants }) => ({
        productId, name, image, price, quantity, selectedVariants,
      })),
      shippingAddress: toOrderShippingAddress(address),
      couponCode: this.cartService.getAppliedCoupon()?.code ?? null,
      paymentMethod: this.selectedTiming() === 'on_delivery' ? 2 : 4,
    };
    try {
      const response = await firstValueFrom(this.payments.createOrder(orderDto));
      this.cartService.clearCart();
      this.stepperService.reset();
      await this.router.navigate(['/checkout/success'], {
        queryParams: { orderId: response.orderId, prepare: '1' },
      });
    } catch {
      this.error.set(this.t('failedToCreate'));
    } finally {
      this.isCreatingOrder.set(false);
    }
  }
}
