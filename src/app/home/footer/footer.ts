import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Company description
      companyDesc: 'وجهتك الموثوقة للمنتجات عالية الجودة بأسعار رائعة. نحن ملتزمون بتقديم خدمة ممتازة وأفضل تجربة تسوق.',
      // Contact labels
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      // Sections
      followUs: 'تابعنا',
      quickLinks: 'روابط سريعة',
      customerService: 'خدمة العملاء',
      company: 'الشركة',
      // Quick Links
      home: 'الرئيسية',
      products: 'المنتجات',
      aboutUs: 'من نحن',
      contact: 'اتصل بنا',
      // Customer Service
      myAccount: 'حسابي',
      orderTracking: 'تتبع الطلب',
      wishlist: 'قائمة الأمنيات',
      returnsExchanges: 'الإرجاع والاستبدال',
      // Company Info
      careers: 'الوظائف',
      privacyPolicy: 'سياسة الخصوصية',
      termsConditions: 'الشروط والأحكام',
      cookiePolicy: 'سياسة ملفات تعريف الارتباط',
      // Newsletter
      newsletter: 'النشرة الإخبارية',
      newsletterDesc: 'احصل على تحديثات حول المنتجات الجديدة والعروض',
      yourEmail: 'بريدك الإلكتروني',
      // Payment
      weAccept: 'نقبل',
      cashOnDelivery: 'الدفع عند الاستلام',
      // Bottom
      allRightsReserved: 'جميع الحقوق محفوظة',
      backToTop: 'العودة للأعلى'
    },
    en: {
      // Company description
      companyDesc: 'Your trusted destination for quality products at great prices. We\'re committed to providing excellent service and the best shopping experience.',
      // Contact labels
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      // Sections
      followUs: 'Follow Us',
      quickLinks: 'Quick Links',
      customerService: 'Customer Service',
      company: 'Company',
      // Quick Links
      home: 'Home',
      products: 'Products',
      aboutUs: 'About Us',
      contact: 'Contact',
      // Customer Service
      myAccount: 'My Account',
      orderTracking: 'Order Tracking',
      wishlist: 'Wishlist',
      returnsExchanges: 'Returns & Exchanges',
      // Company Info
      careers: 'Careers',
      privacyPolicy: 'Privacy Policy',
      termsConditions: 'Terms & Conditions',
      cookiePolicy: 'Cookie Policy',
      // Newsletter
      newsletter: 'Newsletter',
      newsletterDesc: 'Get updates on new products and offers',
      yourEmail: 'Your email',
      // Payment
      weAccept: 'We Accept',
      cashOnDelivery: 'Cash on Delivery',
      // Bottom
      allRightsReserved: 'All rights reserved.',
      backToTop: 'Back to Top'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  // Footer links data - will be updated based on language
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

  // Update links based on current language
  private updateLinksLanguage() {
    const isArabic = this.currentLanguage() === 'ar';
    
    this.quickLinks = [
      { name: isArabic ? this.t('home') : 'Home', route: '/' },
      { name: isArabic ? this.t('products') : 'Products', route: '/product' },
      { name: isArabic ? this.t('aboutUs') : 'About Us', route: '/about' },
      { name: isArabic ? this.t('contact') : 'Contact', route: '/contact' }
    ];

    this.customerService = [
      { name: isArabic ? this.t('myAccount') : 'My Account', route: '/user' },
      { name: isArabic ? this.t('orderTracking') : 'Order Tracking', route: '/user/orders' },
      { name: isArabic ? this.t('wishlist') : 'Wishlist', route: '/user/wishlist' },
      { name: isArabic ? this.t('returnsExchanges') : 'Returns & Exchanges', route: '/returns' }
    ];

    this.companyInfo = [
      { name: isArabic ? this.t('aboutUs') : 'About Us', route: '/about' },
      { name: isArabic ? this.t('careers') : 'Careers', route: '/careers' },
      { name: isArabic ? this.t('privacyPolicy') : 'Privacy Policy', route: '/privacy' },
      { name: isArabic ? this.t('termsConditions') : 'Terms & Conditions', route: '/terms' }
    ];
  }

  socialLinks = [
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/aljawhara_plus?igsh=aWpwNDdpd3Q3OWRy&utm_source=qr' }
  ];

  contactInfo = {
    phone: '+963 11 123 4567',
    email: 'info@aljawhara.com',
    address: 'الكويت, الشويخ الصناعية'
  };

  paymentMethods = [
    { name: 'Visa', icon: '💳' },
    { name: 'Mastercard', icon: '💳' },
    { name: 'PayPal', icon: '💳' },
    { name: 'Cash on Delivery', icon: '💰' }
  ];

  // Get payment method name based on language
  getPaymentMethodName(payment: any): string {
    if (payment.name === 'Cash on Delivery') {
      return this.currentLanguage() === 'ar' ? this.t('cashOnDelivery') : 'Cash on Delivery';
    }
    return payment.name;
  }

  ngOnInit() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      // Default to Arabic
      this.currentLanguage.set('ar');
    }

    // Update links based on initial language
    this.updateLinksLanguage();

    // Listen for language changes from localStorage (when changed in navbar)
    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
          this.updateLinksLanguage();
        }
      }
    });

    // Also check periodically for language changes (for same-window updates)
    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
        this.updateLinksLanguage();
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  navigateToRoute(route: string) {
    // Navigation will be handled by router-link in template
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
