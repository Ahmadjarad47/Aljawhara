import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from "../navbar/navbar";
import { ProductService, ProductResponse } from '../product/product-service';
import { ProductSummaryDto } from '../product/product.models';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePage implements OnInit, OnDestroy {
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private productService: ProductService
  ) {}

  // Loading states
  isLoadingCategories: boolean = false;
  isLoadingProducts: boolean = true;
  isLoadingStats: boolean = false;

  // Newsletter subscription
  newsletterEmail: string = '';
  isNewsletterSubscribed: boolean = false;

  // Featured Products
  featuredProducts: any[] = [];

  // Hero section stats
  stats = {
    activeUsers: 25000,
    productsSold: 150000,
    merchants: 1200,
    satisfactionRate: 96
  };

  // Hero Carousel
  currentSlide = 0;
  private carouselInterval?: ReturnType<typeof setInterval>;
  
  heroSlides = [
    {
      id: 1,
      title: 'Discover Amazing',
      titleHighlight: 'Products',
      titleEnd: 'at Great Prices',
      subtitle: 'Shop from thousands of verified sellers and find exactly what you\'re looking for. Fast delivery, secure payments, and excellent customer service guaranteed.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Shop Now',
      ctaSecondary: 'Learn More',
      theme: 'primary'
    },
    {
      id: 2,
      title: 'Premium Quality',
      titleHighlight: 'Electronics',
      titleEnd: 'Best Deals Online',
      subtitle: 'Get the latest gadgets and electronics at unbeatable prices. Free shipping on orders over $50 and 30-day money-back guarantee.',
      image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Browse Electronics',
      ctaSecondary: 'View Deals',
      theme: 'secondary'
    },
    {
      id: 3,
      title: 'Trendy Fashion',
      titleHighlight: 'Collection',
      titleEnd: 'Style Meets Comfort',
      subtitle: 'Elevate your wardrobe with our curated fashion collection. From casual to formal, find the perfect outfit for every occasion.',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Shop Fashion',
      ctaSecondary: 'New Arrivals',
      theme: 'accent'
    },
    {
      id: 4,
      title: 'Smart Home',
      titleHighlight: 'Essentials',
      titleEnd: 'Modern Living',
      subtitle: 'Transform your space with innovative smart home solutions. Energy-efficient, easy to install, and designed for modern lifestyles.',
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1920&h=1080&fit=crop',
      ctaPrimary: 'Explore Smart Home',
      ctaSecondary: 'Learn More',
      theme: 'success'
    }
  ];

  // Countdown timer for special offer
  countdown = {
    days: 5,
    hours: 12,
    minutes: 45,
    seconds: 30
  };

  ngOnInit() {
    this.startCountdown();
    this.startCarousel();
    this.loadFeaturedProducts();
  }

  // Load featured products from API
  loadFeaturedProducts() {
    this.isLoadingProducts = true;
    this.productService.getProducts({ 
      pageNumber: 1, 
      pageSize: 8,
      sortBy: 'highRating' // Get highest rated products
    }).subscribe({
      next: (response) => {
        const products = this.extractProducts(response);
        this.featuredProducts = products.map(product => this.transformProduct(product));
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  // Extract products from response (handles both array and object responses)
  private extractProducts(response: ProductSummaryDto[] | ProductResponse): ProductSummaryDto[] {
    if (Array.isArray(response)) {
      return response;
    }
    return response.Products || response.products || [];
  }

  // Transform API product to HTML expected format
  private transformProduct(product: ProductSummaryDto): any {
    const hasDiscount = product.oldPrice > product.newPrice;
    const discountPercentage = hasDiscount 
      ? Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100)
      : 0;

    return {
      id: product.id,
      name: product.title,
      description: product.description,
      price: product.newPrice,
      originalPrice: hasDiscount ? product.oldPrice : null,
      image: product.mainImage || 'https://via.placeholder.com/400x300?text=No+Image',
      rating: product.averageRating || 0,
      badge: hasDiscount ? 'SALE' : (!product.isInStock ? 'OUT OF STOCK' : null),
      discount: discountPercentage,
      isWishlisted: product.isInWishlist || false,
      isInStock: product.isInStock
    };
  }

  // Newsletter subscription
  subscribeNewsletter() {
    if (this.newsletterEmail && this.isValidEmail(this.newsletterEmail)) {
      this.isNewsletterSubscribed = true;
      console.log('Newsletter subscription:', this.newsletterEmail);
      // Here you would typically send the email to your backend
      setTimeout(() => {
        this.isNewsletterSubscribed = false;
        this.newsletterEmail = '';
      }, 3000);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Countdown timer
  startCountdown() {
    this.countdownInterval = setInterval(() => {
      // Defer update to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        if (this.countdown.seconds > 0) {
          this.countdown.seconds--;
        } else if (this.countdown.minutes > 0) {
          this.countdown.minutes--;
          this.countdown.seconds = 59;
        } else if (this.countdown.hours > 0) {
          this.countdown.hours--;
          this.countdown.minutes = 59;
          this.countdown.seconds = 59;
        } else if (this.countdown.days > 0) {
          this.countdown.days--;
          this.countdown.hours = 23;
          this.countdown.minutes = 59;
          this.countdown.seconds = 59;
        }
      }, 0);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  // Product actions
  addToCart(product: any) {
    console.log('Adding to cart:', product.name);
    // Implement add to cart logic
  }

  addToWishlist(product: any) {
    product.isWishlisted = !product.isWishlisted;
    console.log(product.isWishlisted ? 'Added to wishlist:' : 'Removed from wishlist:', product.name);
    // TODO: Implement API call to save wishlist state
  }

  // Navigation actions
  goToCategory(category: any) {
    console.log('Navigate to category:', category.name);
    // Implement navigation logic
  }

  goToProduct(product: any) {
    console.log('Navigate to product:', product.name);
    this.router.navigate(['/product', product.id]);
  }

  // Hero section actions
  shopNow() {
    console.log('Shop now clicked');
    // Implement navigation to products page
  }

  viewAllProducts() {
    console.log('View all products clicked');
    // Implement navigation to products page
  }

  viewAllCategories() {
    console.log('View all categories clicked');
    // Implement navigation to categories page
  }

  // CTA actions
  learnMore() {
    console.log('Learn more clicked');
    // Implement navigation to about page
  }

  shopSale() {
    console.log('Shop sale clicked');
    // Implement navigation to sale page
  }

  // Carousel controls
  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Auto-advance every 5 seconds
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prevSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.heroSlides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    // Reset auto-advance timer
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
  }

  pauseCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  resumeCarousel() {
    this.startCarousel();
  }
}
