import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { ResetPasswordDto } from '../auth.models';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ToastComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Titles & descriptions
      resetPasswordTitle: 'إعادة تعيين كلمة المرور',
      resetPasswordSubtitle: 'أدخل بريدك الإلكتروني، ورمز التحقق، وكلمة المرور الجديدة',
      // Fields
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      verificationCodeLabel: 'رمز التحقق',
      verificationCodePlaceholder: '000000',
      newPasswordLabel: 'كلمة المرور الجديدة',
      newPasswordPlaceholder: 'أدخل كلمة المرور الجديدة',
      confirmNewPasswordLabel: 'تأكيد كلمة المرور الجديدة',
      confirmNewPasswordPlaceholder: 'أعد إدخال كلمة المرور الجديدة',
      // Buttons
      resetting: 'جاري إعادة التعيين...',
      resetPasswordButton: 'إعادة تعيين كلمة المرور',
      backToLogin: 'العودة لتسجيل الدخول',
      // Toasts
      resetSuccessTitle: 'تمت إعادة تعيين كلمة المرور',
      resetSuccessMessage: 'تمت إعادة تعيين كلمة المرور بنجاح',
      resetFailedTitle: 'فشل إعادة التعيين',
      resetFailedGeneric: 'تعذر إعادة تعيين كلمة المرور',
      // Validation
      emailRequired: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح',
      otpRequired: 'رمز التحقق مطلوب',
      otpInvalid: 'يرجى إدخال رمز تحقق مكون من 6 أرقام',
      newPasswordRequired: 'كلمة المرور الجديدة مطلوبة',
      newPasswordMinLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      confirmNewPasswordRequired: 'تأكيد كلمة المرور الجديدة مطلوب',
      invalidLength: 'الطول غير صالح',
      passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين'
    },
    en: {
      // Titles & descriptions
      resetPasswordTitle: 'Reset Password',
      resetPasswordSubtitle: 'Enter your email, verification code, and new password',
      // Fields
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      verificationCodeLabel: 'Verification Code',
      verificationCodePlaceholder: '000000',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Enter new password',
      confirmNewPasswordLabel: 'Confirm New Password',
      confirmNewPasswordPlaceholder: 'Confirm new password',
      // Buttons
      resetting: 'Resetting...',
      resetPasswordButton: 'Reset Password',
      backToLogin: 'Back to Login',
      // Toasts
      resetSuccessTitle: 'Password Reset',
      resetSuccessMessage: 'Your password has been reset successfully',
      resetFailedTitle: 'Reset Failed',
      resetFailedGeneric: 'Could not reset your password',
      // Validation
      emailRequired: 'Email is required',
      emailInvalid: 'Valid email is required',
      otpRequired: 'OTP is required',
      otpInvalid: 'Please enter a valid 6-digit OTP',
      newPasswordRequired: 'New password is required',
      newPasswordMinLength: 'Password must be at least 6 characters',
      confirmNewPasswordRequired: 'Confirm new password is required',
      invalidLength: 'Invalid length',
      passwordsDoNotMatch: 'Passwords do not match'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }
  
  resetPasswordForm: FormGroup;

  constructor() {
    this.resetPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator()
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

    // Extract token and userId from URL query parameters
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userId = params['userId'];
      
      if (token) {
        // Pre-fill the OTP field with the token from URL
        this.resetPasswordForm.patchValue({
          otp: token
        });
      }
      
      // Store userId if needed (can be used for API calls or validation)
      if (userId) {
        // You can store userId in a property if needed for the API call
        // For now, we'll just extract it from the URL
      }
    });
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const newPassword = control.get('newPassword');
      const confirmNewPassword = control.get('confirmNewPassword');
      
      if (!newPassword || !confirmNewPassword) {
        return null;
      }
      
      return newPassword.value === confirmNewPassword.value ? null : { passwordMismatch: true };
    };
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const resetPasswordDto: ResetPasswordDto = {
      email: this.resetPasswordForm.get('email')?.value,
      otp: this.resetPasswordForm.get('otp')?.value,
      newPassword: this.resetPasswordForm.get('newPassword')?.value,
      confirmNewPassword: ''
    };

    this.authService.resetPassword(resetPasswordDto).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.toastService.success(
            this.t('resetSuccessTitle'),
            this.t('resetSuccessMessage')
          );
          this.router.navigate(['/auth/login']);
        } else {
          this.toastService.error(
            this.t('resetFailedTitle'),
            response.message || this.t('resetFailedGeneric')
          );
          if (response.errors) {
            this.setErrorsFromResponse(response.errors);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(
          this.t('resetFailedTitle'),
          this.t('resetFailedGeneric')
        );
        console.error('Reset password error:', error);
      }
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      this.resetPasswordForm.get(key)?.markAsTouched();
    });
  }

  private setErrorsFromResponse(errors: string[]) {
    errors.forEach((error: string) => {
      const match = error.match(/^(\w+):\s*(.+)$/);
      if (match) {
        this.resetPasswordForm.get(match[1])?.setErrors({ serverError: match[2] });
      }
    });
  }

  getError(fieldName: string): string | null {
    const control = this.resetPasswordForm.get(fieldName);
    if (control?.hasError('serverError')) {
      return control.getError('serverError');
    }
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) {
        if (fieldName === 'email') return this.t('emailRequired');
        if (fieldName === 'otp') return this.t('otpRequired');
        if (fieldName === 'newPassword') return this.t('newPasswordRequired');
        if (fieldName === 'confirmNewPassword') return this.t('confirmNewPasswordRequired');
      }
      if (control.hasError('email')) return this.t('emailInvalid');
      if (control.hasError('pattern')) return this.t('otpInvalid');
      if (control.hasError('minlength')) {
        return fieldName === 'newPassword'
          ? this.t('newPasswordMinLength')
          : this.t('invalidLength');
      }
    }
    return null;
  }

  get isPasswordMismatch(): boolean {
    return this.resetPasswordForm.hasError('passwordMismatch') && 
           this.resetPasswordForm.get('confirmNewPassword')?.touched &&
           this.resetPasswordForm.get('confirmNewPassword')?.value;
  }

  // Toast methods
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
