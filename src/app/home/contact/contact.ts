import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { ContactService } from './contact.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact implements OnInit, OnDestroy {
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  private contactService = inject(ContactService);

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
      required: '*',
      errorOccurred: 'حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة مرة أخرى.',
      invalidData: 'البيانات المدخلة غير صحيحة. يرجى التحقق من جميع الحقول.',
      networkError: 'خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
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
      required: '*',
      errorOccurred: 'An error occurred while sending your message. Please try again.',
      invalidData: 'Invalid input data. Please check all fields.',
      networkError: 'Network error. Please check your internet connection and try again.'
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
  errorMessage = signal<string | null>(null);

  // Contact information
  contactInfo = {
    address: 'Damascus, Syria',
    phone: '+963 11 123 4567',
    email: 'info@aljawhara.com',
    workingHours: 'Sunday - Thursday: 9:00 AM - 6:00 PM'
  };

  // Social media links
  socialLinks = [
    { name: 'Instagram', icon: '📷', url: 'https://www.instagram.com/aljawhara_plus?igsh=aWpwNDdpd3Q3OWRy&utm_source=qr' }
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
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    
    // Map form data to backend DTO
    const contactDto = {
      name: this.formData.name.trim(),
      email: this.formData.email.trim(),
      phoneNumber: this.formData.phone?.trim() || undefined,
      subject: this.formData.subject,
      message: this.formData.message.trim()
    };

    this.contactService.sendContactMessage(contactDto)
      .pipe(
        catchError(error => {
          console.error('Contact form error:', error);
          
          let errorMsg = this.t('errorOccurred');
          
          if (error.error) {
            // Backend validation errors
            if (error.error.errors && Array.isArray(error.error.errors) && error.error.errors.length > 0) {
              errorMsg = error.error.errors.join(', ');
            } else if (error.error.message) {
              errorMsg = error.error.message;
            } else if (error.status === 400) {
              errorMsg = this.t('invalidData');
            } else if (error.status === 0 || error.status >= 500) {
              errorMsg = this.t('networkError');
            }
          } else if (error.status === 0) {
            errorMsg = this.t('networkError');
          }
          
          this.errorMessage.set(errorMsg);
          this.isSubmitting.set(false);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
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
              this.errorMessage.set(null);
            }, 3000);
          } else {
            this.errorMessage.set(response.message || this.t('errorOccurred'));
            this.isSubmitting.set(false);
          }
        },
        error: () => {
          // Error already handled in catchError
          this.isSubmitting.set(false);
        }
      });
  }
}

