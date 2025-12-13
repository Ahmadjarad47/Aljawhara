import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
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
export class Category implements OnInit, OnDestroy {
  public categoryService = inject(ServiceCategory);
  public toastService = inject(ToastService);
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      categoryManagement: 'إدارة الفئات',
      manageJobCategories: 'إدارة فئات الوظائف وإعداداتها',
      deleteSelected: 'حذف المحدد',
      addCategory: 'إضافة فئة',
      searchCategories: 'البحث في الفئات...',
      allStatus: 'جميع الحالات',
      active: 'نشط',
      inactive: 'غير نشط',
      perPage: 'لكل صفحة',
      clearFilters: 'مسح الفلاتر',
      categoryNameEN: 'اسم الفئة (إنجليزي)',
      categoryNameAR: 'اسم الفئة (عربي)',
      descriptionEN: 'الوصف (إنجليزي)',
      descriptionAR: 'الوصف (عربي)',
      productCount: 'عدد المنتجات',
      status: 'الحالة',
      actions: 'الإجراءات',
      products: 'منتجات',
      edit: 'تعديل',
      deactivate: 'إلغاء التفعيل',
      activate: 'تفعيل',
      noCategoriesFound: 'لم يتم العثور على فئات',
      addNewCategory: 'إضافة فئة جديدة',
      enterCategoryNameEN: 'أدخل اسم الفئة بالإنجليزية',
      enterCategoryNameAR: 'أدخل اسم الفئة بالعربية',
      enterDescriptionEN: 'أدخل وصف الفئة بالإنجليزية',
      enterDescriptionAR: 'أدخل وصف الفئة بالعربية',
      cancel: 'إلغاء',
      updateCategory: 'تحديث الفئة',
      editCategory: 'تعديل الفئة',
      showing: 'عرض',
      to: 'إلى',
      of: 'من',
      categories: 'فئات',
      error: 'خطأ',
      success: 'نجح',
      failedToLoad: 'فشل تحميل الفئات',
      deleting: 'جاري الحذف',
      deletingCategories: 'جاري حذف الفئات',
      categoriesDeleted: 'تم حذف الفئات بنجاح',
      failedToDelete: 'فشل حذف الفئات المحددة',
      validationError: 'خطأ في التحقق',
      allFieldsRequired: 'جميع الحقول مطلوبة',
      creating: 'جاري الإنشاء',
      creatingCategory: 'جاري إنشاء فئة جديدة',
      categoryCreated: 'تم إنشاء الفئة بنجاح',
      failedToCreate: 'فشل إنشاء الفئة',
      updating: 'جاري التحديث',
      updatingCategory: 'جاري تحديث الفئة',
      categoryUpdated: 'تم تحديث الفئة بنجاح',
      failedToUpdate: 'فشل تحديث الفئة',
      updatingStatus: 'جاري تحديث حالة الفئة',
      statusUpdated: 'تم تحديث حالة الفئة بنجاح',
      failedToUpdateStatus: 'فشل تحديث حالة الفئة'
    },
    en: {
      categoryManagement: 'Category Management',
      manageJobCategories: 'Manage job categories and their settings',
      deleteSelected: 'Delete Selected',
      addCategory: 'Add Category',
      searchCategories: 'Search categories...',
      allStatus: 'All Status',
      active: 'Active',
      inactive: 'Inactive',
      perPage: 'per page',
      clearFilters: 'Clear Filters',
      categoryNameEN: 'Category Name (EN)',
      categoryNameAR: 'Category Name (AR)',
      descriptionEN: 'Description (EN)',
      descriptionAR: 'Description (AR)',
      productCount: 'Product Count',
      status: 'Status',
      actions: 'Actions',
      products: 'products',
      edit: 'Edit',
      deactivate: 'Deactivate',
      activate: 'Activate',
      noCategoriesFound: 'No categories found',
      addNewCategory: 'Add New Category',
      enterCategoryNameEN: 'Enter category name in English',
      enterCategoryNameAR: 'Enter category name in Arabic',
      enterDescriptionEN: 'Enter category description in English',
      enterDescriptionAR: 'Enter category description in Arabic',
      cancel: 'Cancel',
      updateCategory: 'Update Category',
      editCategory: 'Edit Category',
      showing: 'Showing',
      to: 'to',
      of: 'of',
      categories: 'categories',
      error: 'Error',
      success: 'Success',
      failedToLoad: 'Failed to load categories',
      deleting: 'Deleting',
      deletingCategories: 'Deleting categories',
      categoriesDeleted: 'categories deleted successfully',
      failedToDelete: 'Failed to delete selected categories',
      validationError: 'Validation Error',
      allFieldsRequired: 'All fields are required',
      creating: 'Creating',
      creatingCategory: 'Creating new category',
      categoryCreated: 'Category created successfully',
      failedToCreate: 'Failed to create category',
      updating: 'Updating',
      updatingCategory: 'Updating category',
      categoryUpdated: 'Category updated successfully',
      failedToUpdate: 'Failed to update category',
      updatingStatus: 'Updating category status',
      statusUpdated: 'Category status updated successfully',
      failedToUpdateStatus: 'Failed to update category status'
    }
  };

  // Translation helper
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations.ar] || key;
  }
  
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
    
    // Check language on initialization
    this.checkLanguage();
    
    // Set up periodic language checking
    this.languageCheckInterval = setInterval(() => {
      this.checkLanguage();
    }, 1000);
  }

  checkLanguage(): void {
    const htmlLang = document.documentElement.lang || document.documentElement.getAttribute('lang');
    const dir = document.documentElement.dir;
    
    if (htmlLang === 'ar' || dir === 'rtl') {
      this.currentLanguage.set('ar');
      document.documentElement.dir = 'rtl';
    } else {
      this.currentLanguage.set('en');
      document.documentElement.dir = 'ltr';
    }
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
  
  loadCategories(filters: CategoryFilters) {
    this.isLoading.set(true);
    this.categoryService.getCategories(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error(this.t('error'), this.t('failedToLoad'));
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

    const loadingToastId = this.toastService.loading(this.t('deleting'), `${this.t('deletingCategories')} ${selected.length}...`);
    this.isLoading.set(true);
    this.categoryService.deleteCategories(selected).subscribe({
      next: () => {
        this.selectedCategories.set([]);
        this.loadCategories(this.filters$()); // Reload categories after deletion
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), `${selected.length} ${this.t('categoriesDeleted')}`);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('failedToDelete'));
        this.isLoading.set(false);
        console.error('Error deleting categories:', error);
      }
    });
  }

  addCategory() {
    if (!this.newCategory.name || !this.newCategory.nameAr || !this.newCategory.description || !this.newCategory.descriptionAr) {
      this.toastService.warning(this.t('validationError'), this.t('allFieldsRequired'));
      return;
    }

    const loadingToastId = this.toastService.loading(this.t('creating'), this.t('creatingCategory'));
    this.isLoading.set(true);
    this.categoryService.createCategory(this.newCategory).subscribe({
      next: (newCategory) => {
        this.resetNewCategory();
        this.showAddModal.set(false);
        this.loadCategories(this.filters$()); // Reload categories after creation
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('categoryCreated'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('failedToCreate'));
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
      this.toastService.warning(this.t('validationError'), this.t('allFieldsRequired'));
      return;
    }

    const loadingToastId = this.toastService.loading(this.t('updating'), this.t('updatingCategory'));
    this.isLoading.set(true);
    this.categoryService.updateCategory(this.editCategory.id, this.editCategory).subscribe({
      next: (updatedCategory) => {
        this.showEditModal.set(false);
        this.loadCategories(this.filters$()); // Reload categories after update
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('categoryUpdated'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('failedToUpdate'));
        this.isLoading.set(false);
        console.error('Error updating category:', error);
      }
    });
  }

  toggleCategoryStatus(categoryId: number) {
    const loadingToastId = this.toastService.loading(this.t('updating'), this.t('updatingStatus'));
    this.isLoading.set(true);
    this.categoryService.toggleCategoryActive(categoryId).subscribe({
      next: (response) => {
        this.loadCategories(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, this.t('success'), this.t('statusUpdated'));
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, this.t('error'), this.t('failedToUpdateStatus'));
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
