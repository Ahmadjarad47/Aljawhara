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
    alQataa: string | null; // القطعة (District/Block)
    alSharee: string | null; // الشارع (Street)
    alJada: string | null; // الجادة (Avenue)
    alManzil: string | null; // المنزل (House)
    alDor: string | null; // الدور (Floor)
    alShakka: string | null; // الشقة (Apartment)
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
    alQataa: string | null; // القطعة (District/Block)
    alSharee: string | null; // الشارع (Street)
    alJada: string | null; // الجادة (Avenue)
    alManzil: string | null; // المنزل (House)
    alDor: string | null; // الدور (Floor)
    alShakka: string | null; // الشقة (Apartment)
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
    alQataa: string | null; // القطعة (District/Block)
    alSharee: string | null; // الشارع (Street)
    alJada: string | null; // الجادة (Avenue)
    alManzil: string | null; // المنزل (House)
    alDor: string | null; // الدور (Floor)
    alShakka: string | null; // الشقة (Apartment)
}