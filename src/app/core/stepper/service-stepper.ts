import { Injectable, signal, effect } from '@angular/core';
import { UserAddressDto, CreateAddressDto, UpdateAddressDto } from '../Models/shipping';

export enum StepperStep {
  SHIPPING = 1,
  REVIEW = 2,
  PAYMENT_TIMING = 3,
  PAYMENT = 4
}

export type PaymentTiming = 'now' | 'on_delivery';

export interface CheckoutData {
  address?: UserAddressDto;
  createAddressDto?: CreateAddressDto;
  updateAddressDto?: UpdateAddressDto;
  selectedAddressId?: number;
  paymentTiming?: PaymentTiming;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceStepper {
  private readonly TOTAL_STEPS = 4;
  
  // Current step signal
  currentStep = signal<StepperStep>(StepperStep.SHIPPING);
  
  // Checkout data
  checkoutData = signal<CheckoutData>({});
  
  // Loading state
  isLoading = signal<boolean>(false);
  
  constructor() {
    // Load saved step from localStorage
    const savedStep = localStorage.getItem('checkout_step');
    if (savedStep) {
      this.currentStep.set(parseInt(savedStep, 10) as StepperStep);
    }
    
    // Save step to localStorage on changes
    effect(() => {
      localStorage.setItem('checkout_step', this.currentStep().toString());
    });
  }
  
  // Navigate to next step
  nextStep(): void {
    const current = this.currentStep();
    if (current < this.TOTAL_STEPS) {
      this.currentStep.set((current + 1) as StepperStep);
    }
  }
  
  // Navigate to previous step
  previousStep(): void {
    const current = this.currentStep();
    if (current > StepperStep.SHIPPING) {
      this.currentStep.set((current - 1) as StepperStep);
    }
  }
  
  // Jump to specific step
  goToStep(step: StepperStep): void {
    if (step >= StepperStep.SHIPPING && step <= StepperStep.PAYMENT) {
      this.currentStep.set(step);
    }
  }
  
  // Check if can go to step
  canGoToStep(step: StepperStep): boolean {
    return step <= this.currentStep() + 1;
  }
  
  // Update checkout data
  updateCheckoutData(data: Partial<CheckoutData>): void {
    this.checkoutData.set({ ...this.checkoutData(), ...data });
  }
  
  // Reset stepper
  reset(): void {
    this.currentStep.set(StepperStep.SHIPPING);
    this.checkoutData.set({});
    localStorage.removeItem('checkout_step');
  }
  
  // Get progress percentage
  getProgress(): number {
    return (this.currentStep() / this.TOTAL_STEPS) * 100;
  }
  
  // Check if is last step
  isLastStep(): boolean {
    return this.currentStep() === StepperStep.PAYMENT;
  }
  
  // Check if is first step
  isFirstStep(): boolean {
    return this.currentStep() === StepperStep.SHIPPING;
  }
}
