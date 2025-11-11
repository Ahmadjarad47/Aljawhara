import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { SubCategoryDto, SubCategoryCreateDto, SubCategoryUpdateDto, PagedResult, SubCategoryFilters, ToggleResponse } from './subCategory.models';

@Injectable({
  providedIn: 'root'
})
export class Subcategory {
  private api = environment.apiUrl + 'admin/categories';
  private http = inject(HttpClient);
  
  private sourceSubCategories = new BehaviorSubject<SubCategoryDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  subCategories$ = this.sourceSubCategories.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get subcategories with pagination and filters
  getSubCategories(filters: SubCategoryFilters = {}): Observable<PagedResult<SubCategoryDto>> {
    let params = new HttpParams();
    console.log('Getting subcategories with filters:', filters);
    
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<SubCategoryDto>>(`${this.api}/subcategories`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        console.log(result);
        this.sourceSubCategories.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get subcategories by category ID
  getSubCategoriesByCategory(categoryId: number, includeRelated: boolean = true, pageNumber: number = 1, pageSize: number = 20): Observable<PagedResult<SubCategoryDto>> {
    let params = new HttpParams()
      .set('includeRelated', includeRelated.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResult<SubCategoryDto>>(`${this.api}/${categoryId}/subcategories`, { params }).pipe(
      tap((result) => {
        this.sourceSubCategories.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  getAllSubCategories(): Observable<SubCategoryDto[]> {
    return this.http.get<{[key: string]: string}>(`${this.api}/subcategories/all`).pipe(
      shareReplay(1),
      tap(response => console.log('Raw SubCategory API response:', response)),
      map(response => {
        return Object.entries(response).map(([id, name]) => ({
          id: parseInt(id),
          name: name,
          nameAr: name,
          description: '',
          descriptionAr: '',
          categoryId: 0,   // إذا عندك علاقة مع Category لازم تهيئها
          categoryName: '',
          categoryNameAr: '',
          productCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: null
        }));
      })
    );
  }
  

  // Get subcategory by ID
  getSubCategoryById(id: number): Observable<SubCategoryDto> {
    return this.http.get<SubCategoryDto>(`${this.api}/subcategories/${id}`);
  }

  // Create new subcategory
  createSubCategory(subCategory: SubCategoryCreateDto): Observable<SubCategoryDto> {
    return this.http.post<SubCategoryDto>(`${this.api}/subcategories`, subCategory);
  }

  // Update existing subcategory
  updateSubCategory(id: number, subCategory: SubCategoryUpdateDto): Observable<SubCategoryDto> {
    return this.http.put<SubCategoryDto>(`${this.api}/subcategories/${id}`, subCategory);
  }

  // Delete single subcategory
  deleteSubCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/subcategories/${id}`);
  }

  // Delete multiple subcategories (if you implement bulk delete endpoint)
  deleteSubCategories(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.api}/subcategories/bulk`, {
      body: { ids }
    });
  }

  // Toggle subcategory active status
  toggleSubCategoryActive(id: number): Observable<ToggleResponse> {
    return this.http.put<ToggleResponse>(`${this.api}/subcategories/${id}/toggle-active`, {});
  }
}
