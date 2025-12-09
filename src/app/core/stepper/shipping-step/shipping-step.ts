import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ServiceStepper, StepperStep } from '../service-stepper';
import { UserAddressDto, CreateAddressDto, UpdateAddressDto } from '../../Models/shipping';
import { environment } from '../../../../environments/environment.development';

interface ApiResponseDto<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

@Component({
  selector: 'app-shipping-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shipping-step.html',
  styleUrl: './shipping-step.css'
})
export class ShippingStepComponent implements OnInit {
  private stepperService = inject(ServiceStepper);
  private http = inject(HttpClient);
  
  // Loading state
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  
  // Existing addresses
  addresses = signal<UserAddressDto[]>([]);
  
  // Form state
  isCreatingNew = signal<boolean>(true);
  selectedAddressId = signal<number | null>(null);

  // Language / translations
  currentLanguage = signal<'ar' | 'en'>(
    (localStorage.getItem('language') as 'ar' | 'en' | null) ?? 'ar'
  );

  translations = {
    ar: {
      shippingTitle: 'عنوان الشحن',
      editAddressTitle: 'تعديل العنوان',
      newAddressTitle: 'عنوان جديد',
      fullName: 'الاسم الكامل',
      phoneNumber: 'رقم الجوال',
      addressLine1: 'العنوان الأول',
      addressLine2Optional: 'العنوان الثاني (اختياري)',
      city: 'المنطقة',
      state: 'المحافظة',
      postalCode: 'الرمز البريدي',
      country: 'الدولة',
      alQataa: 'القطعة',
      alSharee: 'الشارع',
      alJada: 'الجادة',
      alManzil: 'المنزل',
      alDor: 'الدور',
      alShakka: 'الشقة',
      setAsDefault: 'تعيين كعنوان افتراضي',
      saving: 'جاري الحفظ...',
      updateAddressBtn: 'تحديث العنوان',
      saveAddressBtn: 'حفظ العنوان',
      selectCity: 'اختر المنطقة',
      selectState: 'اختر المحافظة',
    },
    en: {
      shippingTitle: 'Shipping Address',
      editAddressTitle: 'Edit Address',
      newAddressTitle: 'New Address',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      addressLine1: 'Address Line 1',
      addressLine2Optional: 'Address Line 2 (Optional)',
      city: 'Area',
      state: 'Governorate',
      postalCode: 'Postal Code',
      country: 'Country',
      alQataa: 'District/Block',
      alSharee: 'Street',
      alJada: 'Avenue',
      alManzil: 'House',
      alDor: 'Floor',
      alShakka: 'Apartment',
      setAsDefault: 'Set as default address',
      saving: 'Saving...',
      updateAddressBtn: 'Update Address',
      saveAddressBtn: 'Save Address',
      selectCity: 'Select Area',
      selectState: 'Select Governorate',
    },
  } as const;

  // Kuwait areas by governorate
  kuwaitAreas: { [key: string]: string[] } = {
    "محافظة العاصمة": [
      "مدينة الكويت", "دسمان", "شرق", "الصوابر", "المرقاب", "القبلة", "الصالحية", "بنيد القار", "الدسمة",
      "الدوحة", "الشامية", "الشويخ", "الصليبيخات", "الروضة", "الخالدية", "العديلية", "القادسية",
      "الفيحاء", "النزهة", "قرطبة", "غرناطة", "مدينة جابر الأحمد"
    ],
    "محافظة حولي": [
      "حولي", "السالمية", "الجابرية", "مشرف", "بيان", "الرميثية", "سلوى", "الشعب", "البدع",
      "النقرة", "الصديق", "السلام", "الزهراء", "حطين", "سعد العبدالله"
    ],
    "محافظة الفروانية": [
      "الفروانية", "خيطان", "جليب الشيوخ", "أشبيلية", "الأندلس", "العباسية", "الرابية", "العمرية",
      "العارضية", "الرحاب", "الرقعي", "الفردوس", "ضاحية صباح الناصر", "ضاحية عبدالله المبارك"
    ],
    "محافظة الجهراء": [
      "الجهراء", "الواحة", "القصر", "النعيم", "العيون", "النسيم", "تيماء", "أمغرة", "الصليبية",
      "المطلاع", "العبدلي", "السالمي", "سعد العبدالله"
    ],
    "محافظة الأحمدي": [
      "الأحمدي", "الفحيحيل", "المنقف", "المهبولة", "الرقة", "الصباحية", "الفنطاس", "أبو حليفة",
      "ميناء عبدالله", "الزور", "الخيران", "الوفرة", "مدينة صباح الأحمد"
    ],
    "محافظة مبارك الكبير": [
      "مبارك الكبير", "صباح السالم", "العدان", "القرين", "القصور", "المسايل",
      "الفنطيس", "أبو فطيرة", "صبحان"
    ]
  };
  // Kuwait governorates (المحافظة)
  states = Object.keys(this.kuwaitAreas);

