import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { 
  CouponDto, 
  CouponCreateDto, 
  CouponUpdateDto, 
  CouponValidationDto, 
  CouponValidationResultDto,
  CouponSummaryDto,
  CouponType,
  PagedResult 
} from './copone.models';

export interface CouponFilters {
  pageNumber?: number;
  pageSize?: number;
  isActive?: boolean;
  searchTerm?: string;
  type?: CouponType;
  isExpired?: boolean;
}

export interface ToggleResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoponeService {
  private api = environment.apiUrl + 'admin/coupons';
  private http = inject(HttpClient);
  private sourceCoupons = new BehaviorSubject<CouponDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  coupons$ = this.sourceCoupons.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get all coupons with pagination and filters
  getCoupons(filters: CouponFilters = {}): Observable<PagedResult<CouponDto>> {
    let params = new HttpParams();
    console.log('Getting coupons with filters:', filters);
    
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.type !== undefined) {
      params = params.set('type', filters.type.toString());
    }
    if (filters.isExpired !== undefined) {
      params = params.set('isExpired', filters.isExpired.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<CouponDto>>(`${this.api}`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        console.log(result);
        this.sourceCoupons.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get active coupons
  getActiveCoupons(filters: CouponFilters = {}): Observable<PagedResult<CouponDto>> {
    let params = new HttpParams();
    
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.type !== undefined) {
      params = params.set('type', filters.type.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<CouponDto>>(`${this.api}/active`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceCoupons.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get expired coupons
  getExpiredCoupons(filters: CouponFilters = {}): Observable<PagedResult<CouponDto>> {
    let params = new HttpParams();
    
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.type !== undefined) {
      params = params.set('type', filters.type.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<CouponDto>>(`${this.api}/expired`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceCoupons.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get coupon by ID
  getCouponById(id: number): Observable<CouponDto> {
    return this.http.get<CouponDto>(`${this.api}/${id}`);
  }

  // Get coupon by code
  getCouponByCode(code: string): Observable<CouponDto> {
    return this.http.get<CouponDto>(`${this.api}/code/${code}`);
  }

  // Create new coupon
  createCoupon(coupon: CouponCreateDto): Observable<CouponDto> {
    return this.http.post<CouponDto>(`${this.api}`, coupon);
  }

  // Update existing coupon
  updateCoupon(id: number, coupon: CouponUpdateDto): Observable<CouponDto> {
    return this.http.put<CouponDto>(`${this.api}/${id}`, coupon);
  }

  // Delete coupon
  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // Delete multiple coupons
  deleteCoupons(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.api}/bulk`, {
      body: ids
    });
  }

  // Activate coupon
  activateCoupon(id: number): Observable<ToggleResponse> {
    return this.http.put<ToggleResponse>(`${this.api}/${id}/activate`, {});
  }

  // Deactivate coupon
  deactivateCoupon(id: number): Observable<ToggleResponse> {
    return this.http.put<ToggleResponse>(`${this.api}/${id}/deactivate`, {});
  }

  // Cleanup expired coupons
  cleanupExpiredCoupons(): Observable<ToggleResponse> {
    return this.http.post<ToggleResponse>(`${this.api}/cleanup-expired`, {});
  }

  // Validate coupon
  validateCoupon(validationDto: CouponValidationDto): Observable<CouponValidationResultDto> {
    return this.http.post<CouponValidationResultDto>(`${this.api}/validate`, validationDto);
  }

  // Get coupon types enum
  getCouponTypes(): CouponType[] {
    return Object.values(CouponType).filter(value => typeof value === 'number') as CouponType[];
  }

  // Get coupon type name
  getCouponTypeName(type: CouponType): string {
    switch (type) {
      case CouponType.Percentage:
        return 'Percentage';
      case CouponType.FixedAmount:
        return 'Fixed Amount';
      case CouponType.FreeShipping:
        return 'Free Shipping';
      default:
        return 'Unknown';
    }
  }
}
