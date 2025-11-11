import { Component, inject, signal } from '@angular/core';
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
export class LoginComponent {
  private authService = inject(ServiceAuth);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private formBuilder = inject(FormBuilder);

  isLoading = signal(false);
  showPassword = signal(false);
  
  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
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
          this.toastService.success('Welcome Back!', 'Successfully logged in');
          
          // Redirect based on user role or to home
          this.router.navigate(['/']);
        } else {
          this.toastService.error('Login Failed', response.message);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.error('Login Failed', 'Invalid email or password');
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
      if (control.hasError('required')) return `${fieldName} is required`;
      if (control.hasError('email')) return 'Valid email is required';
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