  // Get filtered cities based on selected state
  getFilteredCities(): string[] {
    const selectedState = this.formData.state;
    if (selectedState && this.kuwaitAreas[selectedState]) {
      return this.kuwaitAreas[selectedState];
    }
    return [];
  }

  // Handle state change - reset city if it's not in the new state's cities
  onStateChange() {
    const filteredCities = this.getFilteredCities();
    if (this.formData.city && !filteredCities.includes(this.formData.city)) {
      this.formData.city = '';
      this.updateDeliveryFee();
    }
  }

  // Calculate delivery fee based on city
  calculateDeliveryFee(city: string | null | undefined): number {
    if (!city) return 2; // Default fee
    
    const highFeeCities = ['الأحمدي', 'الخيران', 'العبدلي', 'الوفرة'];
    const mediumFeeCity = 'صباح السالم';
    const mediumHighFeeCity = 'المطلاع';
    
    if (highFeeCities.includes(city)) {
      return 6;
    } else if (city === mediumFeeCity) {
      return 3;
    } else if (city === mediumHighFeeCity) {
      return 4;
    }
    
    return 2; // Default fee for all other cities
  }

  // Update delivery fee in checkout data
  updateDeliveryFee() {
    const deliveryFee = this.calculateDeliveryFee(this.formData.city);
    this.stepperService.updateCheckoutData({ deliveryFee });
  }

  // Handle city change
  onCityChange() {
    this.updateDeliveryFee();
  }

