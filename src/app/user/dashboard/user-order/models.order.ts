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
    Cancelled = 4
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

export interface OrderDto extends BaseDto {
    orderNumber: string;
    status: OrderStatus;
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

