import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subcategory } from './subcategory';
import { SubCategoryDto, SubCategoryCreateDto, SubCategoryUpdateDto, PagedResult, SubCategoryFilters } from './subCategory.models';
import { ServiceCategory } from '../category/service-category';
import { CategoryDto } from '../category/category.model';
import { ToastService } from '../../services/toast.service';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-sub-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sub-category.html',
  styleUrl: './sub-category.css',
})
export class SubCategory implements OnInit {
  public subCategoryService = inject(Subcategory);
  public categoryService = inject(ServiceCategory);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedSubCategories = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Search and filter signals
  searchTerm = signal('');
  statusFilter = signal<boolean | null>(null);
  categoryFilter = signal<number | null>(null);
  
  // Category search signals
  categorySearchTerm = signal('');
  showCategoryDropdown = signal(false);
  
  // Edit modal category search signals
  editCategorySearchTerm = signal('');
  showEditCategoryDropdown = signal(false);
  
  // BehaviorSubjects for triggering API calls
  private filtersSubject = new BehaviorSubject<SubCategoryFilters>({});
  
  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    isActive: this.statusFilter() ?? undefined,
    searchTerm: this.searchTerm() || '',
    categoryId: this.categoryFilter() ?? undefined
  }));
  
  // Main data observables
  subCategories$: Observable<SubCategoryDto[]> = this.subCategoryService.subCategories$;
  pagination$ = this.subCategoryService.pagination$;
  categories$: Observable<CategoryDto[]> = this.categoryService.getAllCategories();
  
  // Filtered categories based on search
  filteredCategories$ = this.categories$.pipe(
    map(categories => {
      const searchTerm = this.categorySearchTerm().toLowerCase();
      if (!searchTerm) return categories;
      return categories.filter(category => 
        category.name.toLowerCase().includes(searchTerm) ||
        category.nameAr.toLowerCase().includes(searchTerm)
      );
    })
  );
  
  // Filtered categories for edit modal
  filteredEditCategories$ = this.categories$.pipe(
    map(categories => {
      const searchTerm = this.editCategorySearchTerm().toLowerCase();
      if (!searchTerm) return categories;
      return categories.filter(category => 
        category.name.toLowerCase().includes(searchTerm) ||
        category.nameAr.toLowerCase().includes(searchTerm)
      );
    })
  );
  
  // Computed observables
  subCategoriesLength$ = this.subCategories$.pipe(
    map(subCategories => subCategories.length)
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

  getSubCategoriesLength(): number {
    let length = 0;
    this.subCategories$.subscribe(subCategories => {
      length = subCategories.length;
    }).unsubscribe();
    return length;
  }

  newSubCategory: SubCategoryCreateDto = {
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    categoryId: 0
  };

  editSubCategory: SubCategoryUpdateDto = {
    id: 0,
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    categoryId: 0
  };

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadSubCategories(filters);
    });
  }

  ngOnInit() {
    // Initial load
    // this.loadSubCategories(this.filters$());
  }
  
  loadSubCategories(filters: SubCategoryFilters) {
    this.isLoading.set(true);
    this.subCategoryService.getSubCategories(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load subcategories');
        this.isLoading.set(false);
        console.error('Error loading subcategories:', error);
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

  onCategoryFilterChange(categoryId: number | null) {
    this.categoryFilter.set(categoryId);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.categoryFilter.set(null);
    this.currentPage.set(1);
  }

  toggleSubCategorySelection(subCategoryId: number) {
    const current = this.selectedSubCategories();
    const index = current.indexOf(subCategoryId);
    if (index > -1) {
      this.selectedSubCategories.set(current.filter(id => id !== subCategoryId));
    } else {
      this.selectedSubCategories.set([...current, subCategoryId]);
    }
  }

  toggleSelectAll() {
    this.subCategories$.pipe(
      map(subCategories => {
        const current = this.selectedSubCategories();
        if (current.length === subCategories.length) {
          this.selectedSubCategories.set([]);
        } else {
          this.selectedSubCategories.set(subCategories.map(subCat => subCat.id));
        }
      })
    ).subscribe();
  }

  deleteSelected() {
    const selected = this.selectedSubCategories();
    if (selected.length === 0) return;

    const loadingToastId = this.toastService.loading('Deleting', `Deleting ${selected.length} sub-category(ies)...`);
    this.isLoading.set(true);
    this.subCategoryService.deleteSubCategories(selected).subscribe({
      next: () => {
        this.selectedSubCategories.set([]);
        this.loadSubCategories(this.filters$()); // Reload subcategories after deletion
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', `Successfully deleted ${selected.length} sub-category(ies)`);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to delete selected subcategories');
        this.isLoading.set(false);
        console.error('Error deleting subcategories:', error);
      }
    });
  }

  addSubCategory() {
    if (!this.newSubCategory.name || !this.newSubCategory.nameAr || !this.newSubCategory.description || !this.newSubCategory.descriptionAr || !this.newSubCategory.categoryId) {
      this.toastService.warning('Validation Error', 'All fields are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Creating', 'Creating new sub-category...');
    this.isLoading.set(true);
    this.subCategoryService.createSubCategory(this.newSubCategory).subscribe({
      next: (newSubCategory) => {
        this.resetNewSubCategory();
        this.showAddModal.set(false);
        this.loadSubCategories(this.filters$()); // Reload subcategories after creation
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Sub-category created successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to create subcategory');
        this.isLoading.set(false);
        console.error('Error creating subcategory:', error);
      }
    });
  }

  editSubCategoryStart(subCategory: SubCategoryDto) {
    this.editSubCategory = {
      id: subCategory.id,
      name: subCategory.name,
      nameAr: subCategory.nameAr,
      description: subCategory.description,
      descriptionAr: subCategory.descriptionAr,
      categoryId: subCategory.categoryId
    };
    
    // Set the category search term to the current category name
    this.categories$.pipe(
      map(categories => categories.find(cat => cat.id === subCategory.categoryId))
    ).subscribe(category => {
      if (category) {
        this.editCategorySearchTerm.set(category.name);
      }
    });
    
    this.showEditModal.set(true);
  }

  updateSubCategory() {
    if (!this.editSubCategory.name || !this.editSubCategory.nameAr || !this.editSubCategory.description || !this.editSubCategory.descriptionAr || !this.editSubCategory.categoryId) {
      this.toastService.warning('Validation Error', 'All fields are required');
      return;
    }

    const loadingToastId = this.toastService.loading('Updating', 'Updating sub-category...');
    this.isLoading.set(true);
    this.subCategoryService.updateSubCategory(this.editSubCategory.id, this.editSubCategory).subscribe({
      next: (updatedSubCategory) => {
        this.showEditModal.set(false);
        this.loadSubCategories(this.filters$()); // Reload subcategories after update
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Sub-category updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update subcategory');
        this.isLoading.set(false);
        console.error('Error updating subcategory:', error);
      }
    });
  }

  toggleSubCategoryStatus(subCategoryId: number) {
    const loadingToastId = this.toastService.loading('Updating', 'Updating sub-category status...');
    this.isLoading.set(true);
    this.subCategoryService.toggleSubCategoryActive(subCategoryId).subscribe({
      next: (response) => {
        this.loadSubCategories(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Sub-category status updated successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to update subcategory status');
        this.isLoading.set(false);
        console.error('Error updating subcategory status:', error);
      }
    });
  }

  resetNewSubCategory() {
    this.newSubCategory = {
      name: '',
      nameAr: '',
      description: '',
      descriptionAr: '',
      categoryId: 0
    };
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.resetNewSubCategory();
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

  // Category search methods
  onCategorySearch(searchTerm: string) {
    this.categorySearchTerm.set(searchTerm);
    this.showCategoryDropdown.set(true);
  }

  selectCategory(category: CategoryDto) {
    this.newSubCategory.categoryId = category.id;
    this.categorySearchTerm.set(category.name);
    this.showCategoryDropdown.set(false);
  }

  toggleCategoryDropdown() {
    this.showCategoryDropdown.set(!this.showCategoryDropdown());
  }

  onCategoryInputFocus() {
    this.showCategoryDropdown.set(true);
  }

  onCategoryInputBlur() {
    // Delay hiding to allow for click events
    setTimeout(() => {
      this.showCategoryDropdown.set(false);
    }, 200);
  }

  // Edit modal category search methods
  onEditCategorySearch(searchTerm: string) {
    this.editCategorySearchTerm.set(searchTerm);
    this.showEditCategoryDropdown.set(true);
  }

  selectEditCategory(category: CategoryDto) {
    this.editSubCategory.categoryId = category.id;
    this.editCategorySearchTerm.set(category.name);
    this.showEditCategoryDropdown.set(false);
  }

  toggleEditCategoryDropdown() {
    this.showEditCategoryDropdown.set(!this.showEditCategoryDropdown());
  }

  onEditCategoryInputFocus() {
    this.showEditCategoryDropdown.set(true);
  }

  onEditCategoryInputBlur() {
    // Delay hiding to allow for click events
    setTimeout(() => {
      this.showEditCategoryDropdown.set(false);
    }, 200);
  }

  // Make Math available in template
  Math = Math;
}
