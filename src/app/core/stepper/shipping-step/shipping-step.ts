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
  
  // Form data
  formData: CreateAddressDto = {
    fullName: '',
    addressLine1: '',
    addressLine2: null,
    city: '',
    state: '',
    postalCode: '',
    country: 'Saudi Arabia',
    phoneNumber: '',
    isDefault: true
  };
  
  async ngOnInit() {
    await this.loadAddresses();
    this.checkExistingData();
  }
  
  async loadAddresses() {
    this.isLoading.set(true);
    try {
      const response = await this.http.get<ApiResponseDto<UserAddressDto[]>>(
        `${environment.apiUrl}Auth/addresses`
      ).toPromise();
      
      if (response?.success && response.data) {
        this.addresses.set(response.data);
        
        // Check if there's a default address
        const defaultAddress = response.data.find(a => a.isDefault);
        if (defaultAddress) {
          this.selectedAddressId.set(defaultAddress.id);
          this.isCreatingNew.set(false);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  checkExistingData() {
    const data = this.stepperService.checkoutData();
    if (data.address) {
      this.isCreatingNew.set(false);
      this.formData = {
        fullName: data.address.fullName,
        addressLine1: data.address.addressLine1,
        addressLine2: data.address.addressLine2,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
        country: data.address.country,
        phoneNumber: data.address.phoneNumber,
        isDefault: data.address.isDefault
      };
    }
  }
  
  selectAddress(address: UserAddressDto) {
    this.selectedAddressId.set(address.id);
    this.isCreatingNew.set(false);
    this.stepperService.updateCheckoutData({
      address,
      selectedAddressId: address.id
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
      country: 'Saudi Arabia',
      phoneNumber: '',
      isDefault: true
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
      isDefault: address.isDefault
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
          this.stepperService.updateCheckoutData({
            address: response.data,
            updateAddressDto: updateDto,
            selectedAddressId: response.data.id
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
          this.stepperService.updateCheckoutData({
            address: response.data,
            createAddressDto: this.formData,
            selectedAddressId: response.data.id
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
    if (this.selectedAddressId()) {
      const data = this.stepperService.checkoutData();
      return !!(data.address || data.selectedAddressId);
    }
    return false;
  }
}

