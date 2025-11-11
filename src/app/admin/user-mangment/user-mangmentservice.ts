import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { 
  UserManagerDto, 
  BlockUserDto, 
  UnblockUserDto, 
  ChangeUserPasswordDto, 
  ChangeUserEmailDto, 
  SendEmailConfirmationDto, 
  UserSearchDto,
  PagedResult,
  UserAddressDto,
  ApiResponseDto 
} from './model.user.admin';

@Injectable({
  providedIn: 'root'
})
export class UserMangmentservice {
  private api = environment.apiUrl + 'admin/user-manager';
  private http = inject(HttpClient);
  private sourceUsers = new BehaviorSubject<UserManagerDto[]>([]);
  private sourcePagination = new BehaviorSubject<{totalCount: number, totalPages: number, currentPage: number, pageSize: number}>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  users$ = this.sourceUsers.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get users with pagination and filters
  getUsers(filters: UserSearchDto): Observable<PagedResult<UserManagerDto>> {
    let params = new HttpParams();
    console.log('Getting users with filters:', filters);
    
    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.isBlocked !== null) {
      params = params.set('isBlocked', filters.isBlocked.toString());
    }
    if (filters.emailConfirmed !== null) {
      params = params.set('emailConfirmed', filters.emailConfirmed.toString());
    }
    if (filters.isActive !== null) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<UserManagerDto>>(`${this.api}/users`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        console.log(result);
        this.sourceUsers.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get user by ID
  getUserById(userId: string): Observable<UserManagerDto> {
    return this.http.get<UserManagerDto>(`${this.api}/users/${userId}`);
  }

  // Block user
  blockUser(blockUserDto: BlockUserDto): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/block`, blockUserDto);
  }

  // Unblock user
  unblockUser(unblockUserDto: UnblockUserDto): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/unblock`, unblockUserDto);
  }

  // Change user password
  changeUserPassword(changePasswordDto: ChangeUserPasswordDto): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/change-password`, changePasswordDto);
  }

  // Change user email
  changeUserEmail(changeEmailDto: ChangeUserEmailDto): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/change-email`, changeEmailDto);
  }

  // Send email confirmation
  sendEmailConfirmation(sendEmailDto: SendEmailConfirmationDto): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/send-email-confirmation`, sendEmailDto);
  }

  // Confirm user email
  confirmUserEmail(userId: string, token: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/${userId}/confirm-email`, null, {
      params: { token }
    });
  }

  // Reset user password
  resetUserPassword(userId: string, newPassword: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.api}/users/${userId}/reset-password`, newPassword);
  }

  // Get user addresses
  getUserAddresses(userId: string): Observable<UserAddressDto[]> {
    return this.http.get<ApiResponseDto<UserAddressDto[]>>(`${this.api}/addresses?userId=${userId}`).pipe(
      map(response => response.data)
    );
  }
}
