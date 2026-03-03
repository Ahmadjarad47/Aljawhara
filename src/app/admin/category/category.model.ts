import { BaseDto } from "../base.dto";

export interface CategoryDto extends BaseDto {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    image?: string | null;
    productCount: number;
}

export interface CategoryCreateDto {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
}

export interface CategoryUpdateDto {
    id: number;
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
}

export interface CategoryCreateWithFileDto extends CategoryCreateDto {
    image?: File | null;
}

export interface CategoryUpdateWithFileDto extends CategoryUpdateDto {
    image?: File | null;
    imageToDelete?: string | null;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CategoryFilters {
    isActive?: boolean;
    searchTerm?: string;
    pageNumber?: number;
    pageSize?: number;
}

export interface ToggleResponse {
    categoryId: number;
    isActive: boolean;
    message: string;
}