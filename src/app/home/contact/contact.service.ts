import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponseDto } from '../../auth/auth.models';

export interface ContactDto {
  name: string;
  email: string;
  phoneNumber?: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}Auth/contact`;

  sendContactMessage(contactDto: ContactDto): Observable<ApiResponseDto> {
    return this.http.post<ApiResponseDto>(this.apiUrl, contactDto);
  }
}

