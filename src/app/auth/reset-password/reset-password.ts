import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
export class ResetPasswordComponent {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  
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
          this.toastService.success('Password Reset', 'Your password has been reset successfully');
          this.router.navigate(['/auth/login']);
        } else {
          this.toastService.error('Reset Failed', response.message);
          if (response.errors) {
            this.setErrorsFromResponse(response.errors);
          }
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error('Reset Failed', 'Could not reset your password');
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
      if (control.hasError('required')) return `${fieldName} is required`;
      if (control.hasError('email')) return 'Valid email is required';
      if (control.hasError('pattern')) return 'Please enter a valid 6-digit OTP';
      if (control.hasError('minlength')) {
        return fieldName === 'newPassword' ? 'Password must be at least 6 characters' : 'Invalid length';
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
