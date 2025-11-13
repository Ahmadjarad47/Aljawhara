import { BaseDto } from "../../admin/base.dto";
import { ProductDetailDto, RatingDto, ProductVariantDto } from "../../admin/product/product.models";

export interface CategoryDto extends BaseDto {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    subCategories: SubCategoryDto[];
    productCount: number;
}

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
export interface ProductSummaryDto {
    id: number;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
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
    isInWishlist?: boolean;
}