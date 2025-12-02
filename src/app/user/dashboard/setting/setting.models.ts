
export interface UserAddressDto {
  id: number;
  fullName: string;
  phoneNumber: string;
  country?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  isDefault?: boolean;
  alQataa?: string; // القطعة (District/Block)
  alSharee?: string; // الشارع (Street)
  alJada?: string; // الجادة (Avenue)
  alManzil?: string; // المنزل (House)
  alDor?: string; // الدور (Floor)
  alShakka?: string; // الشقة (Apartment)
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressDto {
  fullName: string;
  phoneNumber: string;
  country?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  isDefault?: boolean;
  alQataa?: string; // القطعة (District/Block)
  alSharee?: string; // الشارع (Street)
  alJada?: string; // الجادة (Avenue)
  alManzil?: string; // المنزل (House)
  alDor?: string; // الدور (Floor)
  alShakka?: string; // الشقة (Apartment)
}

export interface UpdateAddressDto extends CreateAddressDto {
  id: number;
}



