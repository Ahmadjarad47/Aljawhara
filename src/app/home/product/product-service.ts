import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CategoryDto, ProductDto, ProductSummaryDto } from './product.models';
import { defer, finalize, Observable, shareReplay } from 'rxjs';
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
  private readonly destroyRef = inject(DestroyRef);
  api = environment.apiUrl;
  http = inject(HttpClient);
  private readonly categoriesRequests = new Map<string, Observable<CategoryDto[]>>();

  getCategories(includeSubCategories: boolean = true): Observable<CategoryDto[]> {
    return defer(() => {
      const key = `${this.api}|${includeSubCategories}`;
      const pending = this.categoriesRequests.get(key);
      if (pending) return pending;

      const params = new HttpParams().set('includeSubCategories', includeSubCategories.toString());
      // Coalesce concurrent navbar/filter requests, but never replay a completed
      // catalog snapshot on a later visit (including a database change at the same URL).
      const request$ = this.http.get<CategoryDto[]>(`${this.api}Categories`, { params }).pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.categoriesRequests.delete(key)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.categoriesRequests.set(key, request$);
      return request$;
    });
  }

  getProducts(filters?: ProductFilters): Observable<ProductSummaryDto[] | ProductResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId.toString());
      if (filters.subCategoryId) params = params.set('subCategoryId', filters.subCategoryId.toString());
      if (filters.minPrice !== undefined) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params = params.set('maxPrice', filters.maxPrice.toString());
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

  getRandomProductsBySubCategory(subCategoryId: number, count: number = 3): Observable<ProductSummaryDto[]> {
    return this.http.get<ProductSummaryDto[]>(`${this.api}Products/subcategory/${subCategoryId}/random`, {
      params: { count: count.toString() }
    });
  }
}
