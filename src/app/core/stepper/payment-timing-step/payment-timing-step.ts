import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ServiceStepper, PaymentTiming } from '../service-stepper';
import { CartService } from '../../service/cart-service';
import { OrderCreateDto, ShippingAddressCreateDto } from '../../../admin/order/order.models';
import { UserAddressDto } from '../../Models/shipping';
import { environment } from '../../../../environments/environment.development';

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
  private http = inject(HttpClient);
  
  // Loading state
  isCreatingOrder = signal<boolean>(false);
  
  // Language / translations
  currentLanguage = signal<'ar' | 'en'>(
    (localStorage.getItem('language') as 'ar' | 'en' | null) ?? 'ar'
  );

  translations = {
    ar: {
      paymentTimingTitle: 'اختر وقت الدفع',
      paymentTimingSubtitle: 'اختر متى تريد الدفع لهذا الطلب',
      payNow: 'الدفع الآن',
      payNowDescription: 'ادفع الآن باستخدام بطاقة الائتمان أو الخصم',
      payOnDelivery: 'الدفع عند الاستلام',
      payOnDeliveryDescription: 'ادفع نقداً عند استلام الطلب في منزلك',
      selected: 'محدد',
      continue: 'متابعة',
      creatingOrder: 'جاري إنشاء الطلب...',
      orderCreated: 'تم إنشاء الطلب بنجاح',
    },
    en: {
      paymentTimingTitle: 'Choose Payment Timing',
      paymentTimingSubtitle: 'Select when you want to pay for this order',
      payNow: 'Pay Now',
      payNowDescription: 'Pay now using your credit or debit card',
      payOnDelivery: 'Pay on Delivery',
      payOnDeliveryDescription: 'Pay with cash when you receive your order at home',
      selected: 'Selected',
      continue: 'Continue',
      creatingOrder: 'Creating order...',
      orderCreated: 'Order created successfully',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }
  
  // Check if RTL language
  isRTL = computed(() => this.currentLanguage() === 'ar');
  
  // Selected payment timing
  selectedTiming = signal<PaymentTiming | null>(
    this.stepperService.checkoutData().paymentTiming || null
  );
  
  // Select payment timing
  async selectTiming(timing: PaymentTiming): Promise<void> {
    this.selectedTiming.set(timing);
    this.stepperService.updateCheckoutData({ paymentTiming: timing });
    
    // If Pay on Delivery is selected, create order immediately
    if (timing === 'on_delivery') {
      await this.createOrder();
    }
  }
  
  // Check if timing is selected
  isTimingSelected(): boolean {
    return this.selectedTiming() !== null;
  }
  
  // Create order
  private async createOrder(): Promise<void> {
    const checkoutData = this.stepperService.checkoutData();
    const cartItems = this.cartService.getCartItems();
    const address = checkoutData.address;
    
    // Validate required data
    if (!address) {
      console.error('Shipping address is required');
      return;
    }
    
    if (cartItems.length === 0) {
      console.error('Cart is empty');
      return;
    }
    
    this.isCreatingOrder.set(true);
    
    try {
      // Map cart items to order items
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        selectedVariants: item.selectedVariants
      }));
      
      // Map address to shipping address
      const shippingAddress: ShippingAddressCreateDto = {
        fullName: address.fullName,
        phone: address.phoneNumber,
        street: address.addressLine1 + (address.addressLine2 ? `, ${address.addressLine2}` : ''),
        city: address.city,
        state: address.state || null,
        postalCode: address.postalCode,
        country: address.country
      };
      
      // Get coupon code if applied
      const appliedCoupon = this.cartService.getAppliedCoupon();
      const couponCode = appliedCoupon?.code || null;
      
      // Create order DTO
      const orderDto: OrderCreateDto = {
        items: orderItems,
        shippingAddress: shippingAddress,
        couponCode: couponCode
      };
      
      // Create order via API
      const response = await this.http.post<any>(
        `${environment.apiUrl}Orders`,
        orderDto
      ).toPromise();
      
      // Clear cart and reset stepper
      this.cartService.clearCart();
      this.stepperService.reset();
      
      // Navigate to user orders page
      await this.router.navigate(['/user/orders']);
    } catch (error) {
      console.error('Error creating order:', error);
      // Reset the selection on error
      this.selectedTiming.set(null);
      this.stepperService.updateCheckoutData({ paymentTiming: undefined });
    } finally {
      this.isCreatingOrder.set(false);
    }
  }
}

