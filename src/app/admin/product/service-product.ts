import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { 
  ProductDto, 
  ProductCreateWithFilesDto, 
  ProductUpdateWithFilesDto, 
  ProductSummaryDto,
  ProductDetailDto,
  ProductDetailCreateDto,
  RatingDto,
  PagedResult, 
  ProductFilters 
} from './product.models';

@Injectable({
  providedIn: 'root'
})
export class ServiceProduct {
  private api = environment.apiUrl + 'admin';
  private http = inject(HttpClient);
  private sourceProducts = new BehaviorSubject<ProductDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  products$ = this.sourceProducts.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get products with pagination and filters
  getProducts(filters: ProductFilters = {}): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams();
    console.log('Getting products with filters:', filters);
    
    if (filters.categoryId !== undefined) {
      params = params.set('categoryId', filters.categoryId.toString());
    }
    if (filters.subCategoryId !== undefined) {
      params = params.set('subCategoryId', filters.subCategoryId.toString());
    }
    if (filters.minPrice !== undefined) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<ProductDto>>(`${this.api}/products`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        console.log(result);
        this.sourceProducts.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get product by ID
  getProductById(id: number): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.api}/products/${id}`);
  }

  // Get featured products
  getFeaturedProducts(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductDto>>(`${this.api}/products/featured`, { params });
  }

  // Get products by category
  getProductsByCategory(categoryId: number, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductDto>>(`${this.api}/products/category/${categoryId}`, { params });
  }

  // Get products by subcategory
  getProductsBySubCategory(subCategoryId: number, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductDto>>(`${this.api}/products/subcategory/${subCategoryId}`, { params });
  }

  // Get related products
  getRelatedProducts(productId: number, pageNumber: number = 1, pageSize: number = 5): Observable<PagedResult<ProductDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductDto>>(`${this.api}/products/${productId}/related`, { params });
  }

  // Create product with files
  createProduct(product: ProductCreateWithFilesDto): Observable<ProductDto> {
    console.log('🚀 Service: Creating product...');
    console.log('Product data received:', {
      title: product.title,
      titleAr: product.titleAr,
      subCategoryId: product.subCategoryId,
      newPrice: product.newPrice,
      productDetailsCount: product.productDetails?.length || 0,
      imagesCount: product.images?.length || 0
    });
    
    try {
      const formData = new FormData();
      
      // Basic product information
      formData.append('title', product.title);
      formData.append('titleAr', product.titleAr);
      formData.append('description', product.description);
      formData.append('descriptionAr', product.descriptionAr);
      formData.append('oldPrice', product.oldPrice.toString());
      formData.append('newPrice', product.newPrice.toString());
      formData.append('isInStock', product.isInStock.toString());
      formData.append('totalInStock', product.totalInStock.toString());
      formData.append('subCategoryId', product.subCategoryId.toString());
      
      console.log('✅ Basic product data added to FormData');
      
      // Add product details
      if (product.productDetails && product.productDetails.length > 0) {
        console.log('Adding product details:', product.productDetails.length);
        product.productDetails.forEach((detail, index) => {
          formData.append(`productDetails[${index}].label`, detail.label);
          formData.append(`productDetails[${index}].labelAr`, detail.labelAr);
          formData.append(`productDetails[${index}].value`, detail.value);
          formData.append(`productDetails[${index}].valueAr`, detail.valueAr);
        });
        console.log('✅ Product details added to FormData');
      }
      
      // Add images
      if (product.images && product.images.length > 0) {
        console.log('Adding images:', product.images.length);
        product.images.forEach((image, index) => {
          formData.append('images', image);
          console.log(`Image ${index + 1}:`, {
            name: image.name,
            size: image.size,
            type: image.type
          });
        });
        console.log('✅ Images added to FormData');
      }
      
      console.log('📤 Making HTTP POST request to:', `${this.api}/products`);
      return this.http.post<ProductDto>(`${this.api}/products`, formData);
      
    } catch (error) {
      console.error('❌ Service Error: Failed to prepare FormData:', error);
      throw error;
    }
  }

  // Update product with files
  updateProduct(id: number, product: ProductUpdateWithFilesDto): Observable<ProductDto> {
    const formData = new FormData();
    
    formData.append('id', id.toString());
    formData.append('title', product.title);
    formData.append('titleAr', product.titleAr);
    formData.append('description', product.description);
    formData.append('descriptionAr', product.descriptionAr);
    formData.append('oldPrice', product.oldPrice.toString());
    formData.append('newPrice', product.newPrice.toString());
    formData.append('isInStock', product.isInStock.toString());
    formData.append('totalInStock', product.totalInStock.toString());
    formData.append('subCategoryId', product.subCategoryId.toString());
    
    // Add product details
    product.productDetails.forEach((detail, index) => {
      formData.append(`productDetails[${index}].label`, detail.label);
      formData.append(`productDetails[${index}].labelAr`, detail.labelAr);
      formData.append(`productDetails[${index}].value`, detail.value);
      formData.append(`productDetails[${index}].valueAr`, detail.valueAr);
    });
    
    // Add images
    if (product.images && product.images.length > 0) {
      product.images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    // Add images to delete
    if (product.imagesToDelete && product.imagesToDelete.length > 0) {
      product.imagesToDelete.forEach((imageUrl, index) => {
        formData.append(`imagesToDelete[${index}]`, imageUrl);
      });
    }

    return this.http.put<ProductDto>(`${this.api}/products/${id}`, formData);
  }

  // Delete product
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/products/${id}`);
  }

  // Delete multiple products
  deleteProducts(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.api}/products/bulk`, {
      body: ids
    });
  }

  // Get product ratings
  getProductRatings(productId: number, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<RatingDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<RatingDto>>(`${this.api}/products/${productId}/ratings`, { params });
  }

  // Add product rating
  addProductRating(productId: number, rating: { content: string; ratingNumber: number }): Observable<RatingDto> {
    const ratingDto = {
      content: rating.content,
      ratingNumber: rating.ratingNumber,
      productId: productId
    };
    return this.http.post<RatingDto>(`${this.api}/products/${productId}/ratings`, ratingDto);
  }

  // Stock management methods
  getInStockProducts(pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<ProductSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductSummaryDto>>(`${this.api}/products/in-stock`, { params });
  }

  getOutOfStockProducts(pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<ProductSummaryDto>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductSummaryDto>>(`${this.api}/products/out-of-stock`, { params });
  }

  getLowStockProducts(threshold: number = 10, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<ProductSummaryDto>> {
    let params = new HttpParams()
      .set('threshold', threshold.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<ProductSummaryDto>>(`${this.api}/products/low-stock`, { params });
  }

  updateProductStock(id: number, newStockQuantity: number): Observable<any> {
    return this.http.put<any>(`${this.api}/products/${id}/stock`, { newStockQuantity });
  }

  increaseProductStock(id: number, quantity: number): Observable<any> {
    return this.http.put<any>(`${this.api}/products/${id}/stock/increase`, { quantity });
  }

  reduceProductStock(id: number, quantity: number): Observable<any> {
    return this.http.put<any>(`${this.api}/products/${id}/stock/reduce`, { quantity });
  }

  setProductStockStatus(id: number, isInStock: boolean): Observable<any> {
    return this.http.put<any>(`${this.api}/products/${id}/stock/status`, { isInStock });
  }

  toggleProductActive(id: number): Observable<any> {
    return this.http.put<any>(`${this.api}/products/${id}/toggle-active`, {});
  }
}
