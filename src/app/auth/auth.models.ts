export interface RegisterDto {
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
}

export interface LoginDto {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface VerifyAccountDto {
    email: string;
    otp: string;
}

export interface ResendVerificationDto {
    email: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    email: string;
    otp: string;
    newPassword: string;
    confirmNewPassword: string;
}

export interface UserResponseDto {
    id: string;
    username: string;
    email: string;
    phoneNumber: string;
    emailConfirmed: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface LoginResponseDto {
    token: string;
    refreshToken: string;
    expiresAt: string;
    user: UserResponseDto;
}

export interface RefreshTokenDto {
    refreshToken: string;
}

export interface ApiResponseDto<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}