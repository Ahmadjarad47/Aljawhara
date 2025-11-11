import { Component, inject } from '@angular/core';
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
export class Cart {
  private cartService = inject(CartService);
  private couponService = inject(CoponeService);
  
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
    if (confirm('Are you sure you want to clear your cart?')) {
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
      this.couponError = 'Please enter a coupon code';
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
        this.couponError = 'Failed to validate coupon. Please try again.';
        return;
      }
      
      if (result.isValid && result.coupon) {
        this.cartService.applyCoupon(result.coupon, result);
        this.couponCode = '';
        this.couponError = '';
      } else {
        this.couponError = result.message || 'Invalid coupon code';
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      this.couponError = 'Failed to apply coupon. Please try again.';
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
}
