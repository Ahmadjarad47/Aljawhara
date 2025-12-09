import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
export class Setting implements OnInit, OnDestroy {
  private settingService = inject(SettingService);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      accountSettings: 'إعدادات الحساب',
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
      yes: 'نعم',
      no: 'لا',
      edit: 'تعديل',
      delete: 'حذف',
      fullName: 'الاسم الكامل',
      phoneNumber: 'رقم الهاتف',
      addressLine1: 'سطر العنوان 1',
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
      phoneMinLength: 'يجب أن يكون رقم الهاتف 10 أرقام على الأقل',
      updatingPhone: 'جاري تحديث رقم الهاتف...',
      phoneUpdated: 'تم تحديث رقم الهاتف',
      failedToUpdatePhone: 'فشل تحديث رقم الهاتف',
      failedToLoadAddresses: 'فشل تحميل العناوين',
      limitReached: 'تم الوصول للحد الأقصى',
      onlyOneAddress: 'يمكنك إنشاء عنوان واحد فقط',
      requiredFields: 'الاسم الكامل والهاتف والعنوان مطلوبة',
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
      phoneMinLength: 'Phone number must be at least 10 digits',
      updatingPhone: 'Updating phone number...',
      phoneUpdated: 'Phone number updated',
      failedToUpdatePhone: 'Failed to update phone number',
      failedToLoadAddresses: 'Failed to load addresses',
      limitReached: 'Limit reached',
      onlyOneAddress: 'You can only create one address',
      requiredFields: 'Full name, phone, and address are required',
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

  // Get filtered cities based on selected state for new address
  getFilteredCitiesForNew(): string[] {
    const selectedState = this.newAddress.state;
    if (selectedState && this.kuwaitAreas[selectedState]) {
      return this.kuwaitAreas[selectedState];
    }
    return [];
  }

  // Get filtered cities based on selected state for edit address
  getFilteredCitiesForEdit(): string[] {
    const selectedState = this.editAddress.state;
    if (selectedState && this.kuwaitAreas[selectedState]) {
      return this.kuwaitAreas[selectedState];
    }
    return [];
  }

  // Handle state change for new address - reset city if it's not in the new state's cities
  onNewAddressStateChange() {
    const filteredCities = this.getFilteredCitiesForNew();
    if (this.newAddress.city && !filteredCities.includes(this.newAddress.city)) {
      this.newAddress.city = '';
    }
  }

  // Handle state change for edit address - reset city if it's not in the new state's cities
  onEditAddressStateChange() {
    const filteredCities = this.getFilteredCitiesForEdit();
    if (this.editAddress.city && !filteredCities.includes(this.editAddress.city)) {
      this.editAddress.city = '';
    }
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
  newAddress: CreateAddressDto = {
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    country: 'Kuwait',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
    alQataa: '',
    alSharee: '',
    alJada: '',
    alManzil: '',
    alDor: '',
    alShakka: ''
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
    isDefault: false,
    alQataa: '',
    alSharee: '',
    alJada: '',
    alManzil: '',
    alDor: '',
    alShakka: ''
  };

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
    if (!this.updateUsernameModel.username || this.updateUsernameModel.username.length < 3) {
      this.toastService.warning(this.t('validation'), this.t('usernameMinLength'));
      return;
    }
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingUsername'));
    this.settingService.updateUsername({ username: this.updateUsernameModel.username }).subscribe({
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
    if (!this.updatePhoneModel.phoneNumber || this.updatePhoneModel.phoneNumber.length < 10) {
      this.toastService.warning(this.t('validation'), this.t('phoneMinLength'));
      return;
    }
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingPhone'));
    this.settingService.updatePhoneNumber({ phoneNumber: this.updatePhoneModel.phoneNumber }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), res.message || this.t('phoneUpdated'));
          this.loadUser();
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
      isDefault: !!address.isDefault,
      alQataa: address.alQataa || '',
      alSharee: address.alSharee || '',
      alJada: address.alJada || '',
      alManzil: address.alManzil || '',
      alDor: address.alDor || '',
      alShakka: address.alShakka || ''
    };
    this.showEditAddress.set(true);
  }

  addAddress() {
    if (!this.newAddress.fullName || !this.newAddress.phoneNumber || !this.newAddress.addressLine1) {
      this.toastService.warning(this.t('validation'), this.t('requiredFields'));
      return;
    }
    const toastId = this.toastService.loading(this.t('creating'), this.t('creatingAddress'));
    this.settingService.createAddress(this.newAddress).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), this.t('addressCreated'));
          this.showAddAddress.set(false);
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToCreateAddress'));
        }
      },
      error: () => {
        this.toastService.updateToError(toastId, this.t('error'), this.t('failedToCreateAddress'));
      }
    });
  }

  updateAddress() {
    if (!this.editAddress.fullName || !this.editAddress.phoneNumber || !this.editAddress.addressLine1) {
      this.toastService.warning(this.t('validation'), this.t('requiredFields'));
      return;
    }
    const toastId = this.toastService.loading(this.t('updating'), this.t('updatingAddress'));
    this.settingService.updateAddress(this.editAddress).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.updateToSuccess(toastId, this.t('success'), this.t('addressUpdated'));
          this.showEditAddress.set(false);
          this.loadAddresses();
        } else {
          this.toastService.updateToError(toastId, this.t('error'), res.message || this.t('failedToUpdateAddress'));
        }
      },
      error: () => {
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
    this.newAddress = {
      fullName: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      country: 'Kuwait',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false,
      alQataa: '',
      alSharee: '',
      alJada: '',
      alManzil: '',
      alDor: '',
      alShakka: ''
    };
  }
}
