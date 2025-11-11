import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseDto, UserResponseDto } from '../../../auth/auth.models';
import { CreateAddressDto, UpdateAddressDto, UserAddressDto } from './setting.models';

@Injectable({ providedIn: 'root' })
export class SettingService {
  private api = `${environment.apiUrl}Auth/`;
  private http = inject(HttpClient);

  // User
  getCurrentUser(): Observable<ApiResponseDto<UserResponseDto>> {
    return this.http.get<ApiResponseDto<UserResponseDto>>(`${this.api}me`);
  }

  updateUsername(payload: { username: string }): Observable<ApiResponseDto> {
    return this.http.put<ApiResponseDto>(`${this.api}me/username`, payload);
    }

  updatePhoneNumber(payload: { phoneNumber: string }): Observable<ApiResponseDto> {
    return this.http.put<ApiResponseDto>(`${this.api}me/phone`, payload);
  }

  // Addresses
  getAddresses(): Observable<ApiResponseDto<UserAddressDto[]>> {
    return this.http.get<ApiResponseDto<UserAddressDto[]>>(`${this.api}addresses`);
  }

  getAddressById(addressId: number): Observable<ApiResponseDto<UserAddressDto>> {
    return this.http.get<ApiResponseDto<UserAddressDto>>(`${this.api}addresses/${addressId}`);
  }

  createAddress(dto: CreateAddressDto): Observable<ApiResponseDto<UserAddressDto>> {
    return this.http.post<ApiResponseDto<UserAddressDto>>(`${this.api}addresses`, dto);
  }

  updateAddress(dto: UpdateAddressDto): Observable<ApiResponseDto<UserAddressDto>> {
    return this.http.put<ApiResponseDto<UserAddressDto>>(`${this.api}addresses`, dto);
  }

  deleteAddress(addressId: number): Observable<ApiResponseDto> {
    return this.http.delete<ApiResponseDto>(`${this.api}addresses/${addressId}`);
  }
}