  t(key: keyof typeof this.translations.ar): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key] ?? key;
  }
  
  // Form data
  formData: CreateAddressDto = {
    fullName: '',
    addressLine1: '',
    addressLine2: null,
    city: '',
    state: '',
    postalCode: '',
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
  
  async ngOnInit() {
    await this.loadAddresses();
    this.checkExistingData();
    // Initialize delivery fee if city is already set
    if (this.formData.city) {
      this.updateDeliveryFee();
    }
  }
  
  async loadAddresses() {
    this.isLoading.set(true);
    try {
      const response = await this.http.get<ApiResponseDto<UserAddressDto[]>>(
        `${environment.apiUrl}Auth/addresses`
      ).toPromise();
      
      if (response?.success && response.data) {
        this.addresses.set(response.data);

        // If user already has at least one address, use it for update (no multiple addresses)
        if (response.data.length > 0) {
          const selected =
            response.data.find(a => a.isDefault) ?? response.data[0];

          this.selectedAddressId.set(selected.id);
          this.isCreatingNew.set(false);

          this.formData = {
            fullName: selected.fullName,
            addressLine1: selected.addressLine1,
            addressLine2: selected.addressLine2,
            city: selected.city,
            state: selected.state,
            postalCode: selected.postalCode,
            country: selected.country,
            phoneNumber: selected.phoneNumber,
            isDefault: selected.isDefault,
            alQataa: selected.alQataa,
            alSharee: selected.alSharee,
            alJada: selected.alJada,
            alManzil: selected.alManzil,
            alDor: selected.alDor,
            alShakka: selected.alShakka
          };

          // Sync with stepper data so payment step has the latest address
          const deliveryFee = this.calculateDeliveryFee(selected.city);
          this.stepperService.updateCheckoutData({
            address: selected,
            selectedAddressId: selected.id,
            deliveryFee
          });
        } else {
          // No address yet → allow creating a new one
          this.isCreatingNew.set(true);
          this.selectedAddressId.set(null);
          this.formData = {
            fullName: '',
            addressLine1: '',
            addressLine2: null,
            city: '',
            state: '',
            postalCode: '',
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
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  checkExistingData() {
    // Only fall back to stepper data if API did not return any address
    const data = this.stepperService.checkoutData();
    if (!this.addresses().length && data.address) {
      this.isCreatingNew.set(false);
      this.selectedAddressId.set((data.address as any).id ?? null);
      this.formData = {
        fullName: data.address.fullName,
        addressLine1: data.address.addressLine1,
        addressLine2: data.address.addressLine2,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
        country: data.address.country,
        phoneNumber: data.address.phoneNumber,
        isDefault: data.address.isDefault,
        alQataa: (data.address as any).alQataa || null,
        alSharee: (data.address as any).alSharee || null,
        alJada: (data.address as any).alJada || null,
        alManzil: (data.address as any).alManzil || null,
        alDor: (data.address as any).alDor || null,
        alShakka: (data.address as any).alShakka || null
      };
      
      // Update delivery fee for existing address
      const deliveryFee = this.calculateDeliveryFee(data.address.city);
      this.stepperService.updateCheckoutData({ deliveryFee });
    }
  }
  
  selectAddress(address: UserAddressDto) {
    this.selectedAddressId.set(address.id);
    this.isCreatingNew.set(false);
    const deliveryFee = this.calculateDeliveryFee(address.city);
    this.stepperService.updateCheckoutData({
      address,
      selectedAddressId: address.id,
      deliveryFee
    });
  }
  
  startCreatingNew() {
    this.isCreatingNew.set(true);
    this.selectedAddressId.set(null);
    this.formData = {
      fullName: '',
      addressLine1: '',
      addressLine2: null,
      city: '',
      state: '',
      postalCode: '',
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
  }
  
  startEditing(address: UserAddressDto) {
    this.isCreatingNew.set(false);
    this.selectedAddressId.set(address.id);
    this.formData = {
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      isDefault: address.isDefault,
      alQataa: address.alQataa,
      alSharee: address.alSharee,
      alJada: address.alJada,
      alManzil: address.alManzil,
      alDor: address.alDor,
      alShakka: address.alShakka
    };
  }
  
  async saveAddress() {
    if (!this.isFormValid()) {
      return;
    }
    
    this.isSubmitting.set(true);
    try {
      if (this.selectedAddressId()) {
        // Update existing address
        const updateDto: UpdateAddressDto = {
          id: this.selectedAddressId()!,
          ...this.formData
        };
        
        const response = await this.http.put<ApiResponseDto<UserAddressDto>>(
          `${environment.apiUrl}Auth/addresses`,
          updateDto
        ).toPromise();
        
        if (response?.success && response.data) {
          // Reload addresses
          await this.loadAddresses();
          
          // Update stepper data
          const deliveryFee = this.calculateDeliveryFee(response.data.city);
          this.stepperService.updateCheckoutData({
            address: response.data,
            updateAddressDto: updateDto,
            selectedAddressId: response.data.id,
            deliveryFee
          });
        }
      } else {
        // Create new address
        const response = await this.http.post<ApiResponseDto<UserAddressDto>>(
          `${environment.apiUrl}Auth/addresses`,
          this.formData
        ).toPromise();
        
        if (response?.success && response.data) {
          // Reload addresses
          await this.loadAddresses();
          
          // Update stepper data
          const deliveryFee = this.calculateDeliveryFee(response.data.city);
          this.stepperService.updateCheckoutData({
            address: response.data,
            createAddressDto: this.formData,
            selectedAddressId: response.data.id,
            deliveryFee
          });
          
          this.selectedAddressId.set(response.data.id);
          this.isCreatingNew.set(false);
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
  
  isFormValid(): boolean {
    return !!(
      this.formData.fullName &&
      this.formData.addressLine1 &&
      this.formData.city &&
      this.formData.state &&
      this.formData.postalCode &&
      this.formData.country &&
      this.formData.phoneNumber
    );
  }
  
  canProceed(): boolean {
    // Always update delivery fee before checking if can proceed
    if (this.formData.city) {
      this.updateDeliveryFee();
    }
    
    if (this.selectedAddressId()) {
      const data = this.stepperService.checkoutData();
      return !!(data.address || data.selectedAddressId);
    }
    return false;
  }
  
  // Method to ensure delivery fee is updated before proceeding
  prepareForNextStep(): void {
    if (this.formData.city) {
      this.updateDeliveryFee();
    }
  }
}

