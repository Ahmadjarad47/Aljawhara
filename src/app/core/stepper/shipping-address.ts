import { ShippingAddressCreateDto } from '../../admin/order/order.models';
import { CreateAddressDto } from '../Models/shipping';

export const MOBILE_PATTERN = /^\+?[0-9]{8,15}$/;

export const ADDRESS_DETAIL_FIELDS = [
  { key: 'alQataa', maxLength: 100 },
  { key: 'alSharee', maxLength: 100 },
  { key: 'alJada', maxLength: 100 },
  { key: 'alManzil', maxLength: 50 },
  { key: 'alDor', maxLength: 50 },
  { key: 'alShakka', maxLength: 50 },
] as const;

export function isShippingAddressValid(address: CreateAddressDto): boolean {
  return !!address.fullName.trim() && address.fullName.trim().length <= 100
    && !!address.addressLine1.trim() && address.addressLine1.trim().length <= 200
    && MOBILE_PATTERN.test(address.phoneNumber.trim())
    && ADDRESS_DETAIL_FIELDS.every(field => (address[field.key]?.length ?? 0) <= field.maxLength);
}

export function createAddressForm(address?: CreateAddressDto): CreateAddressDto {
  return {
    fullName: address?.fullName ?? '',
    phoneNumber: address?.phoneNumber ?? '',
    addressLine1: address?.addressLine1 ?? '',
    // Retain legacy metadata on saved addresses without requiring it for new ones.
    city: address?.city,
    state: address?.state,
    postalCode: address?.postalCode,
    country: address?.country,
    isDefault: address?.isDefault ?? true,
    alQataa: address?.alQataa ?? null,
    alSharee: address?.alSharee ?? null,
    alJada: address?.alJada ?? null,
    alManzil: address?.alManzil ?? null,
    alDor: address?.alDor ?? null,
    alShakka: address?.alShakka ?? null,
  };
}

export function toAddressPayload(address: CreateAddressDto): CreateAddressDto {
  const result = createAddressForm(address);
  result.fullName = result.fullName.trim();
  result.phoneNumber = result.phoneNumber.trim();
  result.addressLine1 = result.addressLine1.trim();
  for (const field of ['alQataa', 'alSharee', 'alJada', 'alManzil', 'alDor', 'alShakka'] as const) {
    result[field] = result[field]?.trim() || null;
  }
  return result;
}

export function toOrderShippingAddress(address: CreateAddressDto): ShippingAddressCreateDto {
  const { phoneNumber, addressLine1, isDefault, ...fields } = toAddressPayload(address);
  return { ...fields, phone: phoneNumber, street: addressLine1 };
}
