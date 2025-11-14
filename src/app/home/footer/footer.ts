import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  currentYear = new Date().getFullYear();

  // Footer links data
  quickLinks = [
    { name: 'Home', route: '/' },
    { name: 'Products', route: '/product' },
    { name: 'About Us', route: '/about' },
    { name: 'Contact', route: '/contact' }
  ];

  customerService = [
    { name: 'My Account', route: '/user' },
    { name: 'Order Tracking', route: '/user/orders' },
    { name: 'Wishlist', route: '/user/wishlist' },
    { name: 'Returns & Exchanges', route: '/returns' }
  ];

  companyInfo = [
    { name: 'About Us', route: '/about' },
    { name: 'Careers', route: '/careers' },
    { name: 'Privacy Policy', route: '/privacy' },
    { name: 'Terms & Conditions', route: '/terms' }
  ];

  socialLinks = [
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com' },
    { name: 'Instagram', icon: 'instagram', url: 'https://instagram.com' },
    { name: 'Twitter', icon: 'twitter', url: 'https://twitter.com' },
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com' }
  ];

  contactInfo = {
    phone: '+963 11 123 4567',
    email: 'info@aljawhara.com',
    address: 'Damascus, Syria'
  };

  paymentMethods = [
    { name: 'Visa', icon: '💳' },
    { name: 'Mastercard', icon: '💳' },
    { name: 'PayPal', icon: '💳' },
    { name: 'Cash on Delivery', icon: '💰' }
  ];

  navigateToRoute(route: string) {
    // Navigation will be handled by router-link in template
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
