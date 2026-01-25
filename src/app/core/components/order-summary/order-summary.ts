import { Component, computed, input, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartItem } from '../../../Models/order';
import { CartService } from '../../service/cart-service';
import { ServiceAuth } from '../../../auth/service-auth';
import { ServiceStepper } from '../../stepper/service-stepper';
import { CreateAddressDto, UserAddressDto } from '../../Models/shipping';
import { OrderCreateDto, ShippingAddressCreateDto } from '../../../admin/order/order.models';
import { environment } from '../../../../environments/environment.development';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css'
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private cartService = inject(CartService);
  private authService = inject(ServiceAuth);
  private stepperService = inject(ServiceStepper);
  private http = inject(HttpClient);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  isCreatingOrder = signal<boolean>(false);

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      orderSummary: 'ملخص الطلب',
      items: 'العناصر',
      estimatedTax: 'الضريبة المقدرة',
      discount: 'الخصم',
      deliveryFee: 'رسوم التوصيل',
      total: 'الإجمالي',
      checkout: 'إتمام الطلب',
      cartEmpty: 'سلة التسوق فارغة.',
      guestCheckoutPrompt: 'هل تريد تسجيل الدخول قبل إتمام الطلب؟',
      guestCheckoutWarning: 'قد تفقد بياناتك إذا تابعت كزائر.',
      guestCheckoutTitle: 'إتمام الشراء كزائر',
      login: 'تسجيل الدخول',
      continueAsGuest: 'متابعة كزائر',
      warningTitle: 'تنبيه',
      warningMessage: 'قد تفقد بياناتك إذا تابعت كزائر.',
      guestDetailsTitle: 'بيانات الشحن للزائر',
      fullName: 'الاسم الكامل',
      phoneNumber: 'رقم الجوال',
      addressLine1: 'العنوان الأول',
      addressLine2Optional: 'العنوان الثاني (اختياري)',
      city: 'المنطقة',
      state: 'المحافظة',
      postalCode: 'الرمز البريدي',
      country: 'الدولة',
      cancel: 'إلغاء',
      proceedToCheckout: 'متابعة لإتمام الطلب',
      requiredFields: 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.',
      back: 'رجوع',
      selectCity: 'اختر المنطقة',
      selectState: 'اختر المحافظة'
    },
    en: {
      orderSummary: 'Order summary',
      items: 'Items',
      estimatedTax: 'Estimated tax',
      discount: 'Discount',
      deliveryFee: 'Delivery Fee',
      total: 'Total',
      checkout: 'Checkout',
      cartEmpty: 'Your cart is empty.',
      guestCheckoutPrompt: 'Would you like to sign in before checkout?',
      guestCheckoutWarning: 'Continuing as a guest may cause you to lose your data.',
      guestCheckoutTitle: 'Guest Checkout',
      login: 'Sign in',
      continueAsGuest: 'Continue as guest',
      warningTitle: 'Warning',
      warningMessage: 'Continuing as a guest may cause you to lose your data.',
      guestDetailsTitle: 'Guest Shipping Details',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      addressLine1: 'Address Line 1',
      addressLine2Optional: 'Address Line 2 (Optional)',
      city: 'Area',
      state: 'Governorate',
      postalCode: 'Postal Code',
      country: 'Country',
      cancel: 'Cancel',
      proceedToCheckout: 'Proceed to checkout',
      requiredFields: 'Please fill in all required fields correctly.',
      back: 'Back',
      selectCity: 'Select Area',
      selectState: 'Select Governorate'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }
 
  showGuestLoginModal = signal(false);
  showGuestWarningModal = signal(false);
  showGuestDetailsModal = signal(false);
  guestFormSubmitted = signal(false);

  guestForm: CreateAddressDto = {
    fullName: '',
    addressLine1: '',
    addressLine2: null,
    city: '',
    state: '',
    postalCode: '0000',
    country: 'Kuwait',
    phoneNumber: '',
    isDefault: true,
    alQataa: null,
    alSharee: null,
    alJada: null,
    alManzil: null,
    alDor: null,
    alShakka: null
  };

  kuwaitAreas: { [key: string]: string[] } = {
    'محافظة العاصمة': [
      'مدينة الكويت', 'دسمان', 'شرق', 'الصوابر', 'المرقاب', 'القبلة', 'الصالحية', 'بنيد القار', 'الدسمة',
      'الدوحة', 'الشامية', 'الشويخ', 'الصليبيخات', 'الروضة', 'الخالدية', 'العديلية', 'القادسية',
      'الفيحاء', 'النزهة', 'قرطبة', 'غرناطة', 'مدينة جابر الأحمد'
    ],
    'محافظة حولي': [
      'حولي', 'السالمية', 'الجابرية', 'مشرف', 'بيان', 'الرميثية', 'سلوى', 'الشعب', 'البدع',
      'النقرة', 'الصديق', 'السلام', 'الزهراء', 'حطين', 'سعد العبدالله'
    ],
    'محافظة الفروانية': [
      'الفروانية', 'خيطان', 'جليب الشيوخ', 'أشبيلية', 'الأندلس', 'العباسية', 'الرابية', 'العمرية',
      'العارضية', 'الرحاب', 'الرقعي', 'الفردوس', 'ضاحية صباح الناصر', 'ضاحية عبدالله المبارك'
    ],
    'محافظة الجهراء': [
      'الجهراء', 'الواحة', 'القصر', 'النعيم', 'العيون', 'النسيم', 'تيماء', 'أمغرة', 'الصليبية',
      'المطلاع', 'العبدلي', 'السالمي', 'سعد العبدالله'
    ],
    'محافظة الأحمدي': [
      'الأحمدي', 'الفحيحيل', 'المنقف', 'المهبولة', 'الرقة', 'الصباحية', 'الفنطاس', 'أبو حليفة',
      'ميناء عبدالله', 'الزور', 'الخيران', 'الوفرة', 'مدينة صباح الأحمد'
    ],
    'محافظة مبارك الكبير': [
      'مبارك الكبير', 'صباح السالم', 'العدان', 'القرين', 'القصور', 'المسايل',
      'الفنطيس', 'أبو فطيرة', 'صبحان'
    ]
  };
  states = Object.keys(this.kuwaitAreas);

  goToCheckout(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/checkout']);
      return;
    }
    this.showGuestLoginModal.set(true);
  }

  onLoginChoice(shouldLogin: boolean): void {
    this.showGuestLoginModal.set(false);
    if (shouldLogin) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.showGuestWarningModal.set(true);
  }

  onGuestWarningContinue(): void {
    this.showGuestWarningModal.set(false);
    this.prefillGuestForm();
    this.showGuestDetailsModal.set(true);
  }

  closeGuestDetails(): void {
    this.showGuestDetailsModal.set(false);
    this.guestFormSubmitted.set(false);
  }

  async submitGuestDetails(): Promise<void> {
    this.guestFormSubmitted.set(true);
    this.normalizePhoneNumber();
    if (!this.isGuestFormValid()) {
      return;
    }
    await this.createOrderFromGuest();
  }

  isGuestFormValid(): boolean {
    const phoneValid = /^[0-9]{9}$/.test(this.guestForm.phoneNumber || '');
    return !!(
      this.guestForm.fullName &&
      this.guestForm.addressLine1 &&
      this.guestForm.city &&
      this.guestForm.state &&
      phoneValid
    );
  }

  onPhoneChange(value: string): void {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
    this.guestForm.phoneNumber = digitsOnly;
  }

  onPhoneKeyPress(event: KeyboardEvent): boolean {
    const char = String.fromCharCode(event.which);
    if (!/[0-9]/.test(char)) {
      event.preventDefault();
      return false;
    }
    const currentValue = (event.target as HTMLInputElement).value;
    if (currentValue.length >= 9) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  private normalizePhoneNumber(): void {
    this.guestForm.phoneNumber = (this.guestForm.phoneNumber || '')
      .replace(/\D/g, '')
      .slice(0, 9);
  }

  private async createOrderFromGuest(): Promise<void> {
    const cartItems = this.cartService.getCartItems();
    if (cartItems.length === 0) {
      console.error('Cart is empty');
      return;
    }

    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      selectedVariants: item.selectedVariants
    }));

    const shippingAddress: ShippingAddressCreateDto = {
      fullName: this.guestForm.fullName.trim(),
      phone: this.guestForm.phoneNumber.trim(),
      street: this.guestForm.addressLine1.trim() + (this.guestForm.addressLine2 ? `, ${this.guestForm.addressLine2.trim()}` : ''),
      city: this.guestForm.city.trim(),
      state: this.guestForm.state || null,
      postalCode: this.guestForm.postalCode,
      country: this.guestForm.country
    };

    const appliedCoupon = this.cartService.getAppliedCoupon();
    const couponCode = appliedCoupon?.code || null;

    const orderDto: OrderCreateDto = {
      items: orderItems,
      shippingAddress,
      couponCode
    };

    this.isCreatingOrder.set(true);
    try {
      await this.http.post<any>(`${environment.apiUrl}Orders`, orderDto).toPromise();
      this.cartService.clearCart();
      this.stepperService.reset();
      this.closeGuestDetails();
      await this.router.navigate(['/checkout/success']);
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      this.isCreatingOrder.set(false);
    }
  }

  getFilteredCities(): string[] {
    const selectedState = this.guestForm.state;
    if (selectedState && this.kuwaitAreas[selectedState]) {
      return this.kuwaitAreas[selectedState];
    }
    return [];
  }

  onStateChange(): void {
    const filteredCities = this.getFilteredCities();
    if (this.guestForm.city && !filteredCities.includes(this.guestForm.city)) {
      this.guestForm.city = '';
    }
  }

  private prefillGuestForm(): void {
    const existingAddress = this.stepperService.checkoutData().address;
    if (existingAddress) {
      this.guestForm = {
        fullName: existingAddress.fullName,
        addressLine1: existingAddress.addressLine1,
        addressLine2: existingAddress.addressLine2,
        city: existingAddress.city,
        state: existingAddress.state,
        postalCode: existingAddress.postalCode || '0000',
        country: existingAddress.country || 'Kuwait',
        phoneNumber: existingAddress.phoneNumber,
        isDefault: true,
        alQataa: existingAddress.alQataa,
        alSharee: existingAddress.alSharee,
        alJada: existingAddress.alJada,
        alManzil: existingAddress.alManzil,
        alDor: existingAddress.alDor,
        alShakka: existingAddress.alShakka
      };
    }
  }

  private calculateDeliveryFee(city: string | null | undefined): number {
    if (!city) return 2;
    const highFeeCities = ['الخيران', 'العبدلي', 'الوفرة', 'مدينة صباح الأحمد'];
    const mediumFeeCity = ['صباح السالم', 'الأحمدي'];
    const mediumHighFeeCity = 'المطلاع';

    if (highFeeCities.includes(city)) {
      return 6;
    }
    if (mediumFeeCity.includes(city)) {
      return 3;
    }
    if (city === mediumHighFeeCity) {
      return 4;
    }
    return 2;
  }

  ngOnInit() {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
        }
      }
    });

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
  // Input for cart items
  cartItems = input<CartItem[]>([]);
  
  // Computed values
  subtotal = computed(() => 
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );
  
  itemCount = computed(() => 
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );
  
  tax = computed(() => 0); // Tax set to zero
  
  // Coupon-related computed values
  discountAmount = computed(() => this.cartService.getDiscountAmount());
  hasAppliedCoupon = computed(() => this.cartService.hasAppliedCoupon());
  
  total = computed(() => {
    const baseTotal = this.hasAppliedCoupon() ? this.cartService.getTotalPriceWithDiscount() : this.subtotal();
    return baseTotal + this.deliveryFee();
  });
  
  // Optional inputs
  showTax = input<boolean>(true);
  showCheckoutButton = input<boolean>(false);
  showEmptyMessage = input<boolean>(true);
  deliveryFee = input<number>(0); // Default delivery fee
}

