import { Component, inject, signal } from '@angular/core';
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
export class RegisterComponent {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  
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
          this.toastService.success('Registration Successful', 'Please check your email for verification');
          this.router.navigate(['/auth/verify'], { queryParams: { email: registerDto.email } });
        } else {
          this.toastService.error('Registration Failed', response.message);
          if (response.errors) {
            this.setErrorsFromResponse(response.errors);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error('Registration Failed', 'An error occurred during registration');
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
        this.registerForm.get(match[1])?.setErrors({ serverError: match[2] });
      }
    });
  }

  getError(fieldName: string): string | null {
    const control = this.registerForm.get(fieldName);
    if (control?.hasError('serverError')) {
      return control.getError('serverError');
    }
    if (control?.touched && control?.invalid) {
      if (control.hasError('required')) return `${fieldName} is required`;
      if (control.hasError('email')) return 'Valid email is required';
      if (control.hasError('minlength')) {
        return fieldName === 'password' ? 'Password must be at least 6 characters' : 'Invalid length';
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
