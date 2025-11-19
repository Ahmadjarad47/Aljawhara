import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact implements OnInit, OnDestroy {
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      contactUs: 'اتصل بنا',
      heroDesc: 'نحن هنا للمساعدة! تواصل معنا لأي أسئلة أو استفسارات',
      getInTouch: 'تواصل معنا',
      address: 'العنوان',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      workingHours: 'ساعات العمل',
      followUs: 'تابعنا',
      sendMessage: 'أرسل لنا رسالة',
      thankYou: 'شكراً لك!',
      messageSent: 'تم إرسال رسالتك بنجاح. سنعود إليك قريباً.',
      name: 'الاسم',
      emailLabel: 'البريد الإلكتروني',
      phoneLabel: 'الهاتف',
      subject: 'الموضوع',
      message: 'الرسالة',
      yourName: 'اسمك',
      yourEmail: 'بريدك الإلكتروني',
      yourPhone: 'رقم هاتفك',
      selectSubject: 'اختر موضوعاً',
      generalInquiry: 'استفسار عام',
      technicalSupport: 'الدعم الفني',
      salesQuestion: 'سؤال مبيعات',
      partnership: 'فرصة شراكة',
      other: 'أخرى',
      tellUs: 'أخبرنا كيف يمكننا مساعدتك...',
      sending: 'جاري الإرسال...',
      sendMessageBtn: 'إرسال الرسالة',
      findUsOnMap: 'اعثر علينا على الخريطة',
      mapWillBeDisplayed: 'سيتم عرض الخريطة هنا',
      required: '*'
    },
    en: {
      contactUs: 'Contact Us',
      heroDesc: 'We\'re here to help! Get in touch with us for any questions or concerns',
      getInTouch: 'Get in Touch',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      workingHours: 'Working Hours',
      followUs: 'Follow Us',
      sendMessage: 'Send us a Message',
      thankYou: 'Thank you!',
      messageSent: 'Your message has been sent successfully. We\'ll get back to you soon.',
      name: 'Name',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      subject: 'Subject',
      message: 'Message',
      yourName: 'Your name',
      yourEmail: 'your.email@example.com',
      yourPhone: '+963 11 123 4567',
      selectSubject: 'Select a subject',
      generalInquiry: 'General Inquiry',
      technicalSupport: 'Technical Support',
      salesQuestion: 'Sales Question',
      partnership: 'Partnership Opportunity',
      other: 'Other',
      tellUs: 'Tell us how we can help you...',
      sending: 'Sending...',
      sendMessageBtn: 'Send Message',
      findUsOnMap: 'Find Us on Map',
      mapWillBeDisplayed: 'Map will be displayed here',
      required: '*'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
  // Form state
  formData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  isSubmitting = signal(false);
  isSubmitted = signal(false);

  // Contact information
  contactInfo = {
    address: 'Damascus, Syria',
    phone: '+963 11 123 4567',
    email: 'info@aljawhara.com',
    workingHours: 'Sunday - Thursday: 9:00 AM - 6:00 PM'
  };

  // Social media links
  socialLinks = [
    { name: 'Facebook', icon: '📘', url: 'https://facebook.com/aljawhara' },
    { name: 'Instagram', icon: '📷', url: 'https://instagram.com/aljawhara' },
    { name: 'Twitter', icon: '🐦', url: 'https://twitter.com/aljawhara' },
    { name: 'LinkedIn', icon: '💼', url: 'https://linkedin.com/company/aljawhara' }
  ];

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

  onSubmit() {
    this.isSubmitting.set(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', this.formData);
      this.isSubmitted.set(true);
      this.isSubmitting.set(false);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        this.formData = {
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        };
        this.isSubmitted.set(false);
      }, 3000);
    }, 1000);
  }
}

