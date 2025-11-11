import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceStepper, StepperStep } from './service-stepper';
import { ShippingStepComponent } from './shipping-step/shipping-step';
import { ReviewStepComponent } from './review-step/review-step';
import { PaymentStepComponent } from './payment-step/payment-step';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [
    CommonModule,
    ShippingStepComponent,
    ReviewStepComponent,
    PaymentStepComponent
  ],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
})
export class StepperComponent {
  private stepperService = inject(ServiceStepper);
  
  currentStep = this.stepperService.currentStep;
  
  getProgress(): number {
    return this.stepperService.getProgress();
  }
  
  nextStep(): void {
    this.stepperService.nextStep();
  }
  
  previousStep(): void {
    this.stepperService.previousStep();
  }
  
  canProceed(): boolean {
    const data = this.stepperService.checkoutData();
    // Check if current step data is complete
    if (this.currentStep() === StepperStep.SHIPPING) {
      return !!(data.address || data.createAddressDto || data.selectedAddressId);
    }
    if (this.currentStep() === StepperStep.REVIEW) {
      return true;
    }
    return false;
  }
  
  getNextStepName(): string {
    if (this.currentStep() === StepperStep.SHIPPING) {
      return 'Review';
    }
    if (this.currentStep() === StepperStep.REVIEW) {
      return 'Payment';
    }
    return '';
  }
}

