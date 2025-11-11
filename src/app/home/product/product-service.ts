import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CategoryDto, ProductDto, ProductSummaryDto } from './product.models';
import { Observable } from 'rxjs';
import { RatingDto } from '../../admin/product/product.models';

export interface ProductFilters {
  categoryId?: number;
  subCategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  sortBy?: string; // "newest", "oldest", "highRating", "lowRating", "bestDiscount", "mostRating"
  inStock?: boolean;
  onSale?: boolean;
  newArrival?: boolean;
  bestDiscount?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface ProductResponse {
  Products?: ProductSummaryDto[];  // Backend uses capital P
  products?: ProductSummaryDto[];  // Fallback for lowercase
  TotalCount?: number;              // Backend uses capital T
  totalCount?: number;              // Fallback for lowercase
  PageNumber?: number;              // Backend uses capital P
  pageNumber?: number;              // Fallback for lowercase
  PageSize?: number;                // Backend uses capital P
  pageSize?: number;                // Fallback for lowercase
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  api = environment.apiUrl;
  http = inject(HttpClient);

  getCategories(includeSubCategories: boolean = true): Observable<CategoryDto[]> {
    const params = new HttpParams().set('includeSubCategories', includeSubCategories.toString());
    return this.http.get<CategoryDto[]>(`${this.api}Categories`, { params });
  }

  getProducts(filters?: ProductFilters): Observable<ProductSummaryDto[] | ProductResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId.toString());
      if (filters.subCategoryId) params = params.set('subCategoryId', filters.subCategoryId.toString());
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.inStock !== undefined) params = params.set('inStock', filters.inStock.toString());
      if (filters.onSale !== undefined) params = params.set('onSale', filters.onSale.toString());
      if (filters.newArrival !== undefined) params = params.set('newArrival', filters.newArrival.toString());
      if (filters.bestDiscount !== undefined) params = params.set('bestDiscount', filters.bestDiscount.toString());
      if (filters.pageNumber) params = params.set('pageNumber', filters.pageNumber.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<ProductSummaryDto[] | ProductResponse>(`${this.api}Products`, { params });
  }

  searchProducts(searchTerm: string): Observable<ProductSummaryDto[]> {
    return this.http.get<ProductSummaryDto[]>(`${this.api}Products`, {
      params: { searchTerm }
    });
  }

  getProductById(id: number): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.api}Products/${id}`);
  }

  getUserRating(productId: number): Observable<RatingDto> {
    return this.http.get<RatingDto>(`${this.api}Products/if-rating-return-it`, {
      params: { productId: productId.toString() }
    });
  }
}
