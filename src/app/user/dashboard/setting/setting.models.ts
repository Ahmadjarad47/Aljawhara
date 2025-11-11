
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
}

export interface UpdateAddressDto extends CreateAddressDto {
  id: number;
}



