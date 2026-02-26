import { Component, inject, signal, OnInit, effect } from '@angular/core';
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
export class StepperComponent implements OnInit {
  private stepperService = inject(ServiceStepper);
  private lastStep?: StepperStep;

  constructor() {
    effect(() => {
      const step = this.currentStep();

      // Scroll only when user moves between steps (avoid initial jump).
      if (this.lastStep !== undefined && this.lastStep !== step) {
        this.scrollToTop();
      }

      this.lastStep = step;
    });
  }
  
  ngOnInit(): void {
    // Always restart checkout from step 1 when entering checkout
    this.stepperService.startFromFirstStep();
  }
  
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
    // Use the stepper service's validation method
    return this.stepperService.isStepComplete(this.currentStep());
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

  private scrollToTop(): void {
    // Let Angular render the next step content, then scroll.
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 0);
  }
}

