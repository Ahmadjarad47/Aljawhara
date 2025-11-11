import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserOrderService } from './user-order.service';
import { OrderSummaryDto, OrderDto, OrderStatus, RatingCreateDto, RatingDto } from './models.order';
import { Observable, map, forkJoin } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../../core/components/toast/toast.component';

@Component({
  selector: 'app-user-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-order.html',
  styleUrl: './user-order.css'
})
export class UserOrder implements OnInit {
  public readonly orderService = inject(UserOrderService);
  public readonly toastService = inject(ToastService);
  
  // Signals for reactive state management
  isLoading = signal(false);
  showDetailsModal = signal(false);
  selectedOrderDetails = signal<OrderDto | null>(null);
  
  // Rating modal signals
  showRatingModal = signal(false);
  selectedProductForRating = signal<{ productId: number; productName: string } | null>(null);
  ratingForm = signal<{ ratingNumber: number; content: string }>({
    ratingNumber: 5,
    content: ''
  });
  productRatings = signal<Map<number, RatingDto | null>>(new Map()); // productId -> RatingDto | null
  checkingRatings = signal(false);
  
  // Filter signals
  statusFilter = signal<OrderStatus | null>(null);
  searchTerm = signal('');
  
  // Main data observables
  orders$: Observable<OrderSummaryDto[]> = this.orderService.orders$;
  
  // Filtered orders
  filteredOrders$ = computed(() => {
    let orders: OrderSummaryDto[] = [];
    this.orders$.subscribe(o => orders = o).unsubscribe();
    
    // Apply filters
    if (this.statusFilter() !== null) {
      orders = orders.filter(order => order.status === this.statusFilter());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      orders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term)
      );
    }
    
    return orders;
  });
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // OrderStatus enum for template
  OrderStatus = OrderStatus;
  
  constructor() {
    // Initial load effect
    effect(() => {
      this.loadOrders();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    // Orders will be loaded by the effect
  }
  
  loadOrders() {
    this.isLoading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load orders');
        this.isLoading.set(false);
        console.error('Error loading orders:', error);
      }
    });
  }

  onSearch() {
    // The computed signal will automatically update the filtered results
  }

  onStatusFilterChange(status: OrderStatus | null) {
    this.statusFilter.set(status);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set(null);
  }

  viewOrderDetails(orderId: number) {
    const loadingToastId = this.toastService.loading('Loading', 'Loading order details...');
    this.isLoading.set(true);
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.selectedOrderDetails.set(order);
        this.showDetailsModal.set(true);
        this.isLoading.set(false);
        this.toastService.removeToast(loadingToastId);
        // Check ratings for all products in this order
        this.checkProductRatings(order);
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to load order details');
        this.isLoading.set(false);
        console.error('Error loading order details:', error);
      }
    });
  }

  checkProductRatings(order: OrderDto) {
    if (!order.items || order.items.length === 0) {
      return;
    }

    this.checkingRatings.set(true);
    const ratingChecks = order.items.map(item => 
      this.orderService.checkMyProductRating(item.productId).pipe(
        map(rating => ({ productId: item.productId, rating: rating }))
      )
    );

    forkJoin(ratingChecks).subscribe({
      next: (results) => {
        const ratingsMap = new Map<number, RatingDto | null>();
        results.forEach(result => {
          ratingsMap.set(result.productId, result.rating);
        });
        this.productRatings.set(ratingsMap);
        this.checkingRatings.set(false);
      },
      error: (error) => {
        console.error('Error checking product ratings:', error);
        this.checkingRatings.set(false);
      }
    });
  }

  hasRatedProduct(productId: number): boolean {
    const rating = this.productRatings().get(productId);
    return rating !== null && rating !== undefined;
  }

  getProductRating(productId: number): RatingDto | null {
    return this.productRatings().get(productId) ?? null;
  }

  openRatingModal(productId: number, productName: string) {
    // Check if already rated - if yes, don't open modal for new rating
    const existingRating = this.getProductRating(productId);
    if (existingRating) {
      // User has already rated, modal should not open for new rating
      return;
    }
    
    this.selectedProductForRating.set({ productId, productName });
    this.ratingForm.set({ ratingNumber: 5, content: '' });
    this.showRatingModal.set(true);
  }

  closeRatingModal() {
    this.showRatingModal.set(false);
    this.selectedProductForRating.set(null);
    this.ratingForm.set({ ratingNumber: 5, content: '' });
  }

  updateRatingNumber(ratingNumber: number) {
    const current = this.ratingForm();
    this.ratingForm.set({ ...current, ratingNumber });
  }

  updateRatingContent(content: string) {
    const current = this.ratingForm();
    this.ratingForm.set({ ...current, content });
  }

  submitRating() {
    const product = this.selectedProductForRating();
    if (!product) return;

    const form = this.ratingForm();
    if (!form.content || form.content.trim().length === 0) {
      this.toastService.error('Validation Error', 'Please enter a review comment');
      return;
    }

    if (form.ratingNumber < 1 || form.ratingNumber > 5) {
      this.toastService.error('Validation Error', 'Rating must be between 1 and 5');
      return;
    }

    const ratingDto: RatingCreateDto = {
      productId: product.productId,
      ratingNumber: form.ratingNumber,
      content: form.content.trim()
    };

    const loadingToastId = this.toastService.loading('Submitting', 'Submitting your rating...');
    this.orderService.addProductRating(ratingDto).subscribe({
      next: (newRating) => {
        // Update the rating data for this product
        const ratingsMap = new Map(this.productRatings());
        ratingsMap.set(product.productId, newRating);
        this.productRatings.set(ratingsMap);
        
        this.closeRatingModal();
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Thank you for your rating!');
      },
      error: (error) => {
        this.toastService.updateToError(
          loadingToastId, 
          'Error', 
          error.error?.message || 'Failed to submit rating'
        );
        console.error('Error submitting rating:', error);
      }
    });
  }

  cancelOrder(orderId: number) {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    const loadingToastId = this.toastService.loading('Cancelling', 'Cancelling order...');
    this.isLoading.set(true);
    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        this.loadOrders();
        this.closeDetailsModal();
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Order cancelled successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', error.error?.message || 'Failed to cancel order');
        this.isLoading.set(false);
        console.error('Error cancelling order:', error);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedOrderDetails.set(null);
    // Clear ratings cache when closing modal
    this.productRatings.set(new Map());
  }

  getOrderStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'badge-warning';
      case OrderStatus.Processing:
        return 'badge-info';
      case OrderStatus.Shipped:
        return 'badge-primary';
      case OrderStatus.Delivered:
        return 'badge-success';
      case OrderStatus.Cancelled:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }

  getOrderStatusText(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'Pending';
      case OrderStatus.Processing:
        return 'Processing';
      case OrderStatus.Shipped:
        return 'Shipped';
      case OrderStatus.Delivered:
        return 'Delivered';
      case OrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  canCancelOrder(order: OrderDto | OrderSummaryDto): boolean {
    return order.status === OrderStatus.Pending || order.status === OrderStatus.Processing;
  }

  getFilteredOrdersLength(): number {
    return this.filteredOrders$().length;
  }

  // Toast methods
  onToastClose(toastId: string) {
    this.toastService.removeToast(toastId);
  }

  // Make Math available in template
  Math = Math;
}
