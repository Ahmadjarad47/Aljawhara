export interface CreateAddressDto {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  isDefault: boolean;
  alQataa?: string | null;
  alSharee?: string | null;
  alJada?: string | null;
  alManzil?: string | null;
  alDor?: string | null;
  alShakka?: string | null;
}

export interface UserAddressDto extends CreateAddressDto {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAddressDto extends CreateAddressDto {
  id: number;
}
