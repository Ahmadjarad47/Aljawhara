import { Injectable, signal } from '@angular/core';
import { CartItem, OrderItemCreateDto } from '../../Models/order';
import { CouponDto, CouponValidationResultDto } from '../Models/coupon';
import { PreparedBrowserCart } from '../Models/ai-shopping';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'cart_items';
  private readonly COUPON_STORAGE_KEY = 'applied_coupon';
  private assistantOperations: Record<string, string> = {};
  
  // Cart items signal
  private cartItems = signal<CartItem[]>([]);
  
  // Applied coupon signal
  private appliedCoupon = signal<CouponDto | null>(null);
  private couponValidationResult = signal<CouponValidationResultDto | null>(null);

  constructor() {
    // Load cart from localStorage on service initialization
    this.loadCartFromStorage();
    this.loadCouponFromStorage();
  }

  // Get cart items as readonly signal
  getCartItemsSignal() {
    return this.cartItems.asReadonly();
  }

  // Get applied coupon as readonly signal
  getAppliedCouponSignal() {
    return this.appliedCoupon.asReadonly();
  }

  // Get coupon validation result as readonly signal
  getCouponValidationResultSignal() {
    return this.couponValidationResult.asReadonly();
  }

  // Load cart from localStorage
  private loadCartFromStorage(): void {
    try {
      if(typeof localStorage == 'undefined') {return;}
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored);
        const items = Array.isArray(value) ? value : value.items;
        if (!Array.isArray(items)) throw new Error('Invalid cart storage');
        this.assistantOperations = this.activeOperations(Array.isArray(value) ? {} : value.assistantOperations);
        // Convert date strings back to Date objects
        const cartItems = items.map((item: CartItem) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
        this.cartItems.set(cartItems);
      } else {
        this.cartItems.set([]);
        this.assistantOperations = {};
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.cartItems.set([]);
    }
  }

  // Save cart to localStorage
  private saveCartToStorage(items: CartItem[], operations = this.assistantOperations): boolean {
    try {
      if(typeof localStorage == 'undefined') {return false;}
      const current = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const receipts = this.activeOperations({ ...current?.assistantOperations, ...operations });
      // Cart contents and approval receipts commit together in ONE localStorage write.
      const value = Object.keys(receipts).length ? { schemaVersion: 2, items, assistantOperations: receipts } : items;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(value));
      this.assistantOperations = receipts;
      this.cartItems.set(items);
      return true;
    } catch (error) {
      console.error('Error saving cart to storage:', error);
      return false;
    }
  }

  private activeOperations(operations: unknown): Record<string, string> {
    if (!operations || typeof operations !== 'object' || Array.isArray(operations)) return {};
    return Object.fromEntries(Object.entries(operations).filter(([key, expiry]) =>
      /^[0-9a-f-]{36}$/i.test(key) && typeof expiry === 'string' && Date.parse(expiry) > Date.now()));
  }

  // Add item to cart
  addItem(product: OrderItemCreateDto): void {
    this.saveCartToStorage(this.mergeItem(this.cartItems(), product));
  }

  private mergeItem(items: CartItem[], product: OrderItemCreateDto): CartItem[] {
    
    // Check if product already exists in cart with same variants
    const existingItem = items.find(item => {
      if (item.productId !== product.productId) return false;
      
      // Compare selected variants
      const itemVariants = item.selectedVariants || {};
      const productVariants = product.selectedVariants || {};
      
      const itemVariantKeys = Object.keys(itemVariants).sort();
      const productVariantKeys = Object.keys(productVariants).sort();
      
      if (itemVariantKeys.length !== productVariantKeys.length) return false;
      
      return itemVariantKeys.every(key => 
        itemVariants[+key] === productVariants[+key]
      );
    });
    
    if (existingItem) {
      // Update quantity if product with same variants already exists
      const updatedItems = items.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + product.quantity }
          : item
      );
      return updatedItems;
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: `${product.productId}-${Date.now()}`,
        productId: product.productId,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: product.quantity,
        addedAt: new Date(),
        selectedVariants: product.selectedVariants
      };
      const updatedItems = [...items, newItem];
      return updatedItems;
    }
  }

  async addApprovedShoppingList(prepared: PreparedBrowserCart, isCurrent = () => true): Promise<'added' | 'already-applied'> {
    if (typeof navigator === 'undefined' || !navigator.locks || typeof localStorage === 'undefined')
      throw new Error('CART_LOCK_UNAVAILABLE');
    return navigator.locks.request('aljawhara:cart_items', () => {
      if (!isCurrent()) throw new Error('SESSION_CHANGED');
      this.loadCartFromStorage();
      if (this.assistantOperations[prepared.operationId]) return 'already-applied' as const;
      if (prepared.status !== 'prepared' || !/^[0-9a-f-]{36}$/i.test(prepared.operationId) ||
          !Number.isFinite(Date.parse(prepared.expiresAtUtc)) || Date.parse(prepared.expiresAtUtc) <= Date.now() ||
          !Number.isFinite(Date.parse(prepared.replayUntilUtc)) || Date.parse(prepared.replayUntilUtc) < Date.parse(prepared.expiresAtUtc) ||
          !Array.isArray(prepared.items) || prepared.items.length > 20 ||
          new Set(prepared.items.map(x => x.productId)).size !== prepared.items.length)
        throw new Error('PREPARATION_EXPIRED');
      let items = this.cartItems();
      for (const line of prepared.items) {
        const existing = items.filter(x => x.productId === line.productId).reduce((sum, x) => sum + x.quantity, 0);
        if (!Number.isInteger(line.productId) || line.productId <= 0 || !Number.isInteger(line.quantity) ||
            line.quantity < 1 || line.quantity > 100 || !Number.isFinite(line.price) || line.price <= 0 ||
            !Number.isInteger(line.availablePackages) || existing + line.quantity > line.availablePackages)
          throw new Error('CART_CHANGED');
        items = this.mergeItem(items, { productId: line.productId, name: line.name, image: line.image ?? '', price: line.price, quantity: line.quantity });
        items = items.map(x => x.productId === line.productId && !Object.keys(x.selectedVariants ?? {}).length
          ? { ...x, price: line.price, name: line.name, image: line.image ?? '' } : x);
      }
      const operations = { ...this.assistantOperations, [prepared.operationId]: prepared.replayUntilUtc };
      if (!this.saveCartToStorage(items, operations)) throw new Error('CART_STORAGE_FAILED');
      if (this.appliedCoupon()) this.saveCouponToStorage(this.appliedCoupon(), null);
      return 'added' as const;
    });
  }

  // Remove item from cart
  removeItem(itemId: string): void {
    const items = this.cartItems();
    const updatedItems = items.filter(item => item.id !== itemId);
    this.saveCartToStorage(updatedItems);
  }

  // Update item quantity
  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    const items = this.cartItems();
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { ...item, quantity }
        : item
    );
    this.saveCartToStorage(updatedItems);
  }

  // Clear entire cart
  clearCart(): void {
    // Keep recent approval receipts so an old assistant retry cannot refill a cleared cart.
    this.saveCartToStorage([]);
  }

  // Get cart item count
  getCartItemCount(): number {
    const items = this.cartItems();
    return items.reduce((total, item) => total + item.quantity, 0);
  }

  // Get total price
  getTotalPrice(): number {
    const items = this.cartItems();
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Get cart items (for direct access without signal)
  getCartItems(): CartItem[] {
    return this.cartItems();
  }

  // Check if cart is empty
  isCartEmpty(): boolean {
    return this.cartItems().length === 0;
  }

  // Get item by product ID
  getItemByProductId(productId: number): CartItem | undefined {
    return this.cartItems().find(item => item.productId === productId);
  }

  // Check if product is in cart
  isProductInCart(productId: number): boolean {
    return this.cartItems().some(item => item.productId === productId);
  }

  // Load coupon from localStorage
  private loadCouponFromStorage(): void {
    try {
      if(typeof localStorage == 'undefined') {return;}
      const stored = localStorage.getItem(this.COUPON_STORAGE_KEY);
      if (stored) {
        const couponData = JSON.parse(stored);
        this.appliedCoupon.set(couponData.coupon);
        this.couponValidationResult.set(couponData.validationResult);
      }
    } catch (error) {
      console.error('Error loading coupon from storage:', error);
      this.appliedCoupon.set(null);
      this.couponValidationResult.set(null);
    }
  }

  // Save coupon to localStorage
  private saveCouponToStorage(coupon: CouponDto | null, validationResult: CouponValidationResultDto | null): void {
    try {
      if (coupon && validationResult) {
        localStorage.setItem(this.COUPON_STORAGE_KEY, JSON.stringify({
          coupon,
          validationResult
        }));
      } else {
        localStorage.removeItem(this.COUPON_STORAGE_KEY);
      }
      this.appliedCoupon.set(coupon);
      this.couponValidationResult.set(validationResult);
    } catch (error) {
      console.error('Error saving coupon to storage:', error);
    }
  }

  // Apply coupon
  applyCoupon(coupon: CouponDto, validationResult: CouponValidationResultDto): void {
    this.saveCouponToStorage(coupon, validationResult);
    this.updateCartItemsWithCouponCode(coupon.code);
  }

  // Remove applied coupon
  removeCoupon(): void {
    this.saveCouponToStorage(null, null);
    this.removeCouponCodeFromCartItems();
  }

  // Get total price with coupon discount
  getTotalPriceWithDiscount(): number {
    const subtotal = this.getTotalPrice();
    const validationResult = this.couponValidationResult();
    
    if (validationResult && validationResult.isValid) {
      return validationResult.finalAmount;
    }
    
    return subtotal;
  }

  // Get discount amount
  getDiscountAmount(): number {
    const validationResult = this.couponValidationResult();
    
    if (validationResult && validationResult.isValid) {
      return validationResult.discountAmount;
    }
    
    return 0;
  }

  // Check if coupon is applied
  hasAppliedCoupon(): boolean {
    return this.appliedCoupon() !== null && this.couponValidationResult()?.isValid === true;
  }

  // Get applied coupon
  getAppliedCoupon(): CouponDto | null {
    return this.appliedCoupon();
  }

  // Get coupon validation result
  getCouponValidationResult(): CouponValidationResultDto | null {
    return this.couponValidationResult();
  }

  // Update all cart items with coupon code
  private updateCartItemsWithCouponCode(couponCode: string): void {
    const items = this.cartItems();
    const updatedItems = items.map(item => ({
      ...item,
      couponCode: couponCode
    }));
    this.saveCartToStorage(updatedItems);
  }

  // Remove coupon code from all cart items
  private removeCouponCodeFromCartItems(): void {
    const items = this.cartItems();
    const updatedItems = items.map(item => ({
      ...item,
      couponCode: undefined
    }));
    this.saveCartToStorage(updatedItems);
  }
}
