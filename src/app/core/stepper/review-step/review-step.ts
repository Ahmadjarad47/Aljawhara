import { Component, computed, inject } from '@angular/core';
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
  
  // Get checkout data
  checkoutData = this.stepperService.checkoutData;
  
  // Get cart items
  cartItems = this.cartService.getCartItemsSignal();
  
  // Computed values
  subtotal = computed(() => 
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );
  
  tax = computed(() => this.subtotal() * 0.10); // 10% tax
  
  total = computed(() => this.subtotal() + this.tax());
  
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

