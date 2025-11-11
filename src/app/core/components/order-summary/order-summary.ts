import { Component, computed, input, inject } from '@angular/core';
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
export class OrderSummaryComponent {
  private router = inject(Router);
  private cartService = inject(CartService);
  
  goToCheckout() {
    this.router.navigate(['/checkout']);
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
  
  tax = computed(() => this.subtotal() * 0.10); // 10% tax
  
  // Coupon-related computed values
  discountAmount = computed(() => this.cartService.getDiscountAmount());
  hasAppliedCoupon = computed(() => this.cartService.hasAppliedCoupon());
  
  total = computed(() => {
    const subtotalWithTax = this.subtotal() + this.tax();
    return this.hasAppliedCoupon() ? this.cartService.getTotalPriceWithDiscount() + this.tax() : subtotalWithTax;
  });
  
  // Optional inputs
  showTax = input<boolean>(true);
  showCheckoutButton = input<boolean>(false);
  showEmptyMessage = input<boolean>(true);
}

