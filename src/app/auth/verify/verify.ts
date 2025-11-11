import { Component, inject, signal, OnInit } from '@angular/core';
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
export class VerifyComponent implements OnInit {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  isResending = signal(false);
  email = signal('');
  
  verifyForm: FormGroup;

  constructor() {
    this.verifyForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  ngOnInit() {
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
          this.toastService.success('Account Verified', 'Your account has been verified successfully');
          this.router.navigate(['/auth/login']);
        } else {
          this.toastService.error('Verification Failed', response.message);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error('Verification Failed', 'Invalid OTP. Please try again.');
        console.error('Verification error:', error);
      }
    });
  }

  resendVerification() {
    const email = this.verifyForm.get('email')?.value;
    if (!email) {
      this.toastService.error('Error', 'Email is required');
      return;
    }

    this.isResending.set(true);
    const resendDto: ResendVerificationDto = { email };

    this.authService.resendVerification(resendDto).subscribe({
      next: (response) => {
        this.isResending.set(false);
        if (response.success) {
          this.toastService.success('OTP Resent', 'Please check your email for the new OTP');
        } else {
          this.toastService.error('Failed', response.message);
        }
      },
      error: (error) => {
        this.isResending.set(false);
        this.toastService.error('Failed', 'Could not resend verification code');
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
      if (control.hasError('required')) return `${fieldName} is required`;
      if (control.hasError('email')) return 'Valid email is required';
      if (control.hasError('pattern')) return 'Please enter a valid 6-digit OTP';
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
