import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoponeService, CouponFilters } from './copone-service';
import { 
  CouponDto, 
  CouponCreateDto, 
  CouponUpdateDto, 
  CouponType,
  PagedResult 
} from './copone.models';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-copone',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './copone.html',
  styleUrl: './copone.css',
})
export class Copone implements OnInit {
  public couponService = inject(CoponeService);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedCoupons = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  showValidationModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Search and filter signals
  searchTerm = signal('');
  statusFilter = signal<boolean | null>(null);
  typeFilter = signal<CouponType | null>(null);
  expiredFilter = signal<boolean | null>(null);
  
  // BehaviorSubjects for triggering API calls
  private filtersSubject = new BehaviorSubject<CouponFilters>({});
  
  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    isActive: this.statusFilter() ?? undefined,
    searchTerm: this.searchTerm() || '',
    type: this.typeFilter() ?? undefined,
    isExpired: this.expiredFilter() ?? undefined
  }));
  
  // Main data observables
  coupons$: Observable<CouponDto[]> = this.couponService.coupons$;
  pagination$ = this.couponService.pagination$;
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // Computed observables
  couponsLength$ = this.coupons$.pipe(
    map(coupons => coupons.length)
  );
  
  currentPage$ = this.pagination$.pipe(
    map(pagination => pagination.currentPage)
  );
  
  totalPages$ = this.pagination$.pipe(
    map(pagination => pagination.totalPages)
  );
  
  // Computed page numbers
  pageNumbers$ = combineLatest([
    this.pagination$.pipe(map(p => p.totalPages)),
    this.pagination$.pipe(map(p => p.currentPage))
  ]).pipe(
    map(([totalPages, currentPage]) => this.getPageNumbers(totalPages, currentPage))
  );

  // Helper methods for template
  getCurrentPage(): number {
    let currentPage = 1;
    this.pagination$.subscribe(pagination => {
      currentPage = pagination.currentPage;
    }).unsubscribe();
    return currentPage;
  }

  getTotalPages(): number {
    let totalPages = 0;
    this.pagination$.subscribe(pagination => {
      totalPages = pagination.totalPages;
    }).unsubscribe();
    return totalPages;
  }

  getCouponsLength(): number {
    let length = 0;
    this.coupons$.subscribe(coupons => {
      length = coupons.length;
    }).unsubscribe();
    return length;
  }

  newCoupon: CouponCreateDto = {
    code: '',
    description: '',
    type: CouponType.Percentage,
    value: 0,
    minimumOrderAmount: null,
    maximumDiscountAmount: null,
    startDate: '',
    endDate: '',
    usageLimit: null,
    isActive: true,
    isSingleUse: false,
    appUserId: null
  };

  editCoupon: CouponUpdateDto = {
    id: 0,
    code: '',
    description: '',
    type: CouponType.Percentage,
    value: 0,
    minimumOrderAmount: null,
    maximumDiscountAmount: null,
    startDate: '',
    endDate: '',
    usageLimit: null,
    isActive: true,
    isSingleUse: false,
    appUserId: null
  };

  // Validation modal data
  validationCode = signal('');
  validationOrderAmount = signal(0);
  validationUserId = signal('');

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadCoupons(filters);
    });
  }

  ngOnInit() {
    // Initial load
  }
  
  loadCoupons(filters: CouponFilters) {
    this.isLoading.set(true);
    this.couponService.getCoupons(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load coupons');
        this.isLoading.set(false);
        console.error('Error loading coupons:', error);
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(pageSize: number) {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
  }

  onSearch() {
    this.currentPage.set(1);
  }

  onStatusFilterChange(status: boolean | null) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onTypeFilterChange(type: CouponType | null) {
    this.typeFilter.set(type);
    this.currentPage.set(1);
  }

  onExpiredFilterChange(expired: boolean | null) {
    this.expiredFilter.set(expired);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.typeFilter.set(null);
    this.expiredFilter.set(null);
    this.currentPage.set(1);
  }

  toggleCouponSelection(couponId: number) {
    const current = this.selectedCoupons();
    const index = current.indexOf(couponId);
    if (index > -1) {
      this.selectedCoupons.set(current.filter(id => id !== couponId));
    } else {
      this.selectedCoupons.set([...current, couponId]);
    }
  }

  toggleSelectAll() {
    this.coupons$.pipe(
      map(coupons => {
        const current = this.selectedCoupons();
        if (current.length === coupons.length) {
          this.selectedCoupons.set([]);
        } else {
          this.selectedCoupons.set(coupons.map(coupon => coupon.id));
        }
      })
    ).subscribe();
  }

  deleteSelected() {
    const selected = this.selectedCoupons();
    if (selected.length === 0) return;

    const loadingToastId = this.toastService.loading('Deleting', `Deleting ${selected.length} coupons...`);
    this.isLoading.set(true);
    this.couponService.deleteCoupons(selected).subscribe({
      next: () => {
        this.selectedCoupons.set([]);
        this.loadCoupons(this.filters$()); // Reload coupons after deletion
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', `${selected.length} coupons deleted successfully`);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete selected coupons');
        this.isLoading.set(false);
        console.error('Error deleting coupons:', error);
      }
    });
  }

  addCoupon() {
    if (!this.newCoupon.code || !this.newCoupon.description || !this.newCoupon.startDate || !this.newCoupon.endDate) {
      this.toastService.warning('Validation Error', 'All required fields must be filled');
      return;
    }

    if (this.newCoupon.value <= 0) {
      this.toastService.warning('Validation Error', 'Value must be greater than 0');
      return;
    }

    const loadingToastId = this.toastService.loading('Creating', 'Creating new coupon...');
    this.isLoading.set(true);
    this.couponService.createCoupon(this.newCoupon).subscribe({
      next: (newCoupon) => {
        this.resetNewCoupon();
        this.showAddModal.set(false);
        this.loadCoupons(this.filters$()); // Reload coupons after creation
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Coupon created successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to create coupon');
        this.isLoading.set(false);
        console.error('Error creating coupon:', error);
      }
    });
  }

  editCouponStart(coupon: CouponDto) {
    this.editCoupon = {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minimumOrderAmount: coupon.minimumOrderAmount,
      maximumDiscountAmount: coupon.maximumDiscountAmount,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      usageLimit: coupon.usageLimit,
      isActive: coupon.isActive,
      isSingleUse: coupon.isSingleUse,
      appUserId: coupon.appUserId
    };
    this.showEditModal.set(true);
  }

  updateCoupon() {
    if (!this.editCoupon.code || !this.editCoupon.description || !this.editCoupon.startDate || !this.editCoupon.endDate) {
      this.toastService.warning('Validation Error', 'All required fields must be filled');
      return;
    }

    if (this.editCoupon.value <= 0) {
      this.toastService.warning('Validation Error', 'Value must be greater than 0');
      return;
    }

    const loadingToastId = this.toastService.loading('Updating', 'Updating coupon...');
    this.isLoading.set(true);
    this.couponService.updateCoupon(this.editCoupon.id, this.editCoupon).subscribe({
      next: (updatedCoupon) => {
        this.showEditModal.set(false);
        this.loadCoupons(this.filters$()); // Reload coupons after update
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Coupon updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update coupon');
        this.isLoading.set(false);
        console.error('Error updating coupon:', error);
      }
    });
  }

  toggleCouponStatus(couponId: number) {
    const loadingToastId = this.toastService.loading('Updating', 'Updating coupon status...');
    this.isLoading.set(true);
    this.couponService.activateCoupon(couponId).subscribe({
      next: (response) => {
        this.loadCoupons(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Coupon status updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update coupon status');
        this.isLoading.set(false);
        console.error('Error updating coupon status:', error);
      }
    });
  }

  deactivateCoupon(couponId: number) {
    const loadingToastId = this.toastService.loading('Updating', 'Deactivating coupon...');
    this.isLoading.set(true);
    this.couponService.deactivateCoupon(couponId).subscribe({
      next: (response) => {
        this.loadCoupons(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Coupon deactivated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to deactivate coupon');
        this.isLoading.set(false);
        console.error('Error deactivating coupon:', error);
      }
    });
  }

  cleanupExpiredCoupons() {
    const loadingToastId = this.toastService.loading('Cleaning', 'Cleaning up expired coupons...');
    this.isLoading.set(true);
    this.couponService.cleanupExpiredCoupons().subscribe({
      next: (response) => {
        this.loadCoupons(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Expired coupons cleaned up successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to cleanup expired coupons');
        this.isLoading.set(false);
        console.error('Error cleaning up expired coupons:', error);
      }
    });
  }

  validateCoupon() {
    if (!this.validationCode() || this.validationOrderAmount() <= 0) {
      this.toastService.warning('Validation Error', 'Code and order amount are required');
      return;
    }

    const validationDto = {
      code: this.validationCode(),
      orderAmount: this.validationOrderAmount(),
      userId: this.validationUserId() || null
    };

    const loadingToastId = this.toastService.loading('Validating', 'Validating coupon...');
    this.isLoading.set(true);
    this.couponService.validateCoupon(validationDto).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        if (result.isValid) {
          this.toastService.updateToSuccess(loadingToastId, 'Valid Coupon', 
            `Discount: $${result.discountAmount}, Final Amount: $${result.finalAmount}`);
        } else {
          this.toastService.updateToError(loadingToastId, 'Invalid Coupon', result.message);
        }
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to validate coupon');
        this.isLoading.set(false);
        console.error('Error validating coupon:', error);
      }
    });
  }

  resetNewCoupon() {
    this.newCoupon = {
      code: '',
      description: '',
      type: CouponType.Percentage,
      value: 0,
      minimumOrderAmount: null,
      maximumDiscountAmount: null,
      startDate: '',
      endDate: '',
      usageLimit: null,
      isActive: true,
      isSingleUse: false,
      appUserId: null
    };
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showValidationModal.set(false);
    this.resetNewCoupon();
    this.validationCode.set('');
    this.validationOrderAmount.set(0);
    this.validationUserId.set('');
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

  // Make Math available in template
  Math = Math;
  
  // Get coupon types for dropdown
  getCouponTypes(): CouponType[] {
    return this.couponService.getCouponTypes();
  }

  getCouponTypeName(type: CouponType): string {
    return this.couponService.getCouponTypeName(type);
  }

  // Format date for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Check if coupon is expired
  isCouponExpired(endDate: string): boolean {
    return new Date(endDate) < new Date();
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
