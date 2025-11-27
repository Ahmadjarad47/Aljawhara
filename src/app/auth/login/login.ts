import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { LoginDto, LoginResponseDto } from '../auth.models';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ToastComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  showPassword = signal(false);

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Titles & descriptions
      welcomeBackTitle: 'مرحباً بك مجدداً',
      welcomeBackSubtitle: 'قم بتسجيل الدخول إلى حسابك للمتابعة',
      // Fields
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور',
      rememberMe: 'تذكرني',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      // Buttons
      signingIn: 'جاري تسجيل الدخول...',
      signIn: 'تسجيل الدخول',
      dontHaveAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
      // Toasts
      loginSuccessTitle: 'مرحباً بعودتك!',
      loginSuccessMessage: 'تم تسجيل الدخول بنجاح',
      loginFailedTitle: 'فشل تسجيل الدخول',
      loginFailedInvalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      loginFailedGeneric: 'حدث خطأ أثناء تسجيل الدخول',
      // Validation
      emailRequired: 'البريد الإلكتروني مطلوب',
      passwordRequired: 'كلمة المرور مطلوبة',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح'
    },
    en: {
      // Titles & descriptions
      welcomeBackTitle: 'Welcome Back',
      welcomeBackSubtitle: 'Sign in to your account to continue',
      // Fields
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      // Buttons
      signingIn: 'Signing in...',
      signIn: 'Sign In',
      dontHaveAccount: "Don't have an account?",
      signUp: 'Sign Up',
      // Toasts
      loginSuccessTitle: 'Welcome Back!',
      loginSuccessMessage: 'Successfully logged in',
      loginFailedTitle: 'Login Failed',
      loginFailedInvalid: 'Invalid email or password',
      loginFailedGeneric: 'An error occurred while logging in',
      // Validation
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      emailInvalid: 'Valid email is required'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }

  // Map backend Identity error messages for login to localized messages
  private translateAuthError(message: string | null | undefined): string {
    if (!message) return this.t('loginFailedGeneric');

    const lang = this.currentLanguage();
    // Keep original message when language is EN
    if (lang === 'en') {
      return message;
    }

    const msg = message.toLowerCase();

    // Common ASP.NET Identity login errors
    if (msg.includes('invalid login attempt')) {
      return this.t('loginFailedInvalid');
    }

    if (msg.includes('user name') && msg.includes('is not allowed')) {
      return 'اسم المستخدم غير مسموح به';
    }

    if (msg.includes('user') && msg.includes('locked out')) {
      return 'تم قفل حساب المستخدم مؤقتاً بسبب محاولات تسجيل دخول فاشلة متكررة';
    }

    if (msg.includes('email') && msg.includes('is not confirmed')) {
      return 'لم يتم تأكيد البريد الإلكتروني بعد، يرجى التحقق من بريدك الإلكتروني';
    }

    if (msg.includes('user') && msg.includes('does not exist')) {
      return 'لا يوجد حساب مرتبط بهذه البيانات';
    }

    // Fallback to generic invalid login in Arabic
    if (lang === 'ar') {
      return this.t('loginFailedInvalid');
    }

    return message;
  }
  
  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
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
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const loginDto: LoginDto = this.loginForm.value;

    this.authService.login(loginDto).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.toastService.success(
            this.t('loginSuccessTitle'),
            this.t('loginSuccessMessage')
          );
          
          // Redirect based on user role or to home
          this.router.navigate(['/']);
        } else {
          this.toastService.error(
            this.t('loginFailedTitle'),
            this.translateAuthError(response.message)
          );
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(
          this.t('loginFailedTitle'),
          this.t('loginFailedInvalid')
        );
        console.error('Login error:', error);
      }
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  getError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) {
        if (fieldName === 'email') return this.t('emailRequired');
        if (fieldName === 'password') return this.t('passwordRequired');
      }
      if (control.hasError('email')) return this.t('emailInvalid');
    }
    return null;
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  // Toast methods
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
