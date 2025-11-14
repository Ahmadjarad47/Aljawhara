import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from "../navbar/navbar";

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

  constructor(private router: Router) {}

  // Loading states
  isLoadingCategories: boolean = false;
  isLoadingProducts: boolean = false;
  isLoadingStats: boolean = false;

  // Newsletter subscription
  newsletterEmail: string = '';
  isNewsletterSubscribed: boolean = false;

  // Hero section stats
  stats = {
    activeUsers: 25000,
    productsSold: 150000,
    merchants: 1200,
    satisfactionRate: 96
  };

  // Countdown timer for special offer
  countdown = {
    days: 5,
    hours: 12,
    minutes: 45,
    seconds: 30
  };

  // Featured products data
  featuredProducts = [
    {
      id: 1,
      name: 'Wireless Headphones',
      description: 'Premium quality sound with noise cancellation technology for the ultimate listening experience',
      price: 199,
      originalPrice: 249,
      discount: 20,
      rating: 4.5,
      image: 'https://media.istockphoto.com/id/1191174265/photo/men-fashion-leather-chelsea-boot-isolated-on-a-white-background-side-view.jpg?s=612x612&w=is&k=20&c=GU6P3bVTBgY5lONQftSGBN9eV6MeSaVHR7FXLHB64x8=',
      badge: 'SALE',
      isWishlisted: false
    },
    {
      id: 2,
      name: 'Running Shoes',
      description: 'Comfortable and durable athletic footwear designed for performance and style',
      price: 129,
      originalPrice: null,
      discount: 0,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&crop=center',
      badge: null,
      isWishlisted: false
    },
    {
      id: 3,
      name: 'Smart Watch',
      description: 'Track your fitness and stay connected with this advanced smart wearable device',
      price: 299,
      originalPrice: null,
      discount: 0,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&crop=center',
      badge: 'NEW',
      isWishlisted: true
    },
    {
      id: 4,
      name: 'Laptop Backpack',
      description: 'Stylish and functional laptop protection with multiple compartments and ergonomic design',
      price: 89,
      originalPrice: null,
      discount: 0,
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1506905925346-04b1e0c0c6b0?w=400&h=300&fit=crop&crop=center',
      badge: null,
      isWishlisted: false
    }
  ];

  // Categories data
  categories = [
    { name: 'Electronics', icon: '💻', itemCount: 1234, color: 'primary' },
    { name: 'Fashion', icon: '👕', itemCount: 2456, color: 'secondary' },
    { name: 'Home & Garden', icon: '🏠', itemCount: 987, color: 'accent' },
    { name: 'Books', icon: '📚', itemCount: 3210, color: 'info' },
    { name: 'Sports & Games', icon: '🎮', itemCount: 1567, color: 'success' },
    { name: 'Beauty & Health', icon: '💄', itemCount: 876, color: 'warning' }
  ];

  // Testimonials data
  testimonials = [
    {
      name: 'Ahmed Al-Mahmoud',
      text: 'Amazing quality products and excellent customer service. The delivery was super fast and the packaging was perfect. Highly recommended!',
      rating: 5,
      avatar: 'A',
      color: 'primary'
    },
    {
      name: 'Sarah Johnson',
      text: 'Great prices and wide selection. I\'ve been shopping here for months and never disappointed. The return policy is also very customer-friendly.',
      rating: 5,
      avatar: 'S',
      color: 'secondary'
    },
    {
      name: 'Mohammed Ali',
      text: 'The mobile app is fantastic and the checkout process is so smooth. I love how easy it is to track my orders and manage my account.',
      rating: 5,
      avatar: 'M',
      color: 'accent'
    }
  ];

  ngOnInit() {
    this.startCountdown();
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
  }

  // Product actions
  addToCart(product: any) {
    console.log('Adding to cart:', product.name);
    // Implement add to cart logic
  }

  addToWishlist(product: any) {
    console.log('Adding to wishlist:', product.name);
    // Implement add to wishlist logic
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
}
