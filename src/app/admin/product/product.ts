import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceProduct } from './service-product';
import { ServiceCategory } from '../category/service-category';
import { Subcategory } from '../sub-category/subcategory';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';
import { 
  ProductDto, 
  ProductCreateWithFilesDto, 
  ProductUpdateWithFilesDto, 
  ProductDetailCreateDto,
  ProductFilters 
} from './product.models';
import { CategoryDto } from '../category/category.model';
import { SubCategoryDto } from '../sub-category/subCategory.models';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './product.html',
  styleUrl: './product.css'
})
export class Product implements OnInit, OnDestroy {
  public productService = inject(ServiceProduct);
  public categoryService = inject(ServiceCategory);
  public subCategoryService = inject(Subcategory);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedProducts = signal<number[]>([]);
  showAddModal = signal(false);
  showEditModal = signal(false);
  showStockModal = signal(false);
  showDetailsModal = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Search and filter signals
  searchTerm = signal('');
  statusFilter = signal<boolean | null>(null);
  categoryFilter = signal<number | null>(null);
  subCategoryFilter = signal<number | null>(null);
  minPriceFilter = signal<number | null>(null);
  maxPriceFilter = signal<number | null>(null);
  
  // Category and subcategory search signals
  categorySearchTerm = signal('');
  showCategoryDropdown = signal(false);
  subCategorySearchTerm = signal('');
  showSubCategoryDropdown = signal(false);
  
  // Edit modal search signals
  editCategorySearchTerm = signal('');
  showEditCategoryDropdown = signal(false);
  editSubCategorySearchTerm = signal('');
  showEditSubCategoryDropdown = signal(false);
  
  // Product details management
  productDetails = signal<ProductDetailCreateDto[]>([]);
  newProductDetail: ProductDetailCreateDto = {
    label: '',
    labelAr: '',
    value: '',
    valueAr: ''
  };
  
  // Selected product details for viewing
  selectedProductDetails = signal<ProductDto | null>(null);
  
  // Image management
  selectedImages = signal<File[]>([]);
  imagesToDelete = signal<string[]>([]);
  imagePreviewCache = new Map<File, string>();
  
  // BehaviorSubjects for triggering API calls
  private filtersSubject = new BehaviorSubject<ProductFilters>({});
  
  // Computed filters observable
  filters$ = computed(() => ({
    pageNumber: this.currentPage(),
    pageSize: this.pageSize(),
    isActive: this.statusFilter() ?? undefined,
    searchTerm: this.searchTerm() || '',
    categoryId: this.categoryFilter() ?? undefined,
    subCategoryId: this.subCategoryFilter() ?? undefined,
    minPrice: this.minPriceFilter() ?? undefined,
    maxPrice: this.maxPriceFilter() ?? undefined
  }));
  
  // Main data observables
  products$: Observable<ProductDto[]> = this.productService.products$;
  pagination$ = this.productService.pagination$;
  categories$: Observable<CategoryDto[]> = this.categoryService.getAllCategories();
  subCategories$: Observable<SubCategoryDto[]> = this.subCategoryService.getAllSubCategories();
  
  // Toast notifications
  toasts$ = this.toastService.toasts$;
  
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
  
