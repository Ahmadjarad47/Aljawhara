import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { CategoryDto, CategoryCreateDto, CategoryUpdateDto, PagedResult, CategoryFilters, ToggleResponse } from './category.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceCategory {
  private api = environment.apiUrl + 'admin';
  private http = inject(HttpClient);
  private sourceCategory = new BehaviorSubject<CategoryDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  categories$ = this.sourceCategory.asObservable();
  pagination$ = this.sourcePagination.asObservable();
  // Get categories with pagination and filters
  getCategories(filters: CategoryFilters = {}): Observable<PagedResult<CategoryDto>> {
    let params = new HttpParams();
    console.log('Getting categories with filters:', filters);
    
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<CategoryDto>>(`${this.api}/categories`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        console.log(result);
        this.sourceCategory.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get all categories (for dropdowns, etc.)
  getAllCategories(): Observable<CategoryDto[]> {
    return this.http.get<{[key: string]: string}>(`${this.api}/categories/all`).pipe(
      shareReplay(1),
      tap(response => console.log('Raw API response:', response)),
      map(response => {
        // Transform the object response to CategoryDto array
        return Object.entries(response).map(([id, name]) => ({
          id: parseInt(id),
          name: name,
          nameAr: name, // Assuming same name for both languages
          description: '',
          descriptionAr: '',
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

  // Get category by ID
  getCategoryById(id: number): Observable<CategoryDto> {
    return this.http.get<CategoryDto>(`${this.api}/categories/${id}`);
  }

  // Create new category
  createCategory(category: CategoryCreateDto): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${this.api}/categories`, category);
  }

  // Update existing category
  updateCategory(id: number, category: CategoryUpdateDto): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.api}/categories/${id}`, category);
  }

  // Delete single category
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/categories/${id}`);
  }

  // Delete multiple categories (if you implement bulk delete endpoint)
  deleteCategories(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.api}/categories/bulk`, {
      body: ids
    });
  }
  

  // Toggle category active status
  toggleCategoryActive(id: number): Observable<ToggleResponse> {
    return this.http.put<ToggleResponse>(`${this.api}/categories/${id}/toggle-active`, {});
  }

  
}
