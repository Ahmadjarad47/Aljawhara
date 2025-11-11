export interface UserAddressDto {
    id: number;
    fullName: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressDto {
    fullName: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
    isDefault: boolean;
}

export interface UpdateAddressDto {
    id: number;
    fullName: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
    isDefault: boolean;
}