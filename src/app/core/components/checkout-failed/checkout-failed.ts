import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-failed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-failed.html',
  styleUrl: './checkout-failed.css'
})
export class CheckoutFailedComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  private readonly onStorage = (e: StorageEvent) => {
    if (e.key === 'language' && e.newValue) {
      const newLang = e.newValue as 'ar' | 'en';
      if (newLang === 'ar' || newLang === 'en') {
        this.currentLanguage.set(newLang);
      }
    }
  };

  currentLanguage = signal<'ar' | 'en'>('ar');

  translations = {
    ar: {
      title: 'فشلت عملية الدفع',
      subtitle: 'لم نتمكن من إكمال عملية الدفع. يمكنك المحاولة مرة أخرى أو اختيار طريقة أخرى.',
      tipsTitle: 'ملاحظات سريعة',
      tip1: 'تحقق من بيانات البطاقة أو الرصيد المتاح.',
      tip2: 'جرّب وسيلة دفع مختلفة أو أعد المحاولة بعد قليل.',
      tip3: 'إذا تم الخصم، سيتم عكس العملية تلقائياً خلال مدة قصيرة.',
      retryCheckout: 'إعادة المحاولة',
      backToCart: 'العودة للسلة',
      contactSupport: 'تواصل معنا',
      goHome: 'الصفحة الرئيسية'
    },
    en: {
      title: 'Payment Failed',
      subtitle: 'We couldn’t complete your payment. Please try again or choose another payment method.',
      tipsTitle: 'Quick tips',
      tip1: 'Check your card details or available balance.',
      tip2: 'Try a different payment method or retry in a few minutes.',
      tip3: 'If you were charged, the transaction is usually reversed shortly.',
      retryCheckout: 'Try Again',
      backToCart: 'Back to Cart',
      contactSupport: 'Contact Support',
      goHome: 'Home'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  retry() {
    this.router.navigate(['/checkout']);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  ngOnInit() {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', this.onStorage);

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
    window.removeEventListener('storage', this.onStorage);
  }
}

