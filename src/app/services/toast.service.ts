import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<ToastMessage[]>([]);
  private toastId = 0;

  // Getter for reactive toasts
  get toasts$() {
    return this.toasts.asReadonly();
  }

  // Add a new toast
  private addToast(toast: Omit<ToastMessage, 'id'>): string {
    const id = `toast-${++this.toastId}`;
    const defaultDuration = 5000; // 5 seconds
    const newToast: ToastMessage = {
      id,
      autoClose: true,
      duration: defaultDuration,
      ...toast
    };

    this.toasts.update(current => [...current, newToast]);

    // Auto remove toast after duration
    if (newToast.autoClose && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, newToast.duration);
    }

    return id;
  }

  // Remove a toast
  removeToast(id: string): void {
    this.toasts.update(current => current.filter(toast => toast.id !== id));
  }

  // Clear all toasts
  clearAll(): void {
    this.toasts.set([]);
  }

  // Success toast
  success(title: string, message: string, duration?: number): string {
    return this.addToast({
      type: 'success',
      title,
      message,
      duration: duration || 5000 // 5 seconds
    });
  }

  // Error toast
  error(title: string, message: string, duration?: number): string {
    return this.addToast({
      type: 'error',
      title,
      message,
      duration: duration || 8000 // Longer duration for errors
    });
  }

  // Warning toast
  warning(title: string, message: string, duration?: number): string {
    return this.addToast({
      type: 'warning',
      title,
      message,
      duration: duration || 5000 // 5 seconds
    });
  }

  // Info toast
  info(title: string, message: string, duration?: number): string {
    return this.addToast({
      type: 'info',
      title,
      message,
      duration: duration || 4000 // 4 seconds for info messages
    });
  }

  // Loading toast
  loading(title: string, message: string): string {
    return this.addToast({
      type: 'loading',
      title,
      message,
      autoClose: false,
      duration: 0
    });
  }

  // Update loading toast to success
  updateToSuccess(toastId: string, title: string, message: string): void {
    this.toasts.update(current => 
      current.map(toast => 
        toast.id === toastId 
          ? { ...toast, type: 'success', title, message, autoClose: true, duration: 5000 }
          : toast
      )
    );

    // Auto remove after success
    setTimeout(() => {
      this.removeToast(toastId);
    }, 5000);
  }

  // Update loading toast to error
  updateToError(toastId: string, title: string, message: string): void {
    this.toasts.update(current => 
      current.map(toast => 
        toast.id === toastId 
          ? { ...toast, type: 'error', title, message, autoClose: true, duration: 8000 }
          : toast
      )
    );

    // Auto remove after error
    setTimeout(() => {
      this.removeToast(toastId);
    }, 8000);
  }
}
