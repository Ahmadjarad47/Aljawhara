import { PaymentInitializationStatus } from '../../../core/Models/checkout-payment';

export interface BaseDto {
    id: number;
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
    updatedBy?: string;
    isDeleted: boolean;
    isActive: boolean;
}

export enum OrderStatus {
    Pending = 0,
    Processing = 1,
    Shipped = 2,
    Delivered = 3,
    Cancelled = 4,
    Refunded = 5,
    Expired = 6,
    RequiresReconciliation = 7
}

export function normalizeOrderStatus(status: OrderStatus | string | null | undefined): OrderStatus | null {
    if (status === null || status === undefined || status === '') return null;
    const value = typeof status === 'string' ? status.trim() : status;
    if (value === '') return null;
    const numeric = Number(value);
    if (Number.isInteger(numeric) && typeof OrderStatus[numeric] === 'string') return numeric;
    return (Object.values(OrderStatus).find(
        entry => typeof entry === 'number' && OrderStatus[entry].toLowerCase() === String(value).toLowerCase()
    ) as OrderStatus | undefined) ?? null;
}

export interface OrderSummaryDto {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    isPaid?: boolean;
    paymentInitializationStatus?: PaymentInitializationStatus;
    paymentStatus?: string | number | null;
    total: number;
    createdAt: string;
    itemCount: number;
    customerName: string;
    isActive: boolean;
}

export interface OrderDto extends BaseDto {
    orderNumber: string;
    status: OrderStatus;
    isPaid?: boolean;
    paymentInitializationStatus?: PaymentInitializationStatus;
    paymentStatus?: string | number | null;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    appUserId?: string;
    customerName: string;
    couponId?: number;
    couponCode?: string;
    couponDiscountAmount?: number;
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
    state?: string;
    postalCode: string;
    country: string;
    appUserId?: string;
    
    // Arabic address fields
    alQataa?: string; // القطعة (District/Block)
    alSharee?: string; // الشارع (Street)
    alJada?: string; // الجادة (Avenue)
    alManzil?: string; // المنزل (House)
    alDor?: string; // الدور (Floor)
    alShakka?: string; // الشقة (Apartment)
}

export interface OrderFilters {
    status?: OrderStatus;
    searchTerm?: string;
    pageNumber?: number;
    pageSize?: number;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface RatingDto {
    id: number;
    content: string;
    ratingNumber: number;
    productId: number;
    productTitle?: string;
    createdAt: string;
    createdBy: string;
}

export interface RatingCreateDto {
    content: string;
    ratingNumber: number;
    productId: number;
}

export interface InvoicePaymentDto {
    // Order Information
    orderId: number;
    orderNumber: string;
    status: OrderStatus;
    orderCreatedAt: string;
    
    // Financial Information
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    paymentAmount: number; // Amount to be paid (same as Total)
    
    // Customer Information
    appUserId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    
    // Coupon Information
    couponId?: number;
    couponCode?: string;
    couponDiscountAmount?: number;
    
    // Order Items
    items: OrderItemDto[];
    
    // Shipping Address
    shippingAddress: ShippingAddressDto;
    
    // Success indicator
    success: boolean;
    message?: string;
}

export interface OrderPaymentLinkResponse {
    orderId: number;
    paymentLink: string;
}

