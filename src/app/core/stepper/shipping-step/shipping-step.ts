import { Component, computed, effect, inject, OnInit, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ServiceStepper } from '../service-stepper';
import { UserAddressDto, CreateAddressDto, UpdateAddressDto } from '../../Models/shipping';
import { environment } from '../../../../environments/environment.development';
import { CartService } from '../../service/cart-service';
import { ServiceAuth } from '../../../auth/service-auth';
import { ADDRESS_DETAIL_FIELDS, createAddressForm, isShippingAddressValid, toAddressPayload } from '../shipping-address';
import { AddressAutocompleteComponent } from '../../components/address-autocomplete/address-autocomplete';
import { AddressLocation } from '../../data/kuwait-areas';
import { ShippingService } from '../../service/shipping.service';

interface AddressResponse<T> {
  success: boolean;
  data?: T;
}

@Component({
  selector: 'app-shipping-step',
  standalone: true,
  imports: [CommonModule, FormsModule, AddressAutocompleteComponent],
  templateUrl: './shipping-step.html',
  styleUrl: './shipping-step.css'
})
export class ShippingStepComponent implements OnInit {
  private stepperService = inject(ServiceStepper);
  private http = inject(HttpClient);
  private cartService = inject(CartService);
  private authService = inject(ServiceAuth);
  private shippingService = inject(ShippingService);
  shippingReady = signal(false);
  submitted = output<void>();
  isLoading = signal(false);
  isSubmitting = signal(false);
  error = signal('');
  selectedAddressId = signal<number | null>(null);
  private formRevision = signal(0);
  currentLanguage = signal<'ar' | 'en'>(localStorage.getItem('language') === 'en' ? 'en' : 'ar');
  formData: CreateAddressDto = createAddressForm();

  readonly optionalFields = ADDRESS_DETAIL_FIELDS;
  readonly deliveryFee = computed(() => {
    this.formRevision();
    return this.calculateDeliveryFee(this.formData.city);
  });

  constructor() {
    effect(() => {
      const deliveryFee = this.deliveryFee();
      untracked(() => this.stepperService.updateCheckoutData({ deliveryFee: deliveryFee ?? undefined }));
    });
  }

  translations = {
    ar: {
      shippingTitle: 'بيانات التوصيل', fullName: 'الاسم', phoneNumber: 'رقم الجوال',
      addressLine1: 'العنوان الأول', alQataa: 'القطعة', alSharee: 'الشارع', alJada: 'الجادة',
      alManzil: 'المنزل', alDor: 'الدور', alShakka: 'الشقة',
      phoneHint: 'أدخل رقم جوال صحيحاً من 8 إلى 15 رقماً.',
      failedToLoad: 'تعذر تحميل بيانات التوصيل. يرجى إعادة تحميل الصفحة للمحاولة مجدداً.',
      failedToSave: 'تعذر حفظ العنوان. يرجى المحاولة مجدداً.',
    },
    en: {
      shippingTitle: 'Delivery details', fullName: 'Name', phoneNumber: 'Mobile number',
      addressLine1: 'Address line 1', alQataa: 'Block', alSharee: 'Street', alJada: 'Avenue',
      alManzil: 'House', alDor: 'Floor', alShakka: 'Apartment',
      phoneHint: 'Enter a valid mobile number with 8 to 15 digits.',
      failedToLoad: 'Unable to load delivery details. Please reload the page to try again.',
      failedToSave: 'Unable to save your address. Please try again.',
    },
  } as const;

  t(key: keyof typeof this.translations.ar): string {
    return this.translations[this.currentLanguage()][key];
  }

  async ngOnInit(): Promise<void> {
    const saved = this.stepperService.checkoutData().address;
    if (saved) this.populateAddress(saved);
    this.isLoading.set(true);
    try {
      const [, response] = await Promise.all([
        firstValueFrom(this.shippingService.load()),
        this.authService.isAuthenticated ? firstValueFrom(this.http.get<AddressResponse<UserAddressDto[]>>(
        `${environment.apiUrl}Auth/addresses`
        )) : Promise.resolve(null),
      ]);
      if (response) {
        if (!response.success || !response.data) throw new Error('Unable to load addresses');
        const savedId = this.stepperService.checkoutData().selectedAddressId;
        const selected = response.data.find(address => address.id === savedId)
          ?? response.data.find(address => address.isDefault) ?? response.data[0];
        if (selected) this.populateAddress(selected);
      }
      this.shippingReady.set(true);
      this.updateDeliveryFee();
    } catch {
      this.error.set(this.t('failedToLoad'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private populateAddress(address: UserAddressDto): void {
    this.formData = createAddressForm(address);
    this.formChanged();
    this.selectedAddressId.set(address.id || null);
    this.stepperService.updateCheckoutData({ address, selectedAddressId: address.id || undefined });
    this.updateDeliveryFee();
  }

  calculateDeliveryFee(city?: string | null): number | null {
    const subtotal = this.cartService.getCartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
    return this.shippingService.calculateFee(subtotal, city,
      this.cartService.hasAppliedCoupon() && this.cartService.getAppliedCoupon()?.type === 3);
  }

  updateDeliveryFee(): void {
    this.stepperService.updateCheckoutData({ deliveryFee: this.calculateDeliveryFee(this.formData.city) ?? undefined });
  }

  isFormValid(): boolean {
    this.formRevision();
    return isShippingAddressValid(this.formData);
  }

  onAddressLocationChange(location: AddressLocation): void {
    Object.assign(this.formData, location);
    this.formChanged();
    this.updateDeliveryFee();
  }

  formChanged(): void {
    this.formRevision.update(revision => revision + 1);
  }

  async saveAddress(): Promise<boolean> {
    if (!this.isFormValid() || this.isLoading() || this.isSubmitting()) return false;
    this.error.set('');
    const payload = toAddressPayload(this.formData);
    if (!this.authService.isAuthenticated) {
      this.populateAddress({ ...payload, id: 0, createdAt: '', updatedAt: '' });
      return true;
    }

    this.isSubmitting.set(true);
    try {
      const id = this.selectedAddressId();
      const updateDto: UpdateAddressDto | undefined = id ? { ...payload, id } : undefined;
      const request = updateDto
        ? this.http.put<AddressResponse<UserAddressDto>>(`${environment.apiUrl}Auth/addresses`, updateDto)
        : this.http.post<AddressResponse<UserAddressDto>>(`${environment.apiUrl}Auth/addresses`, payload);
      const response = await firstValueFrom(request);
      if (!response.success || !response.data) throw new Error('Unable to save address');
      this.populateAddress(response.data);
      this.stepperService.updateCheckoutData({
        createAddressDto: updateDto ? undefined : payload,
        updateAddressDto: updateDto,
      });
      return true;
    } catch {
      this.error.set(this.t('failedToSave'));
      return false;
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
