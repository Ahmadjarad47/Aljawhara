import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast toast-top toast-end">
      @for (toast of toasts; track toast.id) {
        <div class="alert" 
             [class.alert-success]="toast.type === 'success'"
             [class.alert-error]="toast.type === 'error'"
             [class.alert-warning]="toast.type === 'warning'"
             [class.alert-info]="toast.type === 'info'">
          
          <!-- Success Icon -->
          @if (toast.type === 'success') {
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          
          <!-- Error Icon -->
          @if (toast.type === 'error') {
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          
          <!-- Warning Icon -->
          @if (toast.type === 'warning') {
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          
          <!-- Info Icon -->
          @if (toast.type === 'info') {
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          
          <!-- Loading Icon -->
          @if (toast.type === 'loading') {
            <span class="loading loading-spinner loading-sm"></span>
          }
          
          <div class="flex-1">
            <h3 class="font-bold">{{toast.title}}</h3>
            <div class="text-xs">{{toast.message}}</div>
          </div>
          
          <button 
            class="btn btn-sm btn-ghost" 
            (click)="onClose(toast.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast {
      position: fixed;
      z-index: 9999;
    }
  `]
})
export class ToastComponent {
  @Input() toasts: ToastMessage[] = [];
  @Output() close = new EventEmitter<string>();

  onClose(toastId: string): void {
    this.close.emit(toastId);
  }
}
