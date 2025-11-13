import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../product/product-service';
import { ProductDto } from '../product/product.models';
import { Observable, catchError, of } from 'rxjs';
import { CartService } from '../../core/service/cart-service';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { ServiceAuth } from '../../auth/service-auth';
import { RatingDto } from '../../admin/product/product.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(CartService);
  public authService = inject(ServiceAuth);
  public toastService = inject(ToastService);

  // Signals for reactive state management
  isLoading = signal(true);
  errorMessage = signal('');
  product = signal<ProductDto | null>(null);
  userRating = signal<RatingDto | null>(null);
  isCheckingRating = signal(false);

  // Component state
  selectedImageIndex = 0;
  selectedColor = { name: 'Default', code: '#000000', available: true };
  selectedSize = 'One Size';
  quantity = 1;
  showFullDescription = false;
  showSpecifications = false;
  showReviews = false;
  showShippingInfo = false;
  showReturnPolicy = false;
  
  // Variants state
  selectedVariants = signal<{ [variantId: number]: number }>({}); // { variantId: valueId }
  currentPrice = signal<number>(0);

  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }

  // Reviews data
  reviews = [
    {
      id: 1,
      user: 'Ahmed Al-Mahmoud',
      avatar: 'A',
      rating: 5,
      date: '2024-01-15',
      title: 'Excellent sound quality!',
      comment: 'These headphones are amazing. The noise cancellation works perfectly and the sound quality is crystal clear. Highly recommended!',
      verified: true,
      helpful: 12
    },
    {
      id: 2,
      user: 'Sarah Johnson',
      avatar: 'S',
      rating: 4,
      date: '2024-01-10',
      title: 'Great value for money',
      comment: 'Good headphones for the price. Battery life is excellent and they are very comfortable to wear for long periods.',
      verified: true,
      helpful: 8
    },
    {
      id: 3,
      user: 'Mohammed Ali',
      avatar: 'M',
      rating: 5,
      date: '2024-01-08',
      title: 'Perfect for work',
      comment: 'I use these for my daily work calls and music. The microphone quality is great and the noise cancellation helps me focus.',
      verified: false,
      helpful: 5
    }
  ];

  // Related products
  relatedProducts = [
    {
      id: 2,
      name: 'Bluetooth Speaker',
      price: 89.99,
      originalPrice: 119.99,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop&crop=center',
      rating: 4.3,
      discount: 25
    },
    {
      id: 3,
      name: 'Smart Watch',
      price: 299.99,
      originalPrice: null,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&crop=center',
      rating: 4.7,
      discount: 0
    },
    {
      id: 4,
      name: 'Gaming Mouse',
      price: 79.99,
      originalPrice: 99.99,
      image: 'https://images.unsplash.com/photo-1527864550417-7f91c4da76f1?w=400&h=300&fit=crop&crop=center',
      rating: 4.5,
      discount: 20
    }
  ];

  // New review form
  newReview = {
    rating: 5,
    title: '',
    comment: ''
  };

  ngOnInit() {
    // Get product ID from route parameters
    this.route.params.subscribe(params => {
      const productId = +params['id'];
      if (productId) {
        this.loadProduct(productId);
      } else {
        this.errorMessage.set('Invalid product ID');
        this.isLoading.set(false);
      }
    });
  }

  loadProduct(id: number) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.productService.getProductById(id).pipe(
      catchError(error => {
        console.error('Error loading product:', error);
        this.errorMessage.set('Failed to load product details');
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe(product => {
      if (product) {
        console.log(product.ratings);
        
        this.product.set(product);
        // Reset selected image index when product changes
        this.selectedImageIndex = 0;
        
        // Initialize price with base price
        this.currentPrice.set(product.newPrice);
        
        // Reset selected variants
        this.selectedVariants.set({});
        
        // Check if product is already in cart and set quantity
        const cartItem = this.cartService.getItemByProductId(product.id);
        if (cartItem) {
          this.quantity = cartItem.quantity;
        } else {
          this.quantity = 1;
        }

        // Check if user is authenticated and has rated this product
        this.checkUserRating(product.id);
      }
      this.isLoading.set(false);
    });
  }

  checkUserRating(productId: number) {
    if (!this.authService.isAuthenticated) {
      this.userRating.set(null);
      return;
    }

    this.isCheckingRating.set(true);
    this.productService.getUserRating(productId).pipe(
      catchError(error => {
        // If 404, user hasn't rated yet - this is expected
        if (error.status === 404) {
          this.userRating.set(null);
        } else {
          console.error('Error checking user rating:', error);
        }
        this.isCheckingRating.set(false);
        return of(null);
      })
    ).subscribe(rating => {
      if (rating) {
        this.userRating.set(rating);
        // Pre-fill the review form with existing rating
        this.newReview = {
          rating: rating.ratingNumber,
          title: '', // RatingDto might not have title
          comment: rating.content || ''
        };
      } else {
        this.userRating.set(null);
      }
      this.isCheckingRating.set(false);
    });
  }

  // Image gallery methods
  selectImage(index: number) {
    const images = this.product()?.images || [];
    if (index >= 0 && index < images.length) {
      this.selectedImageIndex = index;
    }
  }

  nextImage() {
    const images = this.product()?.images || [];
    if (images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
    }
  }

  previousImage() {
    const images = this.product()?.images || [];
    if (images.length > 0) {
      this.selectedImageIndex = this.selectedImageIndex === 0 
        ? images.length - 1 
        : this.selectedImageIndex - 1;
    }
  }

  // Product options
  selectColor(color: any) {
    if (color.available) {
      this.selectedColor = color;
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
  }

  // Variants selection methods
  selectVariantValue(variantId: number, valueId: number, price: number) {
    const current = this.selectedVariants();
    this.selectedVariants.set({ ...current, [variantId]: valueId });
    this.currentPrice.set(price);
  }

  isVariantValueSelected(variantId: number, valueId: number): boolean {
    return this.selectedVariants()[variantId] === valueId;
  }

  getSelectedVariantValueId(variantId: number): number | undefined {
    return this.selectedVariants()[variantId];
  }

  areAllVariantsSelected(): boolean {
    const product = this.product();
    if (!product || !product.variants || product.variants.length === 0) {
      return true; // No variants required
    }
    
    return product.variants.every(variant => 
      this.selectedVariants()[variant.id!] !== undefined
    );
  }

  getFinalPrice(): number {
    return this.currentPrice();
  }

  // Quantity controls
  increaseQuantity() {
    const product = this.product();
    if (product && this.quantity < product.totalInStock) {
      this.quantity++;
    } else if (product && this.quantity >= product.totalInStock) {
      this.toastService.warning('Stock Limit', 'Maximum stock reached');
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Actions
  addToCart() {
    const product = this.product();
    if (!product) {
      this.toastService.error('Error', 'Product not found');
      return;
    }

    if (!product.isInStock) {
      this.toastService.warning('Out of Stock', 'This product is currently out of stock');
      return;
    }

    // Check if variants are required and all are selected
    if (product.variants && product.variants.length > 0 && !this.areAllVariantsSelected()) {
      this.toastService.warning('Selection Required', 'Please select all variant options');
      return;
    }

    if (this.quantity > product.totalInStock) {
      this.toastService.warning('Stock Limit', `Only ${product.totalInStock} items available`);
      this.quantity = product.totalInStock;
      return;
    }

    try {
      const finalPrice = this.getFinalPrice();
      const cartItem = {
        productId: product.id,
        name: product.title,
        image: (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/400x400?text=No+Image',
        price: finalPrice,
        quantity: this.quantity,
        selectedVariants: this.selectedVariants()
      };

      // Check if item is already in cart (with same variants)
      const existingItem = this.cartService.getItemByProductId(product.id);
      
      this.cartService.addItem(cartItem);
      
      if (existingItem) {
        // Update total quantity after adding
        const updatedItem = this.cartService.getItemByProductId(product.id);
        const totalQuantity = updatedItem ? updatedItem.quantity : this.quantity;
        
        this.quantity = totalQuantity;
        
        this.toastService.success(
          'Cart Updated',
          `${product.title} - ${totalQuantity} in cart`
        );
      } else {
        this.toastService.success(
          'Added to Cart',
          `${product.title} x${this.quantity} has been added to your cart`
        );
      }
    } catch (error) {
      this.toastService.error(
        'Error',
        'Failed to add product to cart'
      );
      console.error('Error adding to cart:', error);
    }
  }

  addToWishlist() {
    const product = this.product();
    console.log('Adding to wishlist:', product);
    // Implement add to wishlist logic
  }

  buyNow() {
    const product = this.product();
    console.log('Buy now:', {
      product: product,
      color: this.selectedColor,
      size: this.selectedSize,
      quantity: this.quantity
    });
    // Implement buy now logic
  }

  // Toggle sections
  toggleDescription() {
    this.showFullDescription = !this.showFullDescription;
  }

  toggleSpecifications() {
    this.showSpecifications = !this.showSpecifications;
  }

  toggleReviews() {
    this.showReviews = !this.showReviews;
  }

  toggleShippingInfo() {
    this.showShippingInfo = !this.showShippingInfo;
  }

  toggleReturnPolicy() {
    this.showReturnPolicy = !this.showReturnPolicy;
  }

  // Review methods
  submitReview() {
    if (!this.authService.isAuthenticated) {
      this.toastService.warning('Login Required', 'Please login first to submit a review');
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    if (this.newReview.title && this.newReview.comment) {
      const review = {
        id: this.reviews.length + 1,
        user: 'You',
        avatar: 'Y',
        rating: this.newReview.rating,
        date: new Date().toISOString().split('T')[0],
        title: this.newReview.title,
        comment: this.newReview.comment,
        verified: false,
        helpful: 0
      };
      this.reviews.unshift(review);
      this.newReview = { rating: 5, title: '', comment: '' };
      // After submitting, check for user rating again
      const product = this.product();
      if (product) {
        this.checkUserRating(product.id);
      }
    }
  }

  // Navigate to login
  navigateToLogin() {
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }

  markReviewHelpful(reviewId: number) {
    const review = this.reviews.find(r => r.id === reviewId);
    if (review) {
      review.helpful++;
    }
  }

  // Utility methods
  getStarsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 1 : 0);
  }

  getDiscountPercentage(): number {
    const product = this.product();
    if (product?.oldPrice && product?.newPrice) {
      return Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100);
    }
    return 0;
  }

  getAverageRating(): number {
    const product = this.product();
    return product?.averageRating || 0;
  }

  getRatingDistribution(): { [key: number]: number } {
    const product = this.product();
    const ratings = product?.ratings || [];
    const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(rating => {
      distribution[rating.ratingNumber]++;
    });
    return distribution;
  }

  // Math utility methods for template
  floor(value: number): number {
    return Math.floor(value);
  }

  round(value: number): number {
    return Math.round(value);
  }

  // Get rating count for specific rating
  getRatingCount(rating: number): number {
    return this.getRatingDistribution()[rating] || 0;
  }

  // Get rating percentage for specific rating
  getRatingPercentage(rating: number): number {
    const count = this.getRatingCount(rating);
    const product = this.product();
    const totalReviews = product?.totalReviews || 0;
    return totalReviews > 0 ? (count / totalReviews) * 100 : 0;
  }

  // Helper method to get cart status
  isProductInCart(): boolean {
    const product = this.product();
    if (!product) return false;
    return this.cartService.isProductInCart(product.id);
  }

  getCartQuantity(): number {
    const product = this.product();
    if (!product) return 0;
    const cartItem = this.cartService.getItemByProductId(product.id);
    return cartItem ? cartItem.quantity : 0;
  }

  // Increment cart quantity
  incrementCartQuantity() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + 1;
    
    if (newQuantity > product.totalInStock) {
      this.toastService.warning('Stock Limit', `Only ${product.totalInStock} items available`);
      return;
    }

    this.cartService.updateQuantity(cartItem.id, newQuantity);
    this.quantity = newQuantity;
  }

  // Decrement cart quantity
  decrementCartQuantity() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity - 1;
    
    if (newQuantity < 1) {
      return;
    }

    this.cartService.updateQuantity(cartItem.id, newQuantity);
    this.quantity = newQuantity;
  }

  // Remove from cart
  removeFromCart() {
    const product = this.product();
    if (!product) return;

    const cartItem = this.cartService.getItemByProductId(product.id);
    if (!cartItem) return;

    this.cartService.removeItem(cartItem.id);
    this.quantity = 1;
    this.toastService.success('Removed', `${product.title} has been removed from cart`);
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
