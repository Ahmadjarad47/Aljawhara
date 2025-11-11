import { BaseDto } from "../base.dto";

export interface SubCategoryDto extends BaseDto {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    categoryId: number;
    categoryName: string;
    categoryNameAr: string;
    productCount: number;
}
export interface SubCategoryCreateDto {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    categoryId: number;
}

export interface SubCategoryUpdateDto {
    id: number;
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    categoryId: number;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface SubCategoryFilters {
    isActive?: boolean;
    searchTerm?: string;
    categoryId?: number;
    pageNumber?: number;
    pageSize?: number;
}

export interface ToggleResponse {
    subCategoryId: number;
    isActive: boolean;
    message: string;
}