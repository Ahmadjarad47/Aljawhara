import { OrderItemCreateDto } from "../../Models/order";
import { BaseDto } from "../base.dto";
import { OrderStatus } from '../../core/Models/order-status';
export { OrderStatus, normalizeOrderStatus } from '../../core/Models/order-status';

export interface OrderDto extends BaseDto {
    orderNumber: string;
    status: OrderStatus;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    appUserId: string | null;
    customerName: string;
    couponId: number | null;
    couponCode: string | null;
    couponDiscountAmount: number | null;
    items: OrderItemDto[];
    shippingAddress: ShippingAddressDto;
}
export interface OrderItemDto extends BaseDto {
    productId: number;
    orderId: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    total: number;
}
export interface ShippingAddressDto extends BaseDto {
    fullName: string;
    phone: string;
    street: string;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    appUserId: string | null;
}
export interface OrderCreateDto {
    items: OrderItemCreateDto[];
    shippingAddress: ShippingAddressCreateDto;
    couponCode: string | null;
    paymentMethod?: 2 | 4; // Backend PaymentMethod: Cod = 2, Bank (Sadad) = 4.
}
export interface ShippingAddressCreateDto {
    fullName: string;
    phone: string;
    street: string;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    alQataa?: string | null;
    alSharee?: string | null;
    alJada?: string | null;
    alManzil?: string | null;
    alDor?: string | null;
    alShakka?: string | null;
}
export interface OrderUpdateStatusDto {
    id: number;
    status: OrderStatus;
}

export interface OrderSummaryDto {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    createdAt: string;
    itemCount: number;
    customerName: string;
    isActive: boolean;
}

/** Shipping address shape as returned by invoice-payment API (may include Arabic fields). */
export interface InvoiceShippingAddressDto extends ShippingAddressDto {
    alQataa?: string;
    alSharee?: string;
    alJada?: string;
    alManzil?: string;
    alDor?: string;
    alShakka?: string;
}

export interface InvoicePaymentDto {
    orderId: number;
    orderNumber: string;
    status: OrderStatus;
    orderCreatedAt: string;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    paymentAmount: number;
    appUserId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    couponId?: number;
    couponCode?: string;
    couponDiscountAmount?: number;
    items: OrderItemDto[];
    shippingAddress: InvoiceShippingAddressDto;
    success: boolean;
    message?: string;
}
