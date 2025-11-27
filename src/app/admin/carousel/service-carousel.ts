import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import {
  CarouselDto,
  CarouselCreateWithFileDto,
  CarouselUpdateWithFileDto,
  CarouselFilters,
  PagedResult,
  ToggleCarouselResponse
} from './carousel.models';

@Injectable({
  providedIn: 'root'
})
export class CarouselService {
  private api = environment.apiUrl + 'admin/carousels';
  private http = inject(HttpClient);

  private sourceCarousels = new BehaviorSubject<CarouselDto[]>([]);
  private sourcePagination = new BehaviorSubject<{
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  }>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });

  carousels$ = this.sourceCarousels.asObservable();
  pagination$ = this.sourcePagination.asObservable();

  // Get carousels with pagination and filters
  getCarousels(filters: CarouselFilters = {}): Observable<PagedResult<CarouselDto>> {
    let params = new HttpParams();

    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.pageNumber) {
      params = params.set('pageNumber', filters.pageNumber.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http.get<PagedResult<CarouselDto>>(`${this.api}`, { params }).pipe(
      shareReplay(1),
      tap((result) => {
        this.sourceCarousels.next(result.items);
        this.sourcePagination.next({
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          currentPage: result.page,
          pageSize: result.pageSize
        });
      })
    );
  }

  // Get single carousel by ID
  getCarouselById(id: number): Observable<CarouselDto> {
    return this.http.get<CarouselDto>(`${this.api}/${id}`);
  }

  // Create carousel with image file
  createCarousel(carousel: CarouselCreateWithFileDto): Observable<CarouselDto> {
    const formData = new FormData();

    formData.append('title', carousel.title);
    formData.append('titleAr', carousel.titleAr);
    formData.append('description', carousel.description);
    formData.append('descriptionAr', carousel.descriptionAr);
    formData.append('price', carousel.price.toString());

    if (carousel.productUrl) {
      formData.append('productUrl', carousel.productUrl);
    }

    if (carousel.image) {
      formData.append('image', carousel.image);
    }

    return this.http.post<CarouselDto>(`${this.api}`, formData);
  }

  // Update carousel with optional new image
  updateCarousel(id: number, carousel: CarouselUpdateWithFileDto): Observable<CarouselDto> {
    const formData = new FormData();

    formData.append('id', id.toString());
    formData.append('title', carousel.title);
    formData.append('titleAr', carousel.titleAr);
    formData.append('description', carousel.description);
    formData.append('descriptionAr', carousel.descriptionAr);
    formData.append('price', carousel.price.toString());

    if (carousel.productUrl) {
      formData.append('productUrl', carousel.productUrl);
    }

    if (carousel.image) {
      formData.append('image', carousel.image);
    }

    if (carousel.imageToDelete) {
      formData.append('imageToDelete', carousel.imageToDelete);
    }

    return this.http.put<CarouselDto>(`${this.api}/${id}`, formData);
  }

  // Delete carousel
  deleteCarousel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // Delete multiple carousels sequentially (no bulk endpoint on API)
  deleteCarousels(ids: number[]): Observable<void[]> {
    const requests = ids.map(id => this.deleteCarousel(id));
    return forkJoin(requests);
  }

  // Toggle active status
  toggleCarouselActive(id: number): Observable<ToggleCarouselResponse> {
    return this.http.put<ToggleCarouselResponse>(`${this.api}/${id}/toggle-active`, {});
  }
}


