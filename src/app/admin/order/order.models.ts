import { OrderItemCreateDto } from "../../Models/order";
import { BaseDto } from "../base.dto";

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
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    appUserId: string | null;
}
export enum OrderStatus
{
    Pending,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
    Refunded
}
export interface OrderCreateDto {
    items: OrderItemCreateDto[];
    shippingAddress: ShippingAddressCreateDto;
    couponCode: string | null;
}
export interface ShippingAddressCreateDto {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
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