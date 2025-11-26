import { Injectable, signal } from '@angular/core';
import { ProductSummaryDto } from '../../home/product/product.models';
import { CartService } from './cart-service';
import { OrderItemCreateDto } from '../../Models/order';

export interface WishlistItem {
  id: number;
  product: ProductSummaryDto;
  addedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly STORAGE_KEY = 'wishlist_items';
  
  // Wishlist items signal
  private wishlistItems = signal<WishlistItem[]>([]);

  constructor(private cartService: CartService) {
    // Load wishlist from localStorage on service initialization
    this.loadWishlistFromStorage();
  }

  // Get wishlist items as readonly signal
  getWishlistItemsSignal() {
    return this.wishlistItems.asReadonly();
  }

  // Load wishlist from localStorage
  private loadWishlistFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') { return; }
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        // Convert date strings back to Date objects
        const wishlistItems = items.map((item: WishlistItem) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        }));
        this.wishlistItems.set(wishlistItems);
      }
    } catch (error) {
      console.error('Error loading wishlist from storage:', error);
      this.wishlistItems.set([]);
    }
  }

  // Save wishlist to localStorage
  private saveWishlistToStorage(items: WishlistItem[]): void {
    try {
      if (typeof localStorage === 'undefined') { return; }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      this.wishlistItems.set(items);
    } catch (error) {
      console.error('Error saving wishlist to storage:', error);
    }
  }

  // Add product to wishlist
  addItem(product: ProductSummaryDto): void {
    const items = this.wishlistItems();
    
    // Check if product already exists in wishlist
    const existingItem = items.find(item => item.id === product.id);
    
    if (existingItem) {
      // Product already in wishlist
      return;
    }
    
    // Add new item to wishlist
    const newItem: WishlistItem = {
      id: product.id,
      product: product,
      addedAt: new Date()
    };
    const updatedItems = [...items, newItem];
    this.saveWishlistToStorage(updatedItems);
  }

  // Remove product from wishlist
  removeItem(productId: number): void {
    const items = this.wishlistItems();
    const updatedItems = items.filter(item => item.id !== productId);
    this.saveWishlistToStorage(updatedItems);
  }

  // Clear entire wishlist
  clearWishlist(): void {
    this.wishlistItems.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Get wishlist item count
  getWishlistItemCount(): number {
    return this.wishlistItems().length;
  }

  // Get wishlist items (for direct access without signal)
  getWishlistItems(): WishlistItem[] {
    return this.wishlistItems();
  }

  // Check if wishlist is empty
  isWishlistEmpty(): boolean {
    return this.wishlistItems().length === 0;
  }

  // Check if product is in wishlist
  isProductInWishlist(productId: number): boolean {
    return this.wishlistItems().some(item => item.id === productId);
  }

  // Move item from wishlist to cart
  moveToCart(item: WishlistItem, quantity: number = 1): void {
    const cartItem: OrderItemCreateDto = {
      productId: item.product.id,
      name: item.product.title || item.product.titleAr,
      image: item.product.mainImage,
      price: item.product.newPrice,
      quantity: quantity
    };
    
    // Add to cart
    this.cartService.addItem(cartItem);
    
    // Remove from wishlist
    this.removeItem(item.id);
  }

  // Move all items from wishlist to cart
  moveAllToCart(): void {
    const items = this.wishlistItems();
    items.forEach(item => {
      this.moveToCart(item);
    });
  }

  // Toggle wishlist item (add if not exists, remove if exists)
  toggleItem(product: ProductSummaryDto): boolean {
    const isInWishlist = this.isProductInWishlist(product.id);
    
    if (isInWishlist) {
      this.removeItem(product.id);
      return false;
    } else {
      this.addItem(product);
      return true;
    }
  }
}

