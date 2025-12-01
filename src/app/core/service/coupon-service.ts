import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CouponDto, 
  CouponValidationDto, 
  CouponValidationResultDto,
  CouponSummaryDto
} from '../Models/coupon';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private api = environment.apiUrl + 'coupons';
  private http = inject(HttpClient);

  // Get all coupons
  getCoupons(): Observable<CouponSummaryDto[]> {
    return this.http.get<CouponSummaryDto[]>(`${this.api}`);
  }

  // Get active coupons
  getActiveCoupons(): Observable<CouponDto[]> {
    return this.http.get<CouponDto[]>(`${this.api}/active`);
  }

  // Get coupon by ID
  getCouponById(id: number): Observable<CouponDto> {
    return this.http.get<CouponDto>(`${this.api}/${id}`);
  }

  // Get coupon by code
  getCouponByCode(code: string): Observable<CouponDto> {
    return this.http.get<CouponDto>(`${this.api}/code/${code}`);
  }

  // Validate coupon
  validateCoupon(validationDto: CouponValidationDto): Observable<CouponValidationResultDto> {
    return this.http.post<CouponValidationResultDto>(`${this.api}/validate`, validationDto);
  }

  // Get user's coupons (requires authentication)
  getMyCoupons(): Observable<CouponDto[]> {
    return this.http.get<CouponDto[]>(`${this.api}/my-coupons`);
  }
}

