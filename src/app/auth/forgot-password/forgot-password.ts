import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { ForgotPasswordDto } from '../auth.models';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ToastComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  isEmailSent = signal(false);

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Titles & descriptions
      resetPasswordTitle: 'إعادة تعيين كلمة المرور',
      resetPasswordSubtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رمزاً لإعادة تعيين كلمة المرور',
      checkEmailTitle: 'تحقق من بريدك الإلكتروني',
      checkEmailText: 'لقد أرسلنا تعليمات إعادة تعيين كلمة المرور إلى:',
      didntReceiveEmail: 'لم يصلك البريد؟',
      tryAgain: 'حاول مرة أخرى',
      // Fields
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      // Buttons
      sending: 'جاري الإرسال...',
      sendResetCode: 'إرسال رمز إعادة التعيين',
      backToLogin: 'العودة لتسجيل الدخول',
      // Toasts
      emailSentTitle: 'تم إرسال البريد الإلكتروني',
      emailSentMessage: 'يرجى التحقق من بريدك للحصول على تعليمات إعادة تعيين كلمة المرور',
      failedTitle: 'فشل الطلب',
      failedGeneric: 'تعذر معالجة طلبك',
      // Validation
      emailRequired: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح'
    },
    en: {
      // Titles & descriptions
      resetPasswordTitle: 'Reset Password',
      resetPasswordSubtitle: "Enter your email and we'll send you a code to reset your password",
      checkEmailTitle: 'Check Your Email',
      checkEmailText: "We've sent password reset instructions to:",
      didntReceiveEmail: "Didn't receive the email?",
      tryAgain: 'Try Again',
      // Fields
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      // Buttons
      sending: 'Sending...',
      sendResetCode: 'Send Reset Code',
      backToLogin: 'Back to Login',
      // Toasts
      emailSentTitle: 'Email Sent',
      emailSentMessage: 'Please check your email for password reset instructions',
      failedTitle: 'Failed',
      failedGeneric: 'Could not process your request',
      // Validation
      emailRequired: 'Email is required',
      emailInvalid: 'Valid email is required'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }
  
  forgotPasswordForm: FormGroup;

  constructor() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    // Listen for language changes from localStorage (when changed in navbar)
    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
        }
      }
    });

    // Also check periodically for language changes (for same-window updates)
    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const forgotPasswordDto: ForgotPasswordDto = this.forgotPasswordForm.value;

    this.authService.forgotPassword(forgotPasswordDto).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.isEmailSent.set(true);
          this.toastService.success(
            this.t('emailSentTitle'),
            this.t('emailSentMessage')
          );
        } else {
          this.toastService.error(
            this.t('failedTitle'),
            response.message || this.t('failedGeneric')
          );
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(
          this.t('failedTitle'),
          this.t('failedGeneric')
        );
        console.error('Forgot password error:', error);
      }
    });
  }

  get emailValue(): string {
    return this.forgotPasswordForm.get('email')?.value || '';
  }

  backToLogin() {
    this.router.navigate(['/auth/login']);
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      this.forgotPasswordForm.get(key)?.markAsTouched();
    });
  }

  getError(fieldName: string): string | null {
    const control = this.forgotPasswordForm.get(fieldName);
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) {
        if (fieldName === 'email') return this.t('emailRequired');
      }
      if (control.hasError('email')) return this.t('emailInvalid');
    }
    return null;
  }

  // Toast methods
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
