import { Component, inject, signal } from '@angular/core';
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
export class ForgotPasswordComponent {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  isEmailSent = signal(false);
  
  forgotPasswordForm: FormGroup;

  constructor() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
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
          this.toastService.success('Email Sent', 'Please check your email for password reset instructions');
        } else {
          this.toastService.error('Failed', response.message);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error('Error', 'Could not process your request');
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
      if (control.hasError('required')) return `${fieldName} is required`;
      if (control.hasError('email')) return 'Valid email is required';
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
