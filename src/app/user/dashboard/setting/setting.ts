import { Component, OnInit, OnDestroy, ElementRef, afterRenderEffect, viewChild, inject, signal } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import arabicLocale from '@angular/common/locales/ar';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../../core/components/toast/toast.component';
import { ToastService } from '../../../services/toast.service';
import { UserResponseDto } from '../../../auth/auth.models';
import { SettingService } from './setting.service';
import { CreateAddressDto, UpdateAddressDto, UserAddressDto } from './setting.models';
import { AddressAutocompleteComponent } from '../../../core/components/address-autocomplete/address-autocomplete';
import { AddressLocation } from '../../../core/data/kuwait-areas';
import { ADDRESS_DETAIL_FIELDS, createAddressForm, isShippingAddressValid, toAddressPayload } from '../../../core/stepper/shipping-address';

import { PhoneInputComponent } from '../../../core/phone/phone-input';
import { normalizePhone } from '../../../core/phone/phone-number';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { WhatsAppPreferencesComponent } from '../../../core/components/whatsapp-preferences/whatsapp-preferences';

registerLocaleData(arabicLocale);

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent, AddressAutocompleteComponent, WhatsAppPreferencesComponent, PhoneInputComponent],
  templateUrl: './setting.html',
  styleUrls: ['../account-page.css', './setting.css']
})
export class Setting implements OnInit, OnDestroy {
  private settingService = inject(SettingService);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;
  private whatsappPreferences = viewChild(WhatsAppPreferencesComponent);
  private addressDialog = viewChild<ElementRef<HTMLDialogElement>>('addressDialog');
  isSavingUsername = signal(false);
  isSavingPhone = signal(false);

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.addressDialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  closeAddressEditor(event?: Event): void {
    event?.preventDefault();
    if (this.isSavingAddress()) return;
    this.addressDialog()?.nativeElement.close();
    this.showAddAddress.set(false);
    this.showEditAddress.set(false);
  }

  profilePhoneCountry: CountryCode = 'KW';
  addressPhoneCountry: CountryCode = 'KW';
  isProfilePhoneValid(): boolean { return !!normalizePhone(this.updatePhoneModel.phoneNumber, this.profilePhoneCountry); }
  changeAddressPhone(address: CreateAddressDto, phone: string): void {
    address.phoneNumber = normalizePhone(phone, this.addressPhoneCountry) ?? phone;
  }

  onTabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === 'Home' ? 'profile' : event.key === 'End' ? 'addresses'
      : this.activeTab() === 'profile' ? 'addresses' : 'profile';
    this.activeTab.set(tab);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#settings-${tab}-tab`)?.focus();
  }

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      accountSettings: 'إعدادات الحساب',
      saveChanges: 'حفظ التغييرات',
      saving: 'جارٍ الحفظ...',
      close: 'إغلاق',
      retry: 'إعادة المحاولة',
      loadingProfile: 'جارٍ تحميل بيانات الحساب...',
      loadingAddresses: 'جارٍ تحميل العناوين...',
      usernameHint: 'اختر الاسم الذي ترغب باستخدامه في حسابك.',
      phoneHint: 'حدّث رقم الهاتف المرتبط بحسابك.',
      addressHint: 'إدارة عنوان التوصيل المحفوظ في حسابك.',
      addAddressHint: 'أضف عنوانك لتسهيل التوصيل في طلباتك القادمة.',
      addressFormHint: 'الحقول المعلّمة بنجمة مطلوبة.',
      addressDetails: 'تفاصيل العنوان',
      optional: 'اختياري',
      manageProfile: 'إدارة ملفك الشخصي والعناوين',
      profile: 'الملف الشخصي',
      addresses: 'العناوين',
      userInfo: 'معلومات المستخدم',
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      created: 'تاريخ الإنشاء',
      updateUsername: 'تحديث اسم المستخدم',
      updatePhoneNumber: 'تحديث رقم الهاتف',
      save: 'حفظ',
      yourAddresses: 'عناوينك',
      addAddress: 'إضافة عنوان',
      noAddressesFound: 'لم يتم العثور على عناوين',
      name: 'الاسم',
      address: 'العنوان',
      cityState: 'المدينة/الولاية',
      postal: 'الرمز البريدي',
      default: 'افتراضي',
      secondary: 'إضافي',
      yes: 'نعم',
      no: 'لا',
      edit: 'تعديل',
      delete: 'حذف',
      fullName: 'الاسم الكامل',
      phoneNumber: 'رقم الهاتف',
      addressLine1: 'العنوان الأول',
      addressLine2: 'سطر العنوان 2',
      country: 'الدولة',
      city: 'المنطقة',
      state: 'المحافظة',
      postalCode: 'الرمز البريدي',
      alQataa: 'القطعة',
      alSharee: 'الشارع',
      alJada: 'الجادة',
      alManzil: 'المنزل',
      alDor: 'الدور',
      alShakka: 'الشقة',
      setAsDefault: 'تعيين كعنوان افتراضي',
      cancel: 'إلغاء',
      editAddress: 'تعديل العنوان',
      error: 'خطأ',
      failedToLoadUser: 'فشل تحميل بيانات المستخدم',
      validation: 'التحقق',
      usernameMinLength: 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل',
      updating: 'جاري التحديث',
      updatingUsername: 'جاري تحديث اسم المستخدم...',
      success: 'نجح',
      usernameUpdated: 'تم تحديث اسم المستخدم',
      failedToUpdateUsername: 'فشل تحديث اسم المستخدم',
      phoneMinLength: 'يجب أن يكون رقم الهاتف 9 أرقام بالضبط',
      updatingPhone: 'جاري تحديث رقم الهاتف...',
      phoneUpdated: 'تم تحديث رقم الهاتف',
      failedToUpdatePhone: 'فشل تحديث رقم الهاتف',
      failedToLoadAddresses: 'فشل تحميل العناوين',
      limitReached: 'تم الوصول للحد الأقصى',
      onlyOneAddress: 'يمكنك إنشاء عنوان واحد فقط',
      requiredFields: 'يرجى إدخال الاسم والعنوان ورقم جوال صحيح من 8 إلى 15 رقماً.',
      creating: 'جاري الإنشاء',
      creatingAddress: 'جاري إنشاء العنوان...',
      addressCreated: 'تم إنشاء العنوان',
      failedToCreateAddress: 'فشل إنشاء العنوان',
      updatingAddress: 'جاري تحديث العنوان...',
      addressUpdated: 'تم تحديث العنوان',
      failedToUpdateAddress: 'فشل تحديث العنوان',
      deleting: 'جاري الحذف',
      deletingAddress: 'جاري حذف العنوان...',
      addressDeleted: 'تم حذف العنوان',
      failedToDeleteAddress: 'فشل حذف العنوان',
      selectCity: 'اختر المنطقة',
      selectState: 'اختر المحافظة'
    },
    en: {
      accountSettings: 'Account Settings',
      saveChanges: 'Save changes',
      saving: 'Saving...',
      close: 'Close',
      retry: 'Try again',
      loadingProfile: 'Loading your account...',
      loadingAddresses: 'Loading your addresses...',
      usernameHint: 'Choose the name you want to use for your account.',
      phoneHint: 'Update the phone number linked to your account.',
      addressHint: 'Manage the delivery address saved to your account.',
      addAddressHint: 'Add your address for easier delivery on your next order.',
      addressFormHint: 'Fields marked with an asterisk are required.',
      addressDetails: 'Address details',
      optional: 'Optional',
      manageProfile: 'Manage your profile and addresses',
      profile: 'Profile',
      addresses: 'Addresses',
      userInfo: 'User info',
      username: 'Username',
      email: 'Email',
      phone: 'Phone',
      created: 'Created',
      updateUsername: 'Update username',
      updatePhoneNumber: 'Update phone number',
      save: 'Save',
      yourAddresses: 'Your addresses',
      addAddress: 'Add address',
      noAddressesFound: 'No addresses found',
      name: 'Name',
      address: 'Address',
      cityState: 'City/State',
      postal: 'Postal',
      default: 'Default',
      secondary: 'Additional',
      yes: 'Yes',
      no: 'No',
      edit: 'Edit',
      delete: 'Delete',
      fullName: 'Full name',
      phoneNumber: 'Phone',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2',
      country: 'Country',
      city: 'Area',
      state: 'Governorate',
      postalCode: 'Postal code',
      alQataa: 'District/Block',
      alSharee: 'Street',
      alJada: 'Avenue',
      alManzil: 'House',
      alDor: 'Floor',
      alShakka: 'Apartment',
      setAsDefault: 'Set as default address',
      cancel: 'Cancel',
      editAddress: 'Edit address',
      error: 'Error',
      failedToLoadUser: 'Failed to load user details',
      validation: 'Validation',
      usernameMinLength: 'Username must be at least 3 characters',
      updating: 'Updating',
      updatingUsername: 'Updating username...',
      success: 'Success',
      usernameUpdated: 'Username updated',
      failedToUpdateUsername: 'Failed to update username',
      phoneMinLength: 'Enter a valid number for the selected country or use + and the calling code.',
      updatingPhone: 'Updating phone number...',
      phoneUpdated: 'Phone number updated',
      failedToUpdatePhone: 'Failed to update phone number',
      failedToLoadAddresses: 'Failed to load addresses',
      limitReached: 'Limit reached',
      onlyOneAddress: 'You can only create one address',
      requiredFields: 'Enter a name, address, and a valid mobile number with 8 to 15 digits.',
      creating: 'Creating',
      creatingAddress: 'Creating address...',
      addressCreated: 'Address created',
      failedToCreateAddress: 'Failed to create address',
      updatingAddress: 'Updating address...',
      addressUpdated: 'Address updated',
      failedToUpdateAddress: 'Failed to update address',
      deleting: 'Deleting',
      deletingAddress: 'Deleting address...',
      addressDeleted: 'Address deleted',
      failedToDeleteAddress: 'Failed to delete address',
      selectCity: 'Select Area',
      selectState: 'Select Governorate'
    }
  };

  readonly optionalFields = ADDRESS_DETAIL_FIELDS;
  readonly isAddressValid = isShippingAddressValid;
  isSavingAddress = signal(false);

  onAddressLocationChange(address: CreateAddressDto, location: AddressLocation): void {
    Object.assign(address, location);
  }

  addressDetails(address: CreateAddressDto): string {
    return this.optionalFields.filter(field => address[field.key])
      .map(field => `${this.t(field.key)}: ${address[field.key]}`).join(' · ');
  }
  // Translation helper
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations.ar] || key;
  }

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
  newAddress: CreateAddressDto = { ...createAddressForm(), isDefault: false };
  editAddress: UpdateAddressDto = { ...createAddressForm(), id: 0 };
  ngOnInit(): void {
    // Load saved language
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang) {
      this.currentLanguage.set(savedLang);
    }

    // Listen for language changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'language') {
        const newLang = e.newValue as 'ar' | 'en' | null;
        if (newLang) {
          this.currentLanguage.set(newLang);
        }
      }
    });

    // Poll for language changes in the same window
    this.languageCheckInterval = setInterval(() => {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (savedLang && savedLang !== this.currentLanguage()) {
        this.currentLanguage.set(savedLang);
      }
    }, 100);

    this.loadUser();
    this.loadAddresses();
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
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
          this.profilePhoneCountry = parsePhoneNumberFromString(res.data.phoneNumber)?.country ?? 'KW';
        }
        this.isLoadingUser.set(false);
      },
      error: () => {
        this.isLoadingUser.set(false);
        this.toastService.error(this.t('error'), this.t('failedToLoadUser'));
      }
    });
  }

  onUpdateUsername() {
    if (this.isSavingUsername()) return;
    if (!this.updateUsernameModel.username || this.updateUsernameModel.username.length < 3) {
      this.toastService.warning(this.t('validation'), this.t('usernameMinLength'));
      return;
    }
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingUsername'));
    this.isSavingUsername.set(true);
    this.settingService.updateUsername({ username: this.updateUsernameModel.username }).pipe(
      finalize(() => this.isSavingUsername.set(false))
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), res.message || this.t('usernameUpdated'));
          this.loadUser();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToUpdateUsername'));
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToUpdateUsername'));
      }
    });
  }

  onUpdatePhone() {
    if (this.isSavingPhone()) return;
    if (!this.isProfilePhoneValid()) {
      this.toastService.warning(this.t('validation'), this.t('phoneMinLength'));
      return;
    }
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingPhone'));
    this.isSavingPhone.set(true);
    this.settingService.updatePhoneNumber({ phoneNumber: normalizePhone(this.updatePhoneModel.phoneNumber, this.profilePhoneCountry)! }).pipe(
      finalize(() => this.isSavingPhone.set(false))
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), res.message || this.t('phoneUpdated'));
          this.loadUser();
          void this.whatsappPreferences()?.load();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToUpdatePhone'));
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToUpdatePhone'));
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
        this.toastService.error(this.t('error'), this.t('failedToLoadAddresses'));
      }
    });
  }

  openAddAddress() {
    if ((this.addresses() || []).length >= 1) {
      this.toastService.warning(this.t('limitReached'), this.t('onlyOneAddress'));
      return;
    }
    this.addressPhoneCountry = 'KW';
    this.resetNewAddress();
    this.showAddAddress.set(true);
  }

  openEditAddress(address: UserAddressDto) {
    this.addressPhoneCountry = parsePhoneNumberFromString(address.phoneNumber)?.country ?? 'KW';
    this.editAddress = { ...createAddressForm(address), id: address.id };
    this.showEditAddress.set(true);
  }

  addAddress() {
    if (this.isSavingAddress()) return;
    if (!this.isAddressValid(this.newAddress)) {
      this.toastService.warning(this.t('validation'), this.t('requiredFields'));
      return;
    }
    this.isSavingAddress.set(true);
    const toastId = this.toastService.loading(this.t('creating'), this.t('creatingAddress'));
    this.settingService.createAddress(toAddressPayload(this.newAddress)).subscribe({
      next: (res) => {
        this.isSavingAddress.set(false);
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), this.t('addressCreated'));
          this.closeAddressEditor();
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToCreateAddress'));
        }
      },
      error: () => {
        this.isSavingAddress.set(false);
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToCreateAddress'));
      }
    });
  }

  updateAddress() {
    if (this.isSavingAddress()) return;
    if (!this.isAddressValid(this.editAddress)) {
      this.toastService.warning(this.t('validation'), this.t('requiredFields'));
      return;
    }
    this.isSavingAddress.set(true);
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingAddress'));
    this.settingService.updateAddress({ ...toAddressPayload(this.editAddress), id: this.editAddress.id }).subscribe({
      next: (res) => {
        this.isSavingAddress.set(false);
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), this.t('addressUpdated'));
          this.closeAddressEditor();
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToUpdateAddress'));
        }
      },
      error: () => {
        this.isSavingAddress.set(false);
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToUpdateAddress'));
      }
    });
  }

  deleteAddress(addressId: number) {
    const toastId = this.toastService.loading(this.t('deleting'), this.t('deletingAddress'));
    this.settingService.deleteAddress(addressId).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), this.t('addressDeleted'));
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToDeleteAddress'));
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToDeleteAddress'));
      }
    });
  }

  resetNewAddress() {
    this.newAddress = { ...createAddressForm(), isDefault: false };
  }

  // Handle phone number input - only allow digits and limit to 9 digits
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
}