  // Filtered subcategories based on search
  filteredSubCategories$ = this.subCategories$.pipe(
    map(subCategories => {
      const searchTerm = this.subCategorySearchTerm().toLowerCase();
      if (!searchTerm) return subCategories;
      return subCategories.filter(subCategory => 
        subCategory.name.toLowerCase().includes(searchTerm) ||
        subCategory.nameAr.toLowerCase().includes(searchTerm)
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
  
  // Filtered subcategories for edit modal
  filteredEditSubCategories$ = this.subCategories$.pipe(
    map(subCategories => {
      const searchTerm = this.editSubCategorySearchTerm().toLowerCase();
      if (!searchTerm) return subCategories;
      return subCategories.filter(subCategory => 
        subCategory.name.toLowerCase().includes(searchTerm) ||
        subCategory.nameAr.toLowerCase().includes(searchTerm)
      );
    })
  );
  
  // Computed observables
  productsLength$ = this.products$.pipe(
    map(products => products.length)
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

  getProductsLength(): number {
    let length = 0;
    this.products$.subscribe(products => {
      length = products.length;
    }).unsubscribe();
    return length;
  }

  newProduct: ProductCreateWithFilesDto = {
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    oldPrice: 0,
    newPrice: 0,
    isInStock: true,
    totalInStock: 0,
    subCategoryId: 0,
    productDetails: [],
    images: null
  };

  editProduct: ProductUpdateWithFilesDto = {
    id: 0,
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    oldPrice: 0,
    newPrice: 0,
    isInStock: true,
    totalInStock: 0,
    subCategoryId: 0,
    productDetails: [],
    images: null,
    imagesToDelete: []
  };

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadProducts(filters);
    });
  }

  ngOnInit() {
    // Initial load
    // this.loadProducts(this.filters$());
  }
  
  loadProducts(filters: ProductFilters) {
    this.isLoading.set(true);
    this.productService.getProducts(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Failed to load products');
        this.isLoading.set(false);
        this.toastService.error('Load Failed', 'Failed to load products. Please try again.');
        console.error('Error loading products:', error);
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
    this.subCategoryFilter.set(null); // Reset subcategory when category changes
    this.currentPage.set(1);
  }

  onSubCategoryFilterChange(subCategoryId: number | null) {
    this.subCategoryFilter.set(subCategoryId);
    this.currentPage.set(1);
  }

  onPriceFilterChange() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.categoryFilter.set(null);
    this.subCategoryFilter.set(null);
    this.minPriceFilter.set(null);
    this.maxPriceFilter.set(null);
    this.currentPage.set(1);
  }

  toggleProductSelection(productId: number) {
    const current = this.selectedProducts();
    const index = current.indexOf(productId);
    if (index > -1) {
      this.selectedProducts.set(current.filter(id => id !== productId));
    } else {
      this.selectedProducts.set([...current, productId]);
    }
  }

  toggleSelectAll() {
    this.products$.pipe(
      map(products => {
        const current = this.selectedProducts();
        if (current.length === products.length) {
          this.selectedProducts.set([]);
        } else {
          this.selectedProducts.set(products.map(product => product.id));
        }
      })
    ).subscribe();
  }

  deleteSelected() {
    const selected = this.selectedProducts();
    if (selected.length === 0) return;

    const loadingToastId = this.toastService.loading('Deleting Products', `Deleting ${selected.length} product(s)...`);
    this.isLoading.set(true);
    
    this.productService.deleteProducts(selected).subscribe({
      next: () => {
        this.selectedProducts.set([]);
        this.loadProducts(this.filters$()); // Reload products after deletion
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Products Deleted', `Successfully deleted ${selected.length} product(s).`);
      },
      error: (error) => {
        this.errorMessage.set('Failed to delete selected products');
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Delete Failed', 'Failed to delete selected products. Please try again.');
        console.error('Error deleting products:', error);
      }
    });
  }

  addProduct() {
    console.log('=== PRODUCT CREATION STARTED ===');
    console.log('Form validation started...');
    
    if (!this.validateProductForm()) {
      console.error('❌ Form validation failed - stopping product creation');
      this.toastService.error('Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }
    
    console.log('✅ Form validation passed');
    console.log('Product data being sent:', {
      title: this.newProduct.title,
      titleAr: this.newProduct.titleAr,
      description: this.newProduct.description,
      descriptionAr: this.newProduct.descriptionAr,
      oldPrice: this.newProduct.oldPrice,
      newPrice: this.newProduct.newPrice,
      isInStock: this.newProduct.isInStock,
      totalInStock: this.newProduct.totalInStock,
      subCategoryId: this.newProduct.subCategoryId,
      productDetailsCount: this.productDetails().length,
      imagesCount: this.selectedImages().length
    });

    this.newProduct.productDetails = this.productDetails();
    this.newProduct.images = this.selectedImages().length > 0 ? this.selectedImages() : null;

    const loadingToastId = this.toastService.loading('Creating Product', 'Creating new product...');
    console.log('Setting loading state to true...');
    this.isLoading.set(true);
    
    console.log('Making API call to create product...');
    this.productService.createProduct(this.newProduct).subscribe({
      next: (newProduct) => {
        console.log('✅ Product created successfully:', newProduct);
        this.resetNewProduct();
        this.showAddModal.set(false);
        this.loadProducts(this.filters$()); // Reload products after creation
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Product Created', `"${newProduct.title}" has been created successfully.`);
        console.log('=== PRODUCT CREATION COMPLETED SUCCESSFULLY ===');
      },
      error: (error) => {
        console.error('❌ API Error creating product:', {
          error: error,
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          timestamp: new Date().toISOString()
        });
        
        // Log specific error details
        if (error.error) {
          console.error('Server error details:', error.error);
          if (error.error.errors) {
            console.error('Validation errors:', error.error.errors);
          }
          if (error.error.message) {
            console.error('Server message:', error.error.message);
          }
        }
        
        this.errorMessage.set('Failed to create product');
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Creation Failed', 'Failed to create product. Please check your data and try again.');
        console.log('=== PRODUCT CREATION FAILED ===');
      }
    });
  }

  editProductStart(product: ProductDto) {
    this.editProduct = {
      id: product.id,
      title: product.title,
      titleAr: product.titleAr,
      description: product.description,
      descriptionAr: product.descriptionAr,
      oldPrice: product.oldPrice,
      newPrice: product.newPrice,
      isInStock: product.isInStock,
      totalInStock: product.totalInStock,
      subCategoryId: product.subCategoryId,
      productDetails: product.productDetails.map(detail => ({
        label: detail.label,
        labelAr: detail.labelAr,
        value: detail.value,
        valueAr: detail.valueAr
      })),
      images: null,
      imagesToDelete: []
    };
    
    // Set the subcategory search term
    this.subCategories$.pipe(
      map(subCategories => subCategories.find(sub => sub.id === product.subCategoryId))
    ).subscribe(subCategory => {
      if (subCategory) {
        this.editSubCategorySearchTerm.set(subCategory.name);
      }
    });
    
    this.productDetails.set(this.editProduct.productDetails);
    this.selectedImages.set([]);
    this.imagesToDelete.set([]);
    this.showEditModal.set(true);
  }

  updateProduct() {
    if (!this.validateProductForm()) {
      this.toastService.error('Validation Failed', 'Please fill in all required fields correctly.');
      return;
    }

    this.editProduct.productDetails = this.productDetails();
    this.editProduct.images = this.selectedImages().length > 0 ? this.selectedImages() : null;
    this.editProduct.imagesToDelete = this.imagesToDelete();

    const loadingToastId = this.toastService.loading('Updating Product', 'Updating product information...');
    this.isLoading.set(true);
    
    this.productService.updateProduct(this.editProduct.id, this.editProduct).subscribe({
      next: (updatedProduct) => {
        this.showEditModal.set(false);
        this.loadProducts(this.filters$()); // Reload products after update
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Product Updated', `"${updatedProduct.title}" has been updated successfully.`);
      },
      error: (error) => {
        this.errorMessage.set('Failed to update product');
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Update Failed', 'Failed to update product. Please check your data and try again.');
        console.error('Error updating product:', error);
      }
    });
  }

  toggleProductStatus(productId: number) {
    const loadingToastId = this.toastService.loading('Updating Status', 'Updating product status...');
    this.isLoading.set(true);
    
    this.productService.toggleProductActive(productId).subscribe({
      next: (response) => {
        this.loadProducts(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Status Updated', 'Product status has been updated successfully.');
      },
      error: (error) => {
        this.errorMessage.set('Failed to update product status');
        this.isLoading.set(false);
        this.toastService.updateToError(loadingToastId, 'Status Update Failed', 'Failed to update product status. Please try again.');
        console.error('Error updating product status:', error);
      }
    });
  }

  viewProductDetails(productId: number) {
    console.log('🔍 Viewing product details for ID:', productId);
    this.isLoading.set(true);
    this.selectedProductDetails.set(null);
    this.showDetailsModal.set(true);
    
    this.productService.getProductById(productId).subscribe({
      next: (product) => {
        console.log('✅ Product details loaded:', product);
        this.selectedProductDetails.set(product);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading product details:', error);
        this.errorMessage.set('Failed to load product details');
        this.isLoading.set(false);
        this.toastService.error('Load Failed', 'Failed to load product details. Please try again.');
      }
    });
  }

  // Product details management
  addProductDetail() {
    console.log('📝 Adding product detail...');
    console.log('Detail data:', this.newProductDetail);
    
    const errors: string[] = [];
    
    // Validate required fields
    if (!this.newProductDetail.label || this.newProductDetail.label.trim() === '') {
      errors.push('Detail label is required');
      console.error('❌ Product Detail Error: Label is missing');
    }
    
    if (!this.newProductDetail.labelAr || this.newProductDetail.labelAr.trim() === '') {
      errors.push('Detail Arabic label is required');
      console.error('❌ Product Detail Error: Arabic label is missing');
    }
    
    if (!this.newProductDetail.value || this.newProductDetail.value.trim() === '') {
      errors.push('Detail value is required');
      console.error('❌ Product Detail Error: Value is missing');
    }
    
    if (!this.newProductDetail.valueAr || this.newProductDetail.valueAr.trim() === '') {
      errors.push('Detail Arabic value is required');
      console.error('❌ Product Detail Error: Arabic value is missing');
    }
    
    if (errors.length > 0) {
      console.error('❌ Product detail validation failed:', errors);
      this.errorMessage.set(errors.join(', '));
      this.toastService.error('Validation Failed', 'Please fill in all detail fields.');
      return;
    }
    
    try {
      this.productDetails.set([...this.productDetails(), { ...this.newProductDetail }]);
      console.log('✅ Product detail added successfully');
      console.log('Total product details:', this.productDetails().length);
      
      this.toastService.success('Detail Added', 'Product detail has been added successfully.');
      
      this.newProductDetail = {
        label: '',
        labelAr: '',
        value: '',
        valueAr: ''
      };
    } catch (error) {
      console.error('❌ Error adding product detail:', error);
      this.errorMessage.set('Error adding product detail');
      this.toastService.error('Add Failed', 'Failed to add product detail. Please try again.');
    }
  }

  removeProductDetail(index: number) {
    const details = this.productDetails();
    this.productDetails.set(details.filter((_, i) => i !== index));
    this.toastService.info('Detail Removed', 'Product detail has been removed.');
  }

  // Image management
  onImageSelected(event: any) {
    console.log('📷 Image selection started...');
    try {
      const files = Array.from(event.target.files) as File[];
      console.log('Selected files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      // Validate file types and sizes
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      files.forEach((file, index) => {
        console.log(`Validating file ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name} is not a valid image file`);
          console.error('❌ Invalid file type:', file.name, file.type);
          return;
        }
        
        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          errors.push(`${file.name} is too large (max 5MB)`);
          console.error('❌ File too large:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
          return;
        }
        
        validFiles.push(file);
        console.log('✅ File validation passed:', file.name);
      });
      
      if (errors.length > 0) {
        console.error('❌ Image validation errors:', errors);
        this.errorMessage.set(errors.join(', '));
        this.toastService.error('Image Validation Failed', errors.join(', '));
      }
      
      if (validFiles.length > 0) {
        this.selectedImages.set([...this.selectedImages(), ...validFiles]);
        console.log('✅ Images added successfully. Total images:', this.selectedImages().length);
        this.toastService.success('Images Added', `${validFiles.length} image(s) added successfully.`);
      }
      
    } catch (error) {
      console.error('❌ Error processing image selection:', error);
      this.errorMessage.set('Error processing selected images');
      this.toastService.error('Image Processing Failed', 'Failed to process selected images. Please try again.');
    }
  }

  removeSelectedImage(index: number) {
    const images = this.selectedImages();
    const imageToRemove = images[index];
    
    // Clean up blob URL
    if (this.imagePreviewCache.has(imageToRemove)) {
      URL.revokeObjectURL(this.imagePreviewCache.get(imageToRemove)!);
      this.imagePreviewCache.delete(imageToRemove);
    }
    
    this.selectedImages.set(images.filter((_, i) => i !== index));
    this.toastService.info('Image Removed', 'Image has been removed from selection.');
  }

  removeExistingImage(imageUrl: string) {
    this.imagesToDelete.set([...this.imagesToDelete(), imageUrl]);
    this.toastService.warning('Image Marked for Deletion', 'Image will be deleted when you save the product.');
  }

  // Category and subcategory search methods
  onCategorySearch(searchTerm: string) {
    this.categorySearchTerm.set(searchTerm);
    this.showCategoryDropdown.set(true);
  }

  selectCategory(category: CategoryDto) {
    this.categorySearchTerm.set(category.name);
    this.showCategoryDropdown.set(false);
  }

  toggleCategoryDropdown() {
    this.showCategoryDropdown.set(!this.showCategoryDropdown());
  }

  onSubCategorySearch(searchTerm: string) {
    this.subCategorySearchTerm.set(searchTerm);
    this.showSubCategoryDropdown.set(true);
  }

  onSubCategoryBlur() {
    // Add a small delay to allow click events to process first
    setTimeout(() => {
      this.showSubCategoryDropdown.set(false);
    }, 150);
  }

  selectSubCategory(subCategory: SubCategoryDto) {
    console.log('🏷️ Subcategory selected:', {
      id: subCategory.id,
      name: subCategory.name,
      nameAr: subCategory.nameAr,
      idType: typeof subCategory.id
    });
    
    try {
      console.log('🔍 Before setting subCategoryId:', {
        currentSubCategoryId: this.newProduct.subCategoryId,
        newSubCategoryId: subCategory.id
      });
      
      this.newProduct.subCategoryId = subCategory.id;
      this.subCategorySearchTerm.set(subCategory.name);
      this.showSubCategoryDropdown.set(false);
      
      console.log('🔍 After setting subCategoryId:', {
        newProductSubCategoryId: this.newProduct.subCategoryId,
        searchTerm: this.subCategorySearchTerm()
      });
      
      console.log('✅ Subcategory selection completed');
    } catch (error) {
      console.error('❌ Error selecting subcategory:', error);
      this.errorMessage.set('Error selecting subcategory');
    }
  }

  toggleSubCategoryDropdown() {
    this.showSubCategoryDropdown.set(!this.showSubCategoryDropdown());
  }

  // Edit modal search methods
  onEditSubCategorySearch(searchTerm: string) {
    this.editSubCategorySearchTerm.set(searchTerm);
    this.showEditSubCategoryDropdown.set(true);
  }

  onEditSubCategoryBlur() {
    // Add a small delay to allow click events to process first
    setTimeout(() => {
      this.showEditSubCategoryDropdown.set(false);
    }, 150);
  }

  selectEditSubCategory(subCategory: SubCategoryDto) {
    console.log('🏷️ Edit Subcategory selected:', {
      id: subCategory.id,
      name: subCategory.name,
      nameAr: subCategory.nameAr,
      idType: typeof subCategory.id
    });
    
    try {
      console.log('🔍 Before setting edit subCategoryId:', {
        currentSubCategoryId: this.editProduct.subCategoryId,
        newSubCategoryId: subCategory.id
      });
      
      this.editProduct.subCategoryId = subCategory.id;
      this.editSubCategorySearchTerm.set(subCategory.name);
      this.showEditSubCategoryDropdown.set(false);
      
      console.log('🔍 After setting edit subCategoryId:', {
        editProductSubCategoryId: this.editProduct.subCategoryId,
        searchTerm: this.editSubCategorySearchTerm()
      });
      
      console.log('✅ Edit subcategory selection completed');
    } catch (error) {
      console.error('❌ Error selecting edit subcategory:', error);
      this.errorMessage.set('Error selecting subcategory');
    }
  }

  toggleEditSubCategoryDropdown() {
    this.showEditSubCategoryDropdown.set(!this.showEditSubCategoryDropdown());
  }

  resetNewProduct() {
    console.log('🔄 Resetting product form...');
    
    try {
      // Clean up all blob URLs
      console.log('Cleaning up image preview cache...');
      this.imagePreviewCache.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
      this.imagePreviewCache.clear();
      console.log('✅ Image preview cache cleared');
      
      // Reset product data
      this.newProduct = {
        title: '',
        titleAr: '',
        description: '',
        descriptionAr: '',
        oldPrice: 0,
        newPrice: 0,
        isInStock: true,
        totalInStock: 0,
        subCategoryId: 0,
        productDetails: [],
        images: null
      };
      
      // Reset signals
      this.productDetails.set([]);
      this.selectedImages.set([]);
      this.categorySearchTerm.set('');
      this.subCategorySearchTerm.set('');
      
      console.log('✅ Product form reset completed');
    } catch (error) {
      console.error('❌ Error resetting product form:', error);
    }
  }

  closeModals() {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showStockModal.set(false);
    this.showDetailsModal.set(false);
    this.selectedProductDetails.set(null);
    this.errorMessage.set('');
    this.resetNewProduct();
  }

  // Clean up blob URLs when component is destroyed
  ngOnDestroy() {
    this.imagePreviewCache.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    this.imagePreviewCache.clear();
  }

  validateProductForm(): boolean {
    console.log('🔍 Starting form validation...');
    const product = this.showEditModal() ? this.editProduct : this.newProduct;
    const errors: string[] = [];
    
    // Debug: Log current product data
    console.log('🔍 Current product data for validation:', {
      title: product.title,
      titleAr: product.titleAr,
      description: product.description,
      descriptionAr: product.descriptionAr,
      subCategoryId: product.subCategoryId,
      newPrice: product.newPrice,
      oldPrice: product.oldPrice,
      totalInStock: product.totalInStock
    });
    
    // Check required text fields
    if (!product.title || product.title.trim() === '') {
      errors.push('Title is required');
      console.error('❌ Validation Error: Title is missing or empty');
    }
    
    if (!product.titleAr || product.titleAr.trim() === '') {
      errors.push('Arabic Title is required');
      console.error('❌ Validation Error: Arabic Title is missing or empty');
    }
    
    if (!product.description || product.description.trim() === '') {
      errors.push('Description is required');
      console.error('❌ Validation Error: Description is missing or empty');
    }
    
    if (!product.descriptionAr || product.descriptionAr.trim() === '') {
      errors.push('Arabic Description is required');
      console.error('❌ Validation Error: Arabic Description is missing or empty');
    }
    
    // Check subcategory selection with detailed logging
    console.log('🔍 Checking subcategory selection:', {
      subCategoryId: product.subCategoryId,
      type: typeof product.subCategoryId,
      isNull: product.subCategoryId === null,
      isUndefined: product.subCategoryId === undefined,
      isZero: product.subCategoryId === 0,
      isLessThanZero: product.subCategoryId < 0
    });
    
    if (!product.subCategoryId || product.subCategoryId <= 0) {
      errors.push('Subcategory must be selected');
      console.error('❌ Validation Error: No subcategory selected - subCategoryId:', product.subCategoryId);
    } else {
      console.log('✅ Subcategory validation passed - subCategoryId:', product.subCategoryId);
    }
    
    // Check price validation
    if (!product.newPrice || product.newPrice <= 0) {
      errors.push('New price must be greater than 0');
      console.error('❌ Validation Error: Invalid new price:', product.newPrice);
    }
    
    // Check old price if provided
    if (product.oldPrice && product.oldPrice <= 0) {
      errors.push('Old price must be greater than 0 if provided');
      console.error('❌ Validation Error: Invalid old price:', product.oldPrice);
    }
    
    // Check stock quantity
    if (product.totalInStock < 0) {
      errors.push('Stock quantity cannot be negative');
      console.error('❌ Validation Error: Negative stock quantity:', product.totalInStock);
    }
    
    // Log validation results
    if (errors.length > 0) {
      console.error('❌ Form validation failed with errors:', errors);
      this.errorMessage.set(errors.join(', '));
      return false;
    }
    
    console.log('✅ Form validation passed successfully');
    return true;
  }

  getImagePreview(file: File): string {
    if (!this.imagePreviewCache.has(file)) {
      const blobUrl = URL.createObjectURL(file);
      this.imagePreviewCache.set(file, blobUrl);
    }
    return this.imagePreviewCache.get(file)!;
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

  // Toast management
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }
}
