import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { VerifyAccountDto, ResendVerificationDto } from '../auth.models';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ToastComponent],
  templateUrl: './verify.html',
  styleUrl: './verify.css'
})
export class VerifyComponent implements OnInit, OnDestroy {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  isResending = signal(false);
  email = signal('');

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Titles & descriptions
      verifyAccountTitle: 'تأكيد حسابك',
      verifyAccountSubtitle: 'يرجى إدخال رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني',
      verificationCodeSentTo: 'تم إرسال رمز التحقق إلى:',
      didntReceiveCode: 'لم يصلك الرمز؟',
      // Fields
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      verificationCodeLabel: 'رمز التحقق',
      verificationCodePlaceholder: '000000',
      // Buttons
      verifying: 'جاري التحقق...',
      verifyAccountButton: 'تأكيد الحساب',
      resendCodeButton: 'إعادة إرسال الرمز',
      backToLogin: 'العودة لتسجيل الدخول',
      // Toasts
      verifySuccessTitle: 'تم تأكيد الحساب',
      verifySuccessMessage: 'تم تأكيد حسابك بنجاح',
      verifyFailedTitle: 'فشل التحقق',
      verifyFailedInvalidOtp: 'رمز التحقق غير صحيح، حاول مرة أخرى.',
      resendSuccessTitle: 'تمت إعادة إرسال الرمز',
      resendSuccessMessage: 'يرجى التحقق من بريدك الإلكتروني للرمز الجديد',
      resendFailedTitle: 'فشل',
      resendFailedGeneric: 'تعذر إعادة إرسال رمز التحقق',
      errorTitle: 'خطأ',
      emailRequired: 'البريد الإلكتروني مطلوب',
      // Validation
      emailRequiredValidation: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح',
      otpInvalid: 'يرجى إدخال رمز تحقق مكون من 6 أرقام'
    },
    en: {
      // Titles & descriptions
      verifyAccountTitle: 'Verify Your Account',
      verifyAccountSubtitle: 'Please enter the 6-digit code sent to your email',
      verificationCodeSentTo: 'Verification code sent to:',
      didntReceiveCode: "Didn't receive the code?",
      // Fields
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      verificationCodeLabel: 'Verification Code',
      verificationCodePlaceholder: '000000',
      // Buttons
      verifying: 'Verifying...',
      verifyAccountButton: 'Verify Account',
      resendCodeButton: 'Resend Code',
      backToLogin: 'Back to Login',
      // Toasts
      verifySuccessTitle: 'Account Verified',
      verifySuccessMessage: 'Your account has been verified successfully',
      verifyFailedTitle: 'Verification Failed',
      verifyFailedInvalidOtp: 'Invalid OTP. Please try again.',
      resendSuccessTitle: 'OTP Resent',
      resendSuccessMessage: 'Please check your email for the new OTP',
      resendFailedTitle: 'Failed',
      resendFailedGeneric: 'Could not resend verification code',
      errorTitle: 'Error',
      emailRequired: 'Email is required',
      // Validation
      emailRequiredValidation: 'Email is required',
      emailInvalid: 'Valid email is required',
      otpInvalid: 'Please enter a valid 6-digit OTP'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }
  
  verifyForm: FormGroup;

  constructor() {
    this.verifyForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  ngOnInit() {
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

    // Get email from query params
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email.set(params['email']);
        this.verifyForm.patchValue({ email: params['email'] });
      }
    });
  }

  onSubmit() {
    if (this.verifyForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const verifyDto: VerifyAccountDto = this.verifyForm.value;

    this.authService.verifyAccount(verifyDto).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.toastService.success(
            this.t('verifySuccessTitle'),
            this.t('verifySuccessMessage')
          );
          this.router.navigate(['/auth/login']);
        } else {
          this.toastService.error(
            this.t('verifyFailedTitle'),
            response.message || this.t('verifyFailedInvalidOtp')
          );
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(
          this.t('verifyFailedTitle'),
          this.t('verifyFailedInvalidOtp')
        );
        console.error('Verification error:', error);
      }
    });
  }

  resendVerification() {
    const email = this.verifyForm.get('email')?.value;
    if (!email) {
      this.toastService.error(
        this.t('errorTitle'),
        this.t('emailRequired')
      );
      return;
    }

    this.isResending.set(true);
    const resendDto: ResendVerificationDto = { email };

    this.authService.resendVerification(resendDto).subscribe({
      next: (response) => {
        this.isResending.set(false);
        if (response.success) {
          this.toastService.success(
            this.t('resendSuccessTitle'),
            this.t('resendSuccessMessage')
          );
        } else {
          this.toastService.error(
            this.t('resendFailedTitle'),
            response.message || this.t('resendFailedGeneric')
          );
        }
      },
      error: (error) => {
        this.isResending.set(false);
        this.toastService.error(
          this.t('resendFailedTitle'),
          this.t('resendFailedGeneric')
        );
        console.error('Resend error:', error);
      }
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.verifyForm.controls).forEach(key => {
      this.verifyForm.get(key)?.markAsTouched();
    });
  }

  getError(fieldName: string): string | null {
    const control = this.verifyForm.get(fieldName);
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) {
        if (fieldName === 'email') return this.t('emailRequiredValidation');
        if (fieldName === 'otp') return this.t('otpInvalid');
      }
      if (control.hasError('email')) return this.t('emailInvalid');
      if (control.hasError('pattern')) return this.t('otpInvalid');
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  // Toast methods
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
