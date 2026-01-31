import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.css'
})
export class PrivacyPolicy implements OnInit, OnDestroy {
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      privacySecurity: 'الخصوصية والأمان',
      privacyPolicy: 'سياسة الخصوصية',
      lastUpdated: 'آخر تحديث:',
      introduction: 'مقدمة',
      privacyIntro: 'نحن نحترم خصوصية عملائنا ونلتزم بحماية بياناتهم',
      policyPoint1: 'يتم استخدام المعلومات الشخصية فقط لغرض معالجة الطلبات والتواصل مع العميل',
      policyPoint2: 'لا يتم مشاركة أو بيع بيانات العملاء لأي طرف ثالث',
      policyPoint3: 'يتم تأمين بيانات الدفع باستخدام وسائل حماية مناسبة',
      contactUs: 'التواصل معنا',
      contactIntro: 'في حال وجود أي استفسار أو شكوى، يمكنكم التواصل معنا عبر: خدمة العملاء - واتساب / اتصال (حسب بيانات المتجر)',
      alwaysHappyToServe: 'نحن دائماً سعداء بخدمتكم',
      contactAddress: 'الكويت، الشويخ الصناعية',
      cookies: 'ملفات تعريف الارتباط',
      cookiesNote: 'للمزيد من المعلومات حول استخدام ملفات تعريف الارتباط، يرجى الاطلاع على ',
      cookiePolicy: 'سياسة ملفات تعريف الارتباط',
      backToHome: 'العودة للرئيسية'
    },
    en: {
      privacySecurity: 'Privacy & Security',
      privacyPolicy: 'Privacy Policy',
      lastUpdated: 'Last updated:',
      introduction: 'Introduction',
      privacyIntro: 'We respect the privacy of our customers and are committed to protecting their data',
      policyPoint1: 'Personal information is used only for the purpose of processing orders and communicating with the customer',
      policyPoint2: 'Customer data is not shared or sold to any third party',
      policyPoint3: 'Payment data is secured using appropriate protection methods',
      contactUs: 'Contact Us',
      contactIntro: 'In case of any inquiry or complaint, you can contact us via: Customer Service - WhatsApp / Call (according to store data)',
      alwaysHappyToServe: 'We are always happy to serve you',
      contactAddress: 'Kuwait, Shuwaikh Industrial',
      cookies: 'Cookies',
      cookiesNote: 'For more information about our use of cookies, please see our ',
      cookiePolicy: 'Cookie Policy',
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
