import { Component, OnDestroy, OnInit, inject, signal, HostListener } from '@angular/core';
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
  isCountryDropdownOpen = signal(false);

  // Country codes with flags
  countries = [
  
    { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  
  ];

  selectedCountry = signal(this.countries[0]); // Default to US

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
      phonePlaceholder: '123-456-7890',
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
      phoneInvalid: 'يجب إدخال رقم هاتف صحيح (10 أرقام)',
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
      phonePlaceholder: '123-456-7890',
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
      phoneInvalid: 'Please enter a valid phone number (10 digits)',
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

    const description = error;
    const msg = description.toLowerCase();

    // ===== نفس منطق IdentityErrorTranslator في الباكند (TranslateByPattern) =====

    // Password length: "at least X characters"
    if (msg.includes('at least') && msg.includes('characters')) {
      const match = description.match(/at least\s+(\d+)\s+characters?/i);
      if (match && match[1]) {
        return `كلمة المرور يجب أن تكون على الأقل ${match[1]} أحرف`;
      }
    }

    // Password requirements
    if (msg.includes('digit')) {
      return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
    }
    if (msg.includes('lowercase')) {
      return 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل';
    }
    if (msg.includes('uppercase')) {
      return 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل';
    }
    if (msg.includes('non alphanumeric') || msg.includes('special')) {
      return 'كلمة المرور يجب أن تحتوي على حرف خاص واحد على الأقل';
    }

    // Duplicate / already taken errors
    // خاص بالرسالة: "User with this email already exists"
    if (msg.includes('email') && msg.includes('already exists')) {
      return 'البريد الإلكتروني مستخدم بالفعل';
    }

    if (msg.includes('already taken') || msg.includes('is already taken') || msg.includes('already in use')) {
      if (msg.includes('email')) {
        return 'البريد الإلكتروني مستخدم بالفعل';
      }
      if (msg.includes('user name') || msg.includes('username') || msg.includes('user')) {
        return 'اسم المستخدم مستخدم بالفعل';
      }
      return 'هذه البيانات مستخدمة بالفعل';
    }

    // Invalid errors
    if (msg.includes('invalid')) {
      if (msg.includes('email')) {
        return 'البريد الإلكتروني غير صحيح';
      }
      if (msg.includes('token')) {
        return 'رمز التحقق غير صحيح';
      }
      if (msg.includes('password')) {
        return 'كلمة المرور غير صحيحة';
      }
    }

    // ===== رسائل تحقق حقول النموذج (ModelState) =====
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

    // Fallback: return original error for AR (أفضل من لا شيء)
    return description;
  }

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      countryCode: [this.selectedCountry().code, [Validators.required]],
      phoneNumber: ['', [Validators.required, this.phoneNumberValidator()]],
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

  phoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required validator handle empty values
      }
      const digitsOnly = control.value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return { phoneInvalid: true };
      }
      return null;
    };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isLoading.set(true);
    const formValue = this.registerForm.value;
    // Combine country code and phone number
    const fullPhoneNumber = `${formValue.countryCode}${formValue.phoneNumber.replace(/-/g, '')}`;
    const registerDto: RegisterDto = {
      ...formValue,
      phoneNumber: fullPhoneNumber
    };

    this.authService.register(registerDto).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);

        if (response.success) {
          this.toastService.success(
            this.t('registerSuccessTitle'),
            this.t('registerSuccessMessage')
          );
          this.router.navigate(['/auth/verify'], { queryParams: { email: registerDto.email } });
        } else {
          const rawMessage = response.message || this.t('registerFailedGeneric');
          const translated = this.translateServerError(rawMessage);

          this.toastService.error(
            this.t('registerFailedTitle'),
            translated
          );

          // حاول وضع الرسالة تحت الحقل المناسب إذا كان الرد عام فقط مثل: "Username is already taken"
          this.applyFieldErrorFromMessage(rawMessage);

          if (Array.isArray(response.errors) && response.errors.length) {
            this.setErrorsFromResponse(response.errors);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);

        const apiError = error?.error;
        const rawMessage =
          (apiError && apiError.message) ||
          error?.message ||
          this.t('registerFailedGeneric');
        const translated = this.translateServerError(rawMessage);

        this.toastService.error(
          this.t('registerFailedTitle'),
          translated
        );

        // حاول أيضاً ربط الرسالة بحقل معيّن إن أمكن
        this.applyFieldErrorFromMessage(rawMessage);

        if (apiError && Array.isArray(apiError.errors) && apiError.errors.length) {
          this.setErrorsFromResponse(apiError.errors);
        }
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

  // يحاول استنتاج الحقل من رسالة عامة من السيرفر مثل "Username is already taken"
  private applyFieldErrorFromMessage(message: string) {
    if (!message) return;

    const msg = message.toLowerCase();
    const translated = this.translateServerError(message);

    if (msg.includes('user name') || msg.includes('username')) {
      this.registerForm.get('username')?.setErrors({ serverError: translated });
      return;
    }

    if (msg.includes('email')) {
      this.registerForm.get('email')?.setErrors({ serverError: translated });
      return;
    }

    if (msg.includes('phone')) {
      this.registerForm.get('phoneNumber')?.setErrors({ serverError: translated });
      return;
    }

    if (msg.includes('password')) {
      this.registerForm.get('password')?.setErrors({ serverError: translated });
    }
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
      if ((control.hasError('pattern') || control.hasError('phoneInvalid')) && fieldName === 'phoneNumber') {
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

  // Format phone number as user types (123-456-7890)
  onPhoneNumberInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit to 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    
    // Format as XXX-XXX-XXXX
    let formatted = '';
    if (value.length > 6) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
    } else if (value.length > 3) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else {
      formatted = value;
    }
    
    // Update input value directly
    input.value = formatted;
    
    // Update form control
    this.registerForm.patchValue({ phoneNumber: formatted }, { emitEvent: true });
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

  selectCountry(country: typeof this.countries[0]) {
    this.selectedCountry.set(country);
    this.registerForm.patchValue({ countryCode: country.code });
    this.isCountryDropdownOpen.set(false);
  }

  toggleCountryDropdown() {
    this.isCountryDropdownOpen.set(!this.isCountryDropdownOpen());
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.country-selector')) {
      this.isCountryDropdownOpen.set(false);
    }
  }
}
