export interface UserManagerDto {
    id: string;
    username: string;
    email: string;
    phoneNumber: string;
    emailConfirmed: boolean;
    isBlocked: boolean;
    isActive: boolean;
    lockoutEnd: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    accessFailedCount: number;
    twoFactorEnabled: boolean;
}

export interface BlockUserDto {
    userId: string;
    blockUntil: string | null;
    reason: string;
}

export interface UnblockUserDto {
    userId: string;
}

export interface ChangeUserPasswordDto {
    userId: string;
    newPassword: string;
}

export interface ChangeUserEmailDto {
    userId: string;
    newEmail: string;
}

export interface SendEmailConfirmationDto {
    userId: string;
}

export interface UserSearchDto {
    searchTerm: string | null;
    isBlocked: boolean | null;
    emailConfirmed: boolean | null;
    isActive: boolean | null;
    page: number;
    pageSize: number;
}

export interface SendOtpDto {
    email: string;
}

export interface VerifyOtpDto {
    email: string;
    otp: string;
}

export interface ConfirmEmailDto {
    userId: string;
    otp: string;
}

export interface ChangePasswordWithOtpDto {
    email: string;
    otp: string;
    newPassword: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface UserAddressDto {
    id: number;
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ApiResponseDto<T> {
    success: boolean;
    message: string;
    data: T;
    errors?: string[];
}