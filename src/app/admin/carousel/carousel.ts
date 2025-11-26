import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarouselService } from './service-carousel';
import {
  CarouselDto,
  CarouselCreateWithFileDto,
  CarouselUpdateWithFileDto,
  CarouselFilters
} from './carousel.models';
import { Observable, map, combineLatest, BehaviorSubject } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './carousel.html',
  styleUrl: './carousel.css'
})
export class Carousel implements OnInit {
  public carouselService = inject(CarouselService);
  public toastService = inject(ToastService);

  // Signals for state
  selectedCarousels = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  isLoading = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Filters
  statusFilter = signal<boolean | null>(null);

  // Internal filters subject (if needed later)
  private filtersSubject = new BehaviorSubject<CarouselFilters>({});

  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    isActive: this.statusFilter() ?? undefined
  }));

  // Data streams
  carousels$: Observable<CarouselDto[]> = this.carouselService.carousels$;
  pagination$ = this.carouselService.pagination$;

  // Toasts
  get toasts() {
    return this.toastService.toasts$();
  }

  // Computed helpers
  carouselsLength$ = this.carousels$.pipe(map(items => items.length));

  currentPage$ = this.pagination$.pipe(map(p => p.currentPage));
  totalPages$ = this.pagination$.pipe(map(p => p.totalPages));

  pageNumbers$ = combineLatest([
    this.pagination$.pipe(map(p => p.totalPages)),
    this.pagination$.pipe(map(p => p.currentPage))
  ]).pipe(
    map(([totalPages, currentPage]) => this.getPageNumbers(totalPages, currentPage))
  );

  // Helper methods for template
  getCurrentPage(): number {
    let currentPage = 1;
    this.pagination$.subscribe(p => currentPage = p.currentPage).unsubscribe();
    return currentPage;
  }

  getTotalPages(): number {
    let totalPages = 0;
    this.pagination$.subscribe(p => totalPages = p.totalPages).unsubscribe();
    return totalPages;
  }

  getCarouselsLength(): number {
    let length = 0;
    this.carousels$.subscribe(items => length = items.length).unsubscribe();
    return length;
  }

  // Forms
  newCarousel: CarouselCreateWithFileDto = {
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    price: 0,
    image: null
  };

  editCarousel: CarouselUpdateWithFileDto = {
    id: 0,
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    price: 0,
    image: null,
    imageToDelete: null
  };

  // Keep the current image url for display in edit modal
  currentImageUrl: string | null = null;

  constructor() {
    effect(() => {
      const filters = this.filters$();
      this.loadCarousels(filters);
    });
  }

  ngOnInit(): void {
    // Initial load is handled by effect
  }

  loadCarousels(filters: CarouselFilters) {
    this.isLoading.set(true);
    this.carouselService.getCarousels(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load carousels');
        console.error('Error loading carousels:', error);
        this.isLoading.set(false);
      }
    });
  }

  // Pagination handlers
  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
  }

  // Filters
  onStatusFilterChange(status: boolean | null) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.statusFilter.set(null);
    this.currentPage.set(1);
  }

  // Selection
  toggleCarouselSelection(id: number) {
    const current = this.selectedCarousels();
    const index = current.indexOf(id);
    if (index > -1) {
      this.selectedCarousels.set(current.filter(x => x !== id));
    } else {
      this.selectedCarousels.set([...current, id]);
    }
  }

  toggleSelectAll() {
    this.carousels$.pipe(
      map(items => {
        const current = this.selectedCarousels();
        if (current.length === items.length) {
          this.selectedCarousels.set([]);
        } else {
          this.selectedCarousels.set(items.map(c => c.id));
        }
      })
    ).subscribe();
  }

  // CRUD
  onImageSelected(event: any, isEdit: boolean = false) {
    const file = event.target.files?.[0] as File | undefined;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Invalid file', 'Please select an image file');
      return;
    }

    if (isEdit) {
      this.editCarousel.image = file;
      this.editCarousel.imageToDelete = this.currentImageUrl;
    } else {
      this.newCarousel.image = file;
    }
  }

  addCarousel() {
    if (!this.newCarousel.title || !this.newCarousel.titleAr ||
        !this.newCarousel.description || !this.newCarousel.descriptionAr ||
        !this.newCarousel.price || !this.newCarousel.image) {
      this.toastService.warning('Validation Error', 'English/Arabic titles, descriptions, price and image are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Creating', 'Creating new carousel...');
    this.isLoading.set(true);

    this.carouselService.createCarousel(this.newCarousel).subscribe({
      next: () => {
        this.resetNewCarousel();
        this.showAddModal.set(false);
        this.loadCarousels(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Carousel created successfully');
      },
      error: (error) => {
        console.error('Error creating carousel:', error);
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to create carousel');
      }
    });
  }

  editCarouselStart(carousel: CarouselDto) {
    this.editCarousel = {
      id: carousel.id,
      title: carousel.title,
      titleAr: carousel.titleAr,
      description: carousel.description,
      descriptionAr: carousel.descriptionAr,
      price: carousel.price,
      image: null,
      imageToDelete: null
    };
    this.currentImageUrl = carousel.image;
    this.showEditModal.set(true);
  }

  updateCarousel() {
    if (!this.editCarousel.title || !this.editCarousel.titleAr ||
        !this.editCarousel.description || !this.editCarousel.descriptionAr ||
        !this.editCarousel.price) {
      this.toastService.warning('Validation Error', 'English/Arabic titles, descriptions and price are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Updating', 'Updating carousel...');
    this.isLoading.set(true);

    this.carouselService.updateCarousel(this.editCarousel.id, this.editCarousel).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.loadCarousels(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Carousel updated successfully');
      },
      error: (error) => {
        console.error('Error updating carousel:', error);
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update carousel');
      }
    });
  }

  deleteSelected() {
    const selected = this.selectedCarousels();
    if (selected.length === 0) return;

    const loadingToastId = this.toastService.loading('Deleting', `Deleting ${selected.length} carousel(s)...`);
    this.isLoading.set(true);

    this.carouselService.deleteCarousels(selected).subscribe({
      next: () => {
        this.selectedCarousels.set([]);
        this.loadCarousels(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Deleted', 'Selected carousels deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting carousels:', error);
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete selected carousels');
      }
    });
  }

  deleteCarouselSingle(id: number) {
    const loadingToastId = this.toastService.loading('Deleting', 'Deleting carousel...');
    this.isLoading.set(true);

    this.carouselService.deleteCarousel(id).subscribe({
      next: () => {
        this.loadCarousels(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Deleted', 'Carousel deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting carousel:', error);
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete carousel');
      }
    });
  }

  toggleCarouselStatus(id: number) {
    const loadingToastId = this.toastService.loading('Updating', 'Updating carousel status...');
    this.isLoading.set(true);

    this.carouselService.toggleCarouselActive(id).subscribe({
      next: () => {
        this.loadCarousels(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Carousel status updated successfully');
      },
      error: (error) => {
        console.error('Error updating carousel status:', error);
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update status');
      }
    });
  }

  resetNewCarousel() {
    this.newCarousel = {
      title: '',
      titleAr: '',
      description: '',
      descriptionAr: '',
      price: 0,
      image: null
    };
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.resetNewCarousel();
    this.editCarousel = {
      id: 0,
      title: '',
      titleAr: '',
      description: '',
      descriptionAr: '',
      price: 0,
      image: null,
      imageToDelete: null
    };
    this.currentImageUrl = null;
  }

  getPageNumbers(totalPages: number, currentPage: number): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Toast close
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }

  // Make Math available in template
  Math = Math;
}


