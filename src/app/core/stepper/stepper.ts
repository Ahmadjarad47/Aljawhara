import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceStepper, StepperStep } from './service-stepper';
import { ShippingStepComponent } from './shipping-step/shipping-step';
import { ReviewStepComponent } from './review-step/review-step';
import { PaymentTimingStepComponent } from './payment-timing-step/payment-timing-step';
import { PaymentStepComponent } from './payment-step/payment-step';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [
    CommonModule,
    ShippingStepComponent,
    ReviewStepComponent,
    PaymentTimingStepComponent,
    PaymentStepComponent
  ],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
})
export class StepperComponent {
  private stepperService = inject(ServiceStepper);
  
  // Language / translations
  currentLanguage = signal<'ar' | 'en'>(
    (localStorage.getItem('language') as 'ar' | 'en' | null) ?? 'ar'
  );

  translations = {
    ar: {
      checkoutTitle: 'إتمام الشراء',
      step: 'الخطوة',
      of: 'من',
      checkoutSubtitle: 'راجع تفاصيلك وأكمل طلبك بأمان.',
      shippingStep: 'الشحن',
      reviewStep: 'مراجعة الطلب',
      paymentTimingStep: 'وقت الدفع',
      paymentStep: 'الدفع',
      previous: 'السابق',
      continueTo: 'متابعة إلى',
    },
    en: {
      checkoutTitle: 'Checkout',
      step: 'Step',
      of: 'of',
      checkoutSubtitle: 'Review your details and place your order securely.',
      shippingStep: 'Shipping',
      reviewStep: 'Review Order',
      paymentTimingStep: 'Payment Timing',
      paymentStep: 'Payment',
      previous: 'Previous',
      continueTo: 'Continue to',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }
  
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
    if (this.currentStep() === StepperStep.PAYMENT_TIMING) {
      return !!data.paymentTiming;
    }
    return false;
  }
  
  getNextStepName(): string {
    if (this.currentStep() === StepperStep.SHIPPING) {
      return this.t('reviewStep');
    }
    if (this.currentStep() === StepperStep.REVIEW) {
      return this.t('paymentTimingStep');
    }
    if (this.currentStep() === StepperStep.PAYMENT_TIMING) {
      return this.t('paymentStep');
    }
    return '';
  }
}

