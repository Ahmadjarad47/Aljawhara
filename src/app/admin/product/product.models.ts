import { BaseDto } from "../base.dto";

// Product Variant Interfaces
export interface ProductVariantValueDto {
    id?: number;
    value: string;
    valueAr: string;
    price: number;
    productVariantId?: number;
}

export interface ProductVariantDto {
    id?: number;
    name: string;
    nameAr: string;
    productId?: number;
    values: ProductVariantValueDto[];
}

export interface ProductVariantCreateDto {
    name: string;
    nameAr: string;
    values: ProductVariantValueCreateDto[];
}

export interface ProductVariantValueCreateDto {
    value: string;
    valueAr: string;
    price: number;
}

export interface ProductVariantUpdateDto {
    id?: number;
    name: string;
    nameAr: string;
    values: ProductVariantValueUpdateDto[];
}

export interface ProductVariantValueUpdateDto {
    id?: number;
    value: string;
    valueAr: string;
    price: number;
}

export interface ProductDto extends BaseDto {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    oldPrice: number;
    newPrice: number;
    isInStock: boolean;
    totalInStock: number;
    images: string[];
    subCategoryId: number;
    subCategoryName: string;
    subCategoryNameAr: string;
    categoryName: string;
    categoryNameAr: string;
    productDetails: ProductDetailDto[];
    ratings: RatingDto[];
    averageRating: number;
    totalReviews: number;
    variants?: ProductVariantDto[];
}
export interface RatingDto extends BaseDto {
    content: string;
    ratingNumber: number;
    productId: number;
    productTitle: string;
    ratingName: any;
}
export interface ProductSummaryDto {
    id: number;
    title: string;
    titleAr: string;
    oldPrice: number;
    newPrice: number;
    isInStock: boolean;
    totalInStock: number;
    mainImage: string;
    subCategoryName: string;
    subCategoryNameAr: string;
    averageRating: number;
    totalReviews: number;
    isActive: boolean;
}

export interface ProductCreateWithFilesDto {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    oldPrice: number;
    newPrice: number;
    isInStock: boolean;
    totalInStock: number;
    subCategoryId: number;
    productDetails: ProductDetailCreateDto[];
    images: File[] | null;
    variants?: ProductVariantCreateDto[];
}

export interface ProductUpdateWithFilesDto {
    id: number;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    oldPrice: number;
    newPrice: number;
    isInStock: boolean;
    totalInStock: number;
    subCategoryId: number;
    productDetails: ProductDetailCreateDto[];
    images: File[] | null;
    imagesToDelete: string[];
    variants?: ProductVariantUpdateDto[];
}
export interface ProductDetailDto extends BaseDto {
    label: string;
    labelAr: string;
    value: string;
    valueAr: string;
    productId: number;
}

export interface ProductDetailCreateDto {
    label: string;
    labelAr: string;
    value: string;
    valueAr: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
}

export interface ProductFilters {
    categoryId?: number;
    subCategoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
}

export interface RatingCreateDto {
    content: string;
    ratingNumber: number;
    productId: number;
}