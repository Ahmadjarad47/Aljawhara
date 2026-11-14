import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ServiceAuth } from '../service-auth';
import { ApiResponseDto, RegisterDto } from '../auth.models';
import { USERNAME_PATTERN, usernameErrorKey } from '../username-validation';
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
      usernameInvalid: 'استخدم حروفاً أو أرقاماً، ويمكنك إضافة مسافة واحدة بين الكلمات أو الرموز ‎- . _ @ +‎.',
      usernameTaken: 'اسم المستخدم مستخدم بالفعل',
      usernameLength: 'اسم المستخدم يجب أن يكون بين 3 و50 حرفاً',
      emailRequired: 'البريد الإلكتروني مطلوب',
      phoneRequired: 'رقم الهاتف مطلوب',
      phoneInvalid: 'يجب إدخال أرقام فقط',
      passwordRequired: 'كلمة المرور مطلوبة',
      confirmPasswordRequired: 'تأكيد كلمة المرور مطلوب',
      emailInvalid: 'يجب إدخال بريد إلكتروني صالح',
      passwordMinLength: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
      passwordDigit: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل',
      passwordLower: 'كلمة المرور يجب أن تحتوي على حرف إنكليزي صغير',
      passwordUpper: 'كلمة المرور يجب أن تحتوي على حرف إنكليزي كبير',
      passwordSpecial: 'كلمة المرور يجب أن تحتوي على رمز خاص',
      passwordInvalid: 'كلمة المرور لا تستوفي الشروط',
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
      usernameInvalid: 'Use letters, digits, single spaces between words, or these symbols: - . _ @ +.',
      usernameTaken: 'This username is already taken',
      usernameLength: 'Username must be between 3 and 50 characters',
      emailRequired: 'Email is required',
      phoneRequired: 'Phone number is required',
      phoneInvalid: 'Only numbers are allowed',
      passwordRequired: 'Password is required',
      confirmPasswordRequired: 'Confirm password is required',
      emailInvalid: 'Valid email is required',
      passwordMinLength: 'Password must be at least 8 characters',
      passwordDigit: 'Password must contain at least one digit',
      passwordLower: 'Password must contain a lowercase English letter',
      passwordUpper: 'Password must contain an uppercase English letter',
      passwordSpecial: 'Password must contain a special character',
      passwordInvalid: 'Password does not meet the requirements',
      invalidLength: 'Invalid length',
      passwordsDoNotMatch: 'Passwords do not match'
    }
  };

  // Helper method to get translation
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof (typeof this.translations)['ar']] || key;
  }

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(USERNAME_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
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
      next: response => {
        this.isLoading.set(false);
        if (!response.success) {
          this.showRegistrationError(response);
          return;
        }
        this.toastService.success(this.t('registerSuccessTitle'), this.t('registerSuccessMessage'));
        this.router.navigate(['/auth/verify'], { queryParams: { email: registerDto.email } });
      },
      error: error => {
        this.isLoading.set(false);
        this.showRegistrationError(error?.error);
      }
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  private showRegistrationError(response?: Partial<Omit<ApiResponseDto, 'errors'>> & { errors?: Record<string, string[]> | string[] }): void {
    const messages: string[] = [];
    const setFieldError = (field: string, codes: string[], localized: boolean) => {
      const control = Object.keys(this.registerForm.controls)
        .find(key => key.toLowerCase() === field.toLowerCase());
      if (!control) return;
      const message = codes.map(code => localized ? this.translateFieldError(control, code) : code)
        .filter(Boolean).join(' ');
      if (!message) return;
      const input = this.registerForm.get(control)!;
      input.setErrors({ ...input.errors, serverError: message });
      messages.push(message);
    };

    for (const [field, codes] of Object.entries(response?.fieldErrors ?? {})) {
      setFieldError(field, codes, true);
    }

    // ASP.NET model validation returns a dictionary of field names and messages.
    if (response?.errors && !Array.isArray(response.errors)) {
      for (const [field, errors] of Object.entries(response.errors)) {
        setFieldError(field, errors, false);
      }
    }

    // Support the older API during deployment without guessing from words like "digits".
    if (messages.length === 0 && response?.message) {
      if (/^(?:registration failed: )?user ?name '.+' is invalid\b/i.test(response.message)) {
        setFieldError('username', ['InvalidUserName'], true);
      } else if (/^username is already taken$/i.test(response.message)) {
        setFieldError('username', ['DuplicateUserName'], true);
      }
    }

    this.toastService.error(this.t('registerFailedTitle'), messages[0] || this.t('registerFailedGeneric'));
  }

  private translateFieldError(field: string, code: string): string {
    if (field === 'username') {
      const key = usernameErrorKey(code);
      return key ? this.t(key) : this.t('usernameInvalid');
    }
    if (field === 'email') return this.t('emailInvalid');
    const passwordKeys: Record<string, string> = {
      PasswordTooShort: 'passwordMinLength',
      PasswordRequiresDigit: 'passwordDigit',
      PasswordRequiresLower: 'passwordLower',
      PasswordRequiresUpper: 'passwordUpper',
      PasswordRequiresNonAlphanumeric: 'passwordSpecial',
    };
    return field === 'password' ? this.t(passwordKeys[code] || 'passwordInvalid') : '';
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
      if (fieldName === 'username') {
        if (control.hasError('minlength') || control.hasError('maxlength')) return this.t('usernameLength');
        if (control.hasError('pattern')) return this.t('usernameInvalid');
      }
      if (control.hasError('pattern') && fieldName === 'phoneNumber') {
        return this.t('phoneInvalid');
      }
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

  // Prevent non-numeric input for phone number
  onPhoneNumberKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow: backspace, delete, tab, escape, enter, and numbers
    if (
      charCode === 8 || // backspace
      charCode === 9 || // tab
      charCode === 27 || // escape
      charCode === 13 || // enter
      charCode === 46 || // delete
      (charCode >= 35 && charCode <= 40) // home, end, left, right, up, down
    ) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if ((charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }
}
