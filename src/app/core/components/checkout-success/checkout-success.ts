import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.css'
})
export class CheckoutSuccessComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  private paymentCallbackHandled = false;
  private paymentCallbackUrl = `${environment.apiUrl.replace(/\/?$/, '/')}Transactions/payment-callback`;
  private readonly onStorage = (e: StorageEvent) => {
    if (e.key === 'language' && e.newValue) {
      const newLang = e.newValue as 'ar' | 'en';
      if (newLang === 'ar' || newLang === 'en') {
        this.currentLanguage.set(newLang);
      }
    }
  };

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');
  paymentUpdateState = signal<'idle' | 'updating' | 'updated' | 'failed'>('idle');
  paymentUpdateMessage = signal('');

  // Translations object
  translations = {
    ar: {
      orderPlacedSuccessfully: 'تم إتمام الطلب بنجاح!',
      thankYouPurchase: 'شكراً لك على الشراء. تم استلام طلبك وهو قيد المعالجة.',
      continueShopping: 'متابعة التسوق',
      viewMyOrders: 'عرض طلباتي',
      nextStepsTitle: 'الخطوات التالية',
      nextStepProcessing: 'جارٍ تجهيز طلبك الآن.',
      nextStepConfirmation: 'ستصلك رسالة تأكيد عند تحديث حالة الطلب.',
      nextStepOrders: 'يمكنك متابعة طلباتك من صفحة طلباتي.',
      needHelp: 'تحتاج مساعدة؟',
      paymentUpdateProcessing: 'جارٍ التحقق من حالة الدفع...',
      paymentUpdateSuccess: 'تم تحديث حالة الدفع بنجاح.',
      paymentUpdateFailed: 'تعذر تحديث حالة الدفع. يرجى التواصل مع الدعم.'
    },
    en: {
      orderPlacedSuccessfully: 'Order Placed Successfully!',
      thankYouPurchase: 'Thank you for your purchase. Your order has been received and is being processed.',
      continueShopping: 'Continue Shopping',
      viewMyOrders: 'View My Orders',
      nextStepsTitle: 'What happens next?',
      nextStepProcessing: 'We’re preparing your order now.',
      nextStepConfirmation: 'You’ll receive a confirmation when the order status updates.',
      nextStepOrders: 'You can track your order anytime from My Orders.',
      needHelp: 'Need help?',
      paymentUpdateProcessing: 'Verifying payment status...',
      paymentUpdateSuccess: 'Payment status was updated successfully.',
      paymentUpdateFailed: 'Could not update payment status. Please contact support.'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
  
  goHome() {
    this.router.navigate(['/']);
  }

  ngOnInit() {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', this.onStorage);

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const invoiceIdRaw = params['invoice_id'];
      const paymentRaw = params['payment'];

      if (!invoiceIdRaw || !paymentRaw || this.paymentCallbackHandled) {
        return;
      }

      const invoiceId = Number(invoiceIdRaw);
      const payment = String(paymentRaw);

      if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
        this.paymentUpdateState.set('failed');
        this.paymentUpdateMessage.set(this.t('paymentUpdateFailed'));
        return;
      }

      if (payment.toLowerCase() !== 'success') {
        this.paymentUpdateState.set('failed');
        this.paymentUpdateMessage.set(this.t('paymentUpdateFailed'));
        return;
      }

      this.paymentCallbackHandled = true;
      this.paymentUpdateState.set('updating');

      const paramsObj = new HttpParams()
        .set('invoice_id', String(invoiceId))
        .set('payment', payment);

      this.http.get<{ updated?: boolean; message?: string }>(this.paymentCallbackUrl, { params: paramsObj }).subscribe({
        next: (response) => {
          if (response?.updated) {
            this.paymentUpdateState.set('updated');
            this.paymentUpdateMessage.set(response.message || this.t('paymentUpdateSuccess'));
            return;
          }

          this.paymentUpdateState.set('failed');
          this.paymentUpdateMessage.set(response?.message || this.t('paymentUpdateFailed'));
        },
        error: (error) => {
          this.paymentUpdateState.set('failed');
          this.paymentUpdateMessage.set(error?.error?.message || this.t('paymentUpdateFailed'));
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
    window.removeEventListener('storage', this.onStorage);
  }
}

