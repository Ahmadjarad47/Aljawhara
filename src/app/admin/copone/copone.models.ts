import { BaseDto } from "../base.dto";

export interface CouponDto extends BaseDto {
    code: string;
    description: string;
    type: CouponType;
    value: number;
    minimumOrderAmount: number | null;
    maximumDiscountAmount: number | null;
    startDate: string;
    endDate: string;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    isSingleUse: boolean;
    appUserId: string | null;
    userName: string | null;
    remainingUses: number;
    isExpired: boolean;
    isFullyUsed: boolean;
}
export enum CouponType
{
    Percentage = 1,
    FixedAmount = 2,
    FreeShipping = 3
}
export interface CouponCreateDto {
    code: string;
    description: string;
    type: CouponType;
    value: number;
    minimumOrderAmount: number | null;
    maximumDiscountAmount: number | null;
    startDate: string;
    endDate: string;
    usageLimit: number | null;
    isActive: boolean;
    isSingleUse: boolean;
    appUserId: string | null;
}

export interface CouponUpdateDto {
    id: number;
    code: string;
    description: string;
    type: CouponType;
    value: number;
    minimumOrderAmount: number | null;
    maximumDiscountAmount: number | null;
    startDate: string;
    endDate: string;
    usageLimit: number | null;
    isActive: boolean;
    isSingleUse: boolean;
    appUserId: string | null;
}

export interface CouponValidationDto {
    code: string;
    orderAmount: number;
    userId: string | null;
}

export interface CouponValidationResultDto {
    isValid: boolean;
    message: string;
    coupon: CouponDto | null;
    discountAmount: number;
    finalAmount: number;
}

export interface CouponSummaryDto {
    id: number;
    code: string;
    description: string;
    type: CouponType;
    value: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    usedCount: number;
    usageLimit: number | null;
    isExpired: boolean;
    isFullyUsed: boolean;
    isDeleted: boolean;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
}