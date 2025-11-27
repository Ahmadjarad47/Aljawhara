import { BaseDto } from '../base.dto';

export interface CarouselDto extends BaseDto {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  image: string;
  productUrl: string;
}

export interface CarouselCreateWithFileDto {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  productUrl?: string;
  image: File | null;
}

export interface CarouselUpdateWithFileDto {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  productUrl?: string;
  image: File | null;
  imageToDelete?: string | null;
}

export interface CarouselFilters {
  isActive?: boolean;
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

export interface ToggleCarouselResponse {
  carouselId: number;
  isActive: boolean;
  message: string;
}

// DTOs used by the public carousel API (customer satisfaction + latest reviews)
export interface ProductRatingSummaryDto {
  ratingId: number;
  productId: number;
  productTitle: string;
  content: string;
  ratingNumber: number;
  /**
   * ISO date string coming from the backend (DateTime).
   */
  createdAt: string;
}

export interface CustomerSatisfactionDto {
  /**
   * Satisfaction percentage between 0 and 100.
   */
  percentage: number;
  /**
   * Number of currently available products (Active + InStock).
   */
  availableProductsCount: number;
}

