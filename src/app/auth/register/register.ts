import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { RegisterDto } from '../auth.models';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ToastComponent],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit, OnDestroy {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Translations object - Simple translation system without libraries
  translations = {
    ar: {
      // Titles
      createAccountTitle: 'إنشاء حساب',
      // Fields
      usernameLabel: 'اسم المستخدم',
      usernamePlaceholder: 'أدخل اسم المستخدم',
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      phoneLabel: 'رقم الهاتف',
      phonePlaceholder: 'أدخل رقم هاتفك',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور',
      confirmPasswordLabel: 'تأكيد كلمة المرور',
      confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
      // Buttons
      creatingAccount: 'جاري إنشاء الحساب...',
      createAccount: 'إنشاء حساب',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      login: 'تسجيل الدخول',
      // Toasts
      registerSuccessTitle: 'تم إنشاء الحساب بنجاح',
      registerSuccessMessage: 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب',
      registerFailedTitle: 'فشل إنشاء الحساب',
      registerFailedGeneric: 'حدث خطأ أثناء إنشاء الحساب',
      // Validation
      usernameRequired: 'اسم المستخدم مطلوب',
      emailRequired: 'البريد الإلكتروني مطلوب',
      phoneRequired: 'رقم الهاتف مطلوب',
      passwordRequired: 'كلمة المرور مطلوبة',
      confirmPasswordRequired: 'تأكيد كلمة المرور مطلوب',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح',
      passwordMinLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      invalidLength: 'الطول غير صالح',
      passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين'
    },
    en: {
      // Titles
      createAccountTitle: 'Create Account',
      // Fields
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter your username',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      phoneLabel: 'Phone Number',
      phonePlaceholder: 'Enter your phone number',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm your password',
      // Buttons
      creatingAccount: 'Creating Account...',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      login: 'Login',
      // Toasts
      registerSuccessTitle: 'Registration Successful',
      registerSuccessMessage: 'Please check your email for verification',
      registerFailedTitle: 'Registration Failed',
      registerFailedGeneric: 'An error occurred during registration',
      // Validation
      usernameRequired: 'Username is required',
      emailRequired: 'Email is required',
      phoneRequired: 'Phone number is required',
      passwordRequired: 'Password is required',
      confirmPasswordRequired: 'Confirm password is required',
      emailInvalid: 'Valid email is required',
      passwordMinLength: 'Password must be at least 6 characters',
      invalidLength: 'Invalid length',
      passwordsDoNotMatch: 'Passwords do not match'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }

  // Map backend Identity error messages to localized (mainly Arabic) messages
  private translateServerError(error: string): string {
    if (!error) return error;

    const lang = this.currentLanguage();
    // Keep original English messages when language is EN
    if (lang === 'en') {
      return error;
    }

    const msg = error.toLowerCase();

    // Email / username already taken
    if (msg.includes('is already taken') || msg.includes('already in use')) {
      if (msg.includes('email')) {
        return 'هذا البريد الإلكتروني مستخدم بالفعل';
      }
      if (msg.includes('user name') || msg.includes('username')) {
        return 'اسم المستخدم مستخدم بالفعل';
      }
      return 'هذه البيانات مستخدمة بالفعل';
    }

    // Password rules (Identity default messages)
    if (msg.includes('passwords must be at least')) {
      return 'يجب أن تكون كلمة المرور بطول كافٍ (على الأقل 6 أحرف عادةً)';
    }
    if (msg.includes('passwords must have at least one non alphanumeric character')) {
      return 'يجب أن تحتوي كلمة المرور على رمز واحد على الأقل (مثل ! @ # $ %)';
    }
    if (msg.includes('passwords must have at least one digit')) {
      return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل';
    }
    if (msg.includes('passwords must have at least one lowercase')) {
      return 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل';
    }
    if (msg.includes('passwords must have at least one uppercase')) {
      return 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل';
    }

    // Required / invalid field messages
    if (msg.includes('the email field is required') || msg.includes('email is required')) {
      return this.t('emailRequired');
    }
    if (msg.includes('the user name field is required') || msg.includes('username is required')) {
      return this.t('usernameRequired');
    }
    if (msg.includes('phone') && msg.includes('required')) {
      return this.t('phoneRequired');
    }

    if (msg.includes('invalid email') || msg.includes('email is not valid')) {
      return this.t('emailInvalid');
    }

    // Fallback: return original error for AR (better than nothing)
    return error;
  }
  
  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
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
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }

  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const registerDto: RegisterDto = this.registerForm.value;

    this.authService.register(registerDto).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.toastService.success(
            this.t('registerSuccessTitle'),
            this.t('registerSuccessMessage')
          );
          this.router.navigate(['/auth/verify'], { queryParams: { email: registerDto.email } });
        } else {
          this.toastService.error(
            this.t('registerFailedTitle'),
            response.message ? this.translateServerError(response.message) : this.t('registerFailedGeneric')
          );
          if (response.errors) {
            this.setErrorsFromResponse(response.errors);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error(
          this.t('registerFailedTitle'),
          this.t('registerFailedGeneric')
        );
        console.error('Registration error:', error);
      }
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  private setErrorsFromResponse(errors: string[]) {
    errors.forEach((error: string) => {
      const match = error.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const translated = this.translateServerError(match[2]);
        this.registerForm.get(match[1])?.setErrors({ serverError: translated });
      } else {
        // If error is not in "Field: message" format, show it as general toast (translated)
        const translated = this.translateServerError(error);
        this.toastService.error(this.t('registerFailedTitle'), translated);
      }
    });
  }

  getError(fieldName: string): string | null {
    const control = this.registerForm.get(fieldName);
    if (control?.hasError('serverError')) {
      return control.getError('serverError');
    }
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) {
        if (fieldName === 'username') return this.t('usernameRequired');
        if (fieldName === 'email') return this.t('emailRequired');
        if (fieldName === 'phoneNumber') return this.t('phoneRequired');
        if (fieldName === 'password') return this.t('passwordRequired');
        if (fieldName === 'confirmPassword') return this.t('confirmPasswordRequired');
      }
      if (control.hasError('email')) return this.t('emailInvalid');
      if (control.hasError('minlength')) {
        return fieldName === 'password'
          ? this.t('passwordMinLength')
          : this.t('invalidLength');
      }
    }
    return null;
  }

  get isPasswordMismatch(): boolean {
    return this.registerForm.hasError('passwordMismatch') && 
           this.registerForm.get('confirmPassword')?.touched &&
           this.registerForm.get('confirmPassword')?.value;
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  // Toast methods
  get toasts() {
    return this.toastService.toasts$();
  }

  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
