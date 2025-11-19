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
      informationWeCollect: 'المعلومات التي نجمعها',
      personalInformation: 'المعلومات الشخصية',
      automaticallyCollected: 'المعلومات المجمعة تلقائياً',
      howWeUse: 'كيف نستخدم معلوماتك',
      informationSharing: 'مشاركة المعلومات والإفصاح',
      dataSecurity: 'أمان البيانات',
      yourRights: 'حقوقك',
      cookies: 'ملفات تعريف الارتباط',
      cookiePolicy: 'سياسة ملفات تعريف الارتباط',
      contactUs: 'اتصل بنا',
      backToHome: 'العودة للرئيسية'
    },
    en: {
      privacySecurity: 'Privacy & Security',
      privacyPolicy: 'Privacy Policy',
      lastUpdated: 'Last updated:',
      introduction: 'Introduction',
      informationWeCollect: 'Information We Collect',
      personalInformation: 'Personal Information',
      automaticallyCollected: 'Automatically Collected Information',
      howWeUse: 'How We Use Your Information',
      informationSharing: 'Information Sharing and Disclosure',
      dataSecurity: 'Data Security',
      yourRights: 'Your Rights',
      cookies: 'Cookies',
      cookiePolicy: 'Cookie Policy',
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
