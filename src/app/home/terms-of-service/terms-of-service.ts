import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-of-service.html',
  styleUrl: './terms-of-service.css'
})
export class TermsOfService implements OnInit, OnDestroy {
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      legalTerms: 'الشروط القانونية',
      termsOfService: 'شروط الخدمة',
      lastUpdated: 'آخر تحديث:',
      agreementToTerms: 'الموافقة على الشروط',
      useOfService: 'استخدام خدمتنا',
      productsAndPricing: 'المنتجات والأسعار',
      ordersAndPayment: 'الطلبات والدفع',
      shippingAndReturns: 'الشحن والإرجاع',
      intellectualProperty: 'الملكية الفكرية',
      limitationOfLiability: 'تحديد المسؤولية',
      changesToTerms: 'تغييرات الشروط',
      contactUs: 'اتصل بنا',
      backToHome: 'العودة للرئيسية'
    },
    en: {
      legalTerms: 'Legal Terms',
      termsOfService: 'Terms of Service',
      lastUpdated: 'Last updated:',
      agreementToTerms: 'Agreement to Terms',
      useOfService: 'Use of Our Service',
      productsAndPricing: 'Products and Pricing',
      ordersAndPayment: 'Orders and Payment',
      shippingAndReturns: 'Shipping and Returns',
      intellectualProperty: 'Intellectual Property',
      limitationOfLiability: 'Limitation of Liability',
      changesToTerms: 'Changes to Terms',
      contactUs: 'Contact Us',
      backToHome: 'Back to Home'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  lastUpdated = 'January 2024';

  ngOnInit() {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
        }
      }
    });

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
}
