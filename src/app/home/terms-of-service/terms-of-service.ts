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
      termsOfService: 'الشروط والأحكام',
      lastUpdated: 'آخر تحديث:',
      agreementToTerms: 'الموافقة على الشروط',
      agreementIntro: 'باستخدامك لمتجرنا الإلكتروني، فإنك توافق على الشروط والأحكام التالية.',
      useOfService: 'استخدام خدمتنا',
      productsAndPricing: 'المنتجات والأسعار',
      termsVatIncluded: 'جميع الأسعار المعروضة شاملة ضريبة القيمة المضافة (حسب النظام المتبع)',
      termsModifyPrices: 'يحق للمتجر تعديل الأسعار أو المنتجات في أي وقت دون إشعار مسبق',
      termsImagesIllustrative: 'الصور المعروضة للمنتجات هي لأغراض توضيحية وقد يختلف الشكل الخارجي قليلاً دون التأثير على الجودة أو الاستخدام',
      termsCustomerDataResponsibility: 'يتحمل العميل مسؤولية إدخال بيانات صحيحة عند الطلب، والمتجر غير مسؤول عن التأخير الناتج عن معلومات غير صحيحة',
      termsCancelOrder: 'يحق للمتجر إلغاء أو رفض أي طلب في حال وجود خطأ في السعر أو توفر المنتج',
      paymentBeforeProcessing: 'يجب استلام الدفع قبل معالجة الطلب',
      acceptPaymentMethods: 'نقبل وسائل الدفع المختلفة كما هي معروضة على الموقع',
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
      termsOfService: 'Terms and Conditions',
      lastUpdated: 'Last updated:',
      agreementToTerms: 'Agreement to Terms',
      agreementIntro: 'By using our online store, you agree to the following terms and conditions.',
      useOfService: 'Use of Our Service',
      productsAndPricing: 'Products and Pricing',
      termsVatIncluded: 'All displayed prices include Value Added Tax (VAT) (according to the applicable system)',
      termsModifyPrices: 'The store reserves the right to modify prices or products at any time without prior notice',
      termsImagesIllustrative: 'Product images displayed are for illustrative purposes and the external appearance may vary slightly without affecting quality or use',
      termsCustomerDataResponsibility: 'The customer is responsible for entering correct data when ordering, and the store is not responsible for delays resulting from incorrect information',
      termsCancelOrder: 'The store has the right to cancel or reject any order if there is an error in the price or product availability',
      paymentBeforeProcessing: 'Payment must be received before order processing',
      acceptPaymentMethods: 'We accept various payment methods as displayed on our website',
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
