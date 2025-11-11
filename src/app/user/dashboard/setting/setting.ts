import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService } from '../../../services/toast.service';
import { UserResponseDto } from '../../../auth/auth.models';
import { SettingService } from './setting.service';
import { CreateAddressDto, UpdateAddressDto, UserAddressDto } from './setting.models';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './setting.html',
  styleUrl: './setting.css'
})
export class Setting implements OnInit {
  private settingService = inject(SettingService);
  public toastService = inject(ToastService);

  // Tabs
  activeTab = signal<'profile' | 'addresses'>('profile');

  // User
  isLoadingUser = signal(false);
  currentUser = signal<UserResponseDto | null>(null);
  updateUsernameModel: { username: string } = { username: '' };
  updatePhoneModel: { phoneNumber: string } = { phoneNumber: '' };

  // Addresses
  isLoadingAddresses = signal(false);
  addresses = signal<UserAddressDto[]>([]);
  showAddAddress = signal(false);
  showEditAddress = signal(false);
  newAddress: CreateAddressDto = {
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    country: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  };
  editAddress: UpdateAddressDto = {
    id: 0,
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    country: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  };

  ngOnInit(): void {
    this.loadUser();
    this.loadAddresses();
  }

  // User methods
  loadUser() {
    this.isLoadingUser.set(true);
    this.settingService.getCurrentUser().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          this.updateUsernameModel.username = res.data.username;
          this.updatePhoneModel.phoneNumber = res.data.phoneNumber;
        }
        this.isLoadingUser.set(false);
      },
      error: () => {
        this.isLoadingUser.set(false);
        this.toastService.error('Error', 'Failed to load user details');
      }
    });
  }

  onUpdateUsername() {
    if (!this.updateUsernameModel.username || this.updateUsernameModel.username.length < 3) {
      this.toastService.warning('Validation', 'Username must be at least 3 characters');
      return;
    }
    const toastId = this.toastService.loading('Updating', 'Updating username...');
    this.settingService.updateUsername({ username: this.updateUsernameModel.username }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, 'Success', res.message || 'Username updated');
          this.loadUser();
        } else {
          this.toastService.updateToError(toastId, 'Error', res.message || 'Failed to update username');
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, 'Error', 'Failed to update username');
      }
    });
  }

  onUpdatePhone() {
    if (!this.updatePhoneModel.phoneNumber || this.updatePhoneModel.phoneNumber.length < 10) {
      this.toastService.warning('Validation', 'Phone number must be at least 10 digits');
      return;
    }
    const toastId = this.toastService.loading('Updating', 'Updating phone number...');
    this.settingService.updatePhoneNumber({ phoneNumber: this.updatePhoneModel.phoneNumber }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, 'Success', res.message || 'Phone number updated');
          this.loadUser();
        } else {
          this.toastService.updateToError(toastId, 'Error', res.message || 'Failed to update phone');
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, 'Error', 'Failed to update phone number');
      }
    });
  }

  // Address methods
  loadAddresses() {
    this.isLoadingAddresses.set(true);
    this.settingService.getAddresses().subscribe({
      next: (res) => {
        if (res.success) {
          this.addresses.set(res.data || []);
        }
        this.isLoadingAddresses.set(false);
      },
      error: () => {
        this.isLoadingAddresses.set(false);
        this.toastService.error('Error', 'Failed to load addresses');
      }
    });
  }

  openAddAddress() {
    if ((this.addresses() || []).length >= 1) {
      this.toastService.warning('Limit reached', 'You can only create one address');
      return;
    }
    this.resetNewAddress();
    this.showAddAddress.set(true);
  }

  openEditAddress(address: UserAddressDto) {
    this.editAddress = {
      id: address.id,
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      country: address.country,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      isDefault: !!address.isDefault
    };
    this.showEditAddress.set(true);
  }

  addAddress() {
    if (!this.newAddress.fullName || !this.newAddress.phoneNumber || !this.newAddress.addressLine1) {
      this.toastService.warning('Validation', 'Full name, phone, and address are required');
      return;
    }
    const toastId = this.toastService.loading('Creating', 'Creating address...');
    this.settingService.createAddress(this.newAddress).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, 'Success', 'Address created');
          this.showAddAddress.set(false);
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, 'Error', res.message || 'Failed to create address');
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, 'Error', 'Failed to create address');
      }
    });
  }

  updateAddress() {
    if (!this.editAddress.fullName || !this.editAddress.phoneNumber || !this.editAddress.addressLine1) {
      this.toastService.warning('Validation', 'Full name, phone, and address are required');
      return;
    }
    const toastId = this.toastService.loading('Updating', 'Updating address...');
    this.settingService.updateAddress(this.editAddress).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, 'Success', 'Address updated');
          this.showEditAddress.set(false);
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, 'Error', res.message || 'Failed to update address');
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, 'Error', 'Failed to update address');
      }
    });
  }

  deleteAddress(addressId: number) {
    const toastId = this.toastService.loading('Deleting', 'Deleting address...');
    this.settingService.deleteAddress(addressId).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, 'Success', 'Address deleted');
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, 'Error', res.message || 'Failed to delete address');
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, 'Error', 'Failed to delete address');
      }
    });
  }

  resetNewAddress() {
    this.newAddress = {
      fullName: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      country: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false
    };
  }
}
