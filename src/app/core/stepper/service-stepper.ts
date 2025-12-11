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
  deliveryFee?: number;
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
    
    // Load saved checkout data from localStorage
    const savedData = localStorage.getItem('checkout_data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        this.checkoutData.set(parsedData);
      } catch (error) {
        console.error('Error parsing saved checkout data:', error);
      }
    }
    
    // Save step to localStorage on changes
    effect(() => {
      localStorage.setItem('checkout_step', this.currentStep().toString());
    });
    
    // Save checkout data to localStorage on changes
    effect(() => {
      const data = this.checkoutData();
      if (data && Object.keys(data).length > 0) {
        localStorage.setItem('checkout_data', JSON.stringify(data));
      }
    });
  }
  
  // Navigate to next step
  nextStep(): void {
    const current = this.currentStep();
    // Only allow proceeding if current step is complete
    if (this.isStepComplete(current) && current < this.TOTAL_STEPS) {
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
      // Allow going back to previous steps, but validate before going forward
      if (step <= this.currentStep() || this.isStepComplete(step - 1)) {
        this.currentStep.set(step);
      }
    }
  }
  
  // Check if can go to step
  canGoToStep(step: StepperStep): boolean {
    // Can go to previous steps or next step if current is complete
    if (step <= this.currentStep()) {
      return true;
    }
    return this.isStepComplete(this.currentStep());
  }
  
  // Update checkout data
  updateCheckoutData(data: Partial<CheckoutData>): void {
    const updated = { ...this.checkoutData(), ...data };
    this.checkoutData.set(updated);
    // Persist to localStorage immediately
    localStorage.setItem('checkout_data', JSON.stringify(updated));
  }
  
  // Reset stepper
  reset(): void {
    this.currentStep.set(StepperStep.SHIPPING);
    this.checkoutData.set({});
    localStorage.removeItem('checkout_step');
    localStorage.removeItem('checkout_data');
  }
  
  // Check if step is complete
  isStepComplete(step: StepperStep): boolean {
    const data = this.checkoutData();
    switch (step) {
      case StepperStep.SHIPPING:
        return !!(data.address || data.selectedAddressId);
      case StepperStep.REVIEW:
        return this.isStepComplete(StepperStep.SHIPPING);
      case StepperStep.PAYMENT_TIMING:
        return this.isStepComplete(StepperStep.REVIEW) && !!data.paymentTiming;
      case StepperStep.PAYMENT:
        return this.isStepComplete(StepperStep.PAYMENT_TIMING);
      default:
        return false;
    }
  }
  
  // Get first incomplete step
  getFirstIncompleteStep(): StepperStep {
    for (let step = StepperStep.SHIPPING; step <= StepperStep.PAYMENT; step++) {
      if (!this.isStepComplete(step)) {
        return step;
      }
    }
    return StepperStep.PAYMENT;
  }
  
  // Validate and redirect to first incomplete step if needed
  validateAndRedirect(): void {
    const current = this.currentStep();
    if (!this.isStepComplete(current)) {
      const firstIncomplete = this.getFirstIncompleteStep();
      this.currentStep.set(firstIncomplete);
    }
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
