import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ServiceStepper } from '../service-stepper';
import { CartService } from '../../service/cart-service';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-step.html',
  styleUrl: './payment-step.css'
})
export class PaymentStepComponent {
  private stepperService = inject(ServiceStepper);
  private cartService = inject(CartService);
  private router = inject(Router);
  
  // Loading state
  isProcessing = signal<boolean>(false);
  
  // Payment form data
  cardNumber = signal<string>('');
  cardName = signal<string>('');
  expiryMonth = signal<string>('');
  expiryYear = signal<string>('');
  cvv = signal<string>('');
  
  // Computed values
  checkoutData = this.stepperService.checkoutData;
  cartItems = this.cartService.getCartItemsSignal();
  
  subtotal = computed(() => 
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );
  
  tax = computed(() => this.subtotal() * 0.10);
  
  total = computed(() => this.subtotal() + this.tax());
  
  // Format card number
  formatCardNumber(value: string): void {
    const cleaned = value.replace(/\s+/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    this.cardNumber.set(formatted);
  }
  
  // Check if form is valid
  isFormValid(): boolean {
    return !!(
      this.cardNumber().replace(/\s/g, '').length === 16 &&
      this.cardName() &&
      this.expiryMonth() &&
      this.expiryYear() &&
      this.cvv().length === 3
    );
  }
  
  // Process payment
  async processPayment() {
    if (!this.isFormValid()) {
      return;
    }
    
    this.isProcessing.set(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, you would call your payment API here
      // For now, we'll just clear the cart and show success
      
      this.cartService.clearCart();
      this.stepperService.reset();
      
      // Navigate to success page
      await this.router.navigate(['/checkout/success']);
    } catch (error) {
      console.error('Payment processing error:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  // Get months for dropdown
  getMonths(): string[] {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  }
  
  // Get years for dropdown (current year + 10 years)
  getYears(): string[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(currentYear + i));
  }
  
  // Get address
  get address() {
    return this.checkoutData().address;
  }
}

