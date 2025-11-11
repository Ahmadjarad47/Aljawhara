import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceCategory } from './service-category';
import { CategoryDto, CategoryCreateDto, CategoryUpdateDto, PagedResult, CategoryFilters } from './category.model';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './category.html',
  styleUrl: './category.css',

})
export class Category implements OnInit {
  public categoryService = inject(ServiceCategory);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedCategories = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Search and filter signals
  searchTerm = signal('');
  statusFilter = signal<boolean | null>(null);
  
  // BehaviorSubjects for triggering API calls
  private filtersSubject = new BehaviorSubject<CategoryFilters>({});
  
  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    isActive: this.statusFilter() ?? undefined,
    searchTerm: this.searchTerm() || ''
  }));
  
  // Main data observables
  categories$: Observable<CategoryDto[]> = this.categoryService.categories$;
  pagination$ = this.categoryService.pagination$;
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // Computed observables
  categoriesLength$ = this.categories$.pipe(
    map(categories => categories.length)
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

  getCategoriesLength(): number {
    let length = 0;
    this.categories$.subscribe(categories => {
      length = categories.length;
    }).unsubscribe();
    return length;
  }

  newCategory: CategoryCreateDto = {
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: ''
  };

  editCategory: CategoryUpdateDto = {
    id: 0,
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: ''
  };

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadCategories(filters);
    });
  }

  ngOnInit() {
    // Initial load
    // this.loadCategories(this.filters$());
  }
  
  loadCategories(filters: CategoryFilters) {
    this.isLoading.set(true);
    this.categoryService.getCategories(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load categories');
        this.isLoading.set(false);
        console.error('Error loading categories:', error);
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

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.currentPage.set(1);
  }

  toggleCategorySelection(categoryId: number) {
    const current = this.selectedCategories();
    const index = current.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.set(current.filter(id => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
  }

  toggleSelectAll() {
    this.categories$.pipe(
      map(categories => {
        const current = this.selectedCategories();
        if (current.length === categories.length) {
          this.selectedCategories.set([]);
        } else {
          this.selectedCategories.set(categories.map(cat => cat.id));
        }
      })
    ).subscribe();
  }

  deleteSelected() {
    const selected = this.selectedCategories();
    if (selected.length === 0) return;

    const loadingToastId = this.toastService.loading('Deleting', `Deleting ${selected.length} categories...`);
    this.isLoading.set(true);
    this.categoryService.deleteCategories(selected).subscribe({
      next: () => {
        this.selectedCategories.set([]);
        this.loadCategories(this.filters$()); // Reload categories after deletion
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', `${selected.length} categories deleted successfully`);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete selected categories');
        this.isLoading.set(false);
        console.error('Error deleting categories:', error);
      }
    });
  }

  addCategory() {
    if (!this.newCategory.name || !this.newCategory.nameAr || !this.newCategory.description || !this.newCategory.descriptionAr) {
      this.toastService.warning('Validation Error', 'All fields are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Creating', 'Creating new category...');
    this.isLoading.set(true);
    this.categoryService.createCategory(this.newCategory).subscribe({
      next: (newCategory) => {
        this.resetNewCategory();
        this.showAddModal.set(false);
        this.loadCategories(this.filters$()); // Reload categories after creation
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Category created successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to create category');
        this.isLoading.set(false);
        console.error('Error creating category:', error);
      }
    });
  }

  editCategoryStart(category: CategoryDto) {
    this.editCategory = {
      id: category.id,
      name: category.name,
      nameAr: category.nameAr,
      description: category.description,
      descriptionAr: category.descriptionAr
    };
    this.showEditModal.set(true);
  }

  updateCategory() {
    if (!this.editCategory.name || !this.editCategory.nameAr || !this.editCategory.description || !this.editCategory.descriptionAr) {
      this.toastService.warning('Validation Error', 'All fields are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Updating', 'Updating category...');
    this.isLoading.set(true);
    this.categoryService.updateCategory(this.editCategory.id, this.editCategory).subscribe({
      next: (updatedCategory) => {
        this.showEditModal.set(false);
        this.loadCategories(this.filters$()); // Reload categories after update
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Category updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update category');
        this.isLoading.set(false);
        console.error('Error updating category:', error);
      }
    });
  }

  toggleCategoryStatus(categoryId: number) {
    const loadingToastId = this.toastService.loading('Updating', 'Updating category status...');
    this.isLoading.set(true);
    this.categoryService.toggleCategoryActive(categoryId).subscribe({
      next: (response) => {
        this.loadCategories(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Category status updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update category status');
        this.isLoading.set(false);
        console.error('Error updating category status:', error);
      }
    });
  }

  resetNewCategory() {
    this.newCategory = {
      name: '',
      nameAr: '',
      description: '',
      descriptionAr: ''
    };
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.resetNewCategory();
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
  
  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
