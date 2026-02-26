import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceStepper } from '../service-stepper';
import { CartService } from '../../service/cart-service';
import { UserAddressDto } from '../../Models/shipping';

@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-step.html',
  styleUrl: './review-step.css'
})
export class ReviewStepComponent {
  stepperService = inject(ServiceStepper);
  private cartService = inject(CartService);
  
  // Language / translations
  currentLanguage = signal<'ar' | 'en'>(
    (localStorage.getItem('language') as 'ar' | 'en' | null) ?? 'ar'
  );

  translations = {
    ar: {
      reviewTitle: 'مراجعة الطلب',
      shippingTo: 'الشحن إلى',
      edit: 'تعديل',
      noAddressSelected: 'لم يتم اختيار عنوان',
      orderSummary: 'ملخص الطلب',
      quantity: 'الكمية',
      subtotal: 'المجموع الفرعي',
      items: 'عناصر',
      tax: 'الضريبة',
      deliveryFee: 'رسوم التوصيل',
      total: 'الإجمالي',
      orderDetails: 'تفاصيل الطلب',
      cartEmpty: 'سلة التسوق فارغة',
    },
    en: {
      reviewTitle: 'Review Your Order',
      shippingTo: 'Shipping To',
      edit: 'Edit',
      noAddressSelected: 'No address selected',
      orderSummary: 'Order Summary',
      quantity: 'Quantity',
      subtotal: 'Subtotal',
      items: 'items',
      tax: 'Tax',
      deliveryFee: 'Delivery Fee',
      total: 'Total',
      orderDetails: 'Order Details',
      cartEmpty: 'Your cart is empty',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }
  
  // Get checkout data
  checkoutData = this.stepperService.checkoutData;
  
  // Get cart items
  cartItems = this.cartService.getCartItemsSignal();
  
  // Computed values
  subtotal = computed(() => 
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );
  
  tax = computed(() => 0); // Tax set to zero

  deliveryFee = computed(() => this.checkoutData().deliveryFee ?? 2);

  total = computed(() => this.subtotal() + this.deliveryFee());
  
  itemCount = computed(() => 
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );
  
  // Get address
  get address(): UserAddressDto | undefined {
    return this.checkoutData().address;
  }
  
  // Get item total
  getItemTotal(price: number, quantity: number): number {
    return price * quantity;
  }
}

