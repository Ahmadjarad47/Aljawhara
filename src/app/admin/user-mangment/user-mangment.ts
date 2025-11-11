import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserMangmentservice } from './user-mangmentservice';
import { 
  UserManagerDto, 
  BlockUserDto, 
  UnblockUserDto, 
  ChangeUserPasswordDto, 
  ChangeUserEmailDto, 
  SendEmailConfirmationDto, 
  UserSearchDto,
  PagedResult,
  UserAddressDto 
} from './model.user.admin';
import { Observable, map, switchMap, startWith, catchError, of, combineLatest, BehaviorSubject } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../core/components/toast/toast.component';

@Component({
  selector: 'app-user-mangment',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './user-mangment.html',
  styleUrl: './user-mangment.css',
})
export class UserMangment implements OnInit {
  public userService = inject(UserMangmentservice);
  public toastService = inject(ToastService);
  
  // Signals for reactive state management
  selectedUsers = signal<string[]>([]);
  showBlockModal = signal(false);
  showUnblockModal = signal(false);
  showChangePasswordModal = signal(false);
  showChangeEmailModal = signal(false);
  showSendEmailModal = signal(false);
  showAddressesModal = signal(false);
  isLoading = signal(false);
  
  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(10);
  
  // Search and filter signals
  searchTerm = signal('');
  isBlockedFilter = signal<boolean | null>(null);
  emailConfirmedFilter = signal<boolean | null>(null);
  isActiveFilter = signal<boolean | null>(null);
  
  // BehaviorSubjects for triggering API calls
  private filtersSubject = new BehaviorSubject<UserSearchDto>({
    searchTerm: null,
    isBlocked: null,
    emailConfirmed: null,
    isActive: null,
    page: 1,
    pageSize: 10
  });
  
  // Computed filters observable
  filters$ = computed(() => ({
    searchTerm: this.searchTerm() || null,
    isBlocked: this.isBlockedFilter(),
    emailConfirmed: this.emailConfirmedFilter(),
    isActive: this.isActiveFilter(),
    page: this.currentPage(),
    pageSize: this.pageSize()
  }));
  
  // Main data observables
  users$: Observable<UserManagerDto[]> = this.userService.users$;
  pagination$ = this.userService.pagination$;
  
  // Toast data
  get toasts() {
    return this.toastService.toasts$();
  }
  
  // Computed observables
  usersLength$ = this.users$.pipe(
    map(users => users.length)
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

  getUsersLength(): number {
    let length = 0;
    this.users$.subscribe(users => {
      length = users.length;
    }).unsubscribe();
    return length;
  }

  // Modal data objects
  selectedUser: UserManagerDto | null = null;
  blockUserDto: BlockUserDto = {
    userId: '',
    blockUntil: null,
    reason: ''
  };
  blockDuration = 'permanent';
  blockUntilDate: Date | null = null;
  unblockUserDto: UnblockUserDto = {
    userId: ''
  };
  changePasswordDto: ChangeUserPasswordDto = {
    userId: '',
    newPassword: ''
  };
  changeEmailDto: ChangeUserEmailDto = {
    userId: '',
    newEmail: ''
  };
  sendEmailDto: SendEmailConfirmationDto = {
    userId: ''
  };
  userAddresses: UserAddressDto[] = [];

  constructor() {
    // Set up reactive data loading
    effect(() => {
      const filters = this.filters$();
      this.loadUsers(filters);
    });
  }

  ngOnInit() {
    // Initial load
  }
  
  loadUsers(filters: UserSearchDto) {
    this.isLoading.set(true);
    this.userService.getUsers(filters).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to load users');
        this.isLoading.set(false);
        console.error('Error loading users:', error);
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

  onFilterChange() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.isBlockedFilter.set(null);
    this.emailConfirmedFilter.set(null);
    this.isActiveFilter.set(null);
    this.currentPage.set(1);
  }

  toggleUserSelection(userId: string) {
    const current = this.selectedUsers();
    const index = current.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.set(current.filter(id => id !== userId));
    } else {
      this.selectedUsers.set([...current, userId]);
    }
  }

  toggleSelectAll() {
    this.users$.pipe(
      map(users => {
        const current = this.selectedUsers();
        if (current.length === users.length) {
          this.selectedUsers.set([]);
        } else {
          this.selectedUsers.set(users.map(user => user.id));
        }
      })
    ).subscribe();
  }

  // User action methods
  blockUser(user: UserManagerDto) {
    this.selectedUser = user;
    this.blockUserDto = {
      userId: user.id,
      blockUntil: null,
      reason: ''
    };
    this.blockDuration = 'permanent';
    this.blockUntilDate = null;
    this.showBlockModal.set(true);
  }

  onBlockDurationChange(duration: string) {
    this.blockDuration = duration;
    
    if (duration === 'permanent') {
      this.blockUserDto.blockUntil = null;
      this.blockUntilDate = null;
    } else {
      const now = new Date();
      let blockUntil: Date;
      
      switch (duration) {
        case '1hour':
          blockUntil = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '6hours':
          blockUntil = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          break;
        case '1day':
          blockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '3days':
          blockUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          break;
        case '1week':
          blockUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '2weeks':
          blockUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          blockUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          blockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      
      this.blockUserDto.blockUntil = blockUntil.toISOString();
      this.blockUntilDate = blockUntil;
    }
  }

  confirmBlockUser() {
    if (!this.blockUserDto.reason.trim()) {
      this.toastService.warning('Validation Error', 'Block reason is required');
      return;
    }

    const loadingToastId = this.toastService.loading('Blocking', 'Blocking user...');
    this.isLoading.set(true);
    this.userService.blockUser(this.blockUserDto).subscribe({
      next: () => {
        this.showBlockModal.set(false);
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'User blocked successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to block user');
        this.isLoading.set(false);
        console.error('Error blocking user:', error);
      }
    });
  }

  unblockUser(user: UserManagerDto) {
    this.selectedUser = user;
    this.unblockUserDto = {
      userId: user.id
    };
    this.showUnblockModal.set(true);
  }

  confirmUnblockUser() {
    const loadingToastId = this.toastService.loading('Unblocking', 'Unblocking user...');
    this.isLoading.set(true);
    this.userService.unblockUser(this.unblockUserDto).subscribe({
      next: () => {
        this.showUnblockModal.set(false);
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'User unblocked successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to unblock user');
        this.isLoading.set(false);
        console.error('Error unblocking user:', error);
      }
    });
  }

  changePassword(user: UserManagerDto) {
    this.selectedUser = user;
    this.changePasswordDto = {
      userId: user.id,
      newPassword: ''
    };
    this.showChangePasswordModal.set(true);
  }

  confirmChangePassword() {
    if (!this.changePasswordDto.newPassword || this.changePasswordDto.newPassword.length < 6) {
      this.toastService.warning('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    const loadingToastId = this.toastService.loading('Changing', 'Changing user password...');
    this.isLoading.set(true);
    this.userService.changeUserPassword(this.changePasswordDto).subscribe({
      next: () => {
        this.showChangePasswordModal.set(false);
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'User password changed successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to change user password');
        this.isLoading.set(false);
        console.error('Error changing password:', error);
      }
    });
  }

  changeEmail(user: UserManagerDto) {
    this.selectedUser = user;
    this.changeEmailDto = {
      userId: user.id,
      newEmail: ''
    };
    this.showChangeEmailModal.set(true);
  }

  confirmChangeEmail() {
    if (!this.changeEmailDto.newEmail || !this.isValidEmail(this.changeEmailDto.newEmail)) {
      this.toastService.warning('Validation Error', 'Please enter a valid email address');
      return;
    }

    const loadingToastId = this.toastService.loading('Changing', 'Changing user email...');
    this.isLoading.set(true);
    this.userService.changeUserEmail(this.changeEmailDto).subscribe({
      next: () => {
        this.showChangeEmailModal.set(false);
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Email change confirmation sent to the new email address');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to change user email');
        this.isLoading.set(false);
        console.error('Error changing email:', error);
      }
    });
  }

  sendEmailConfirmation(user: UserManagerDto) {
    this.selectedUser = user;
    this.sendEmailDto = {
      userId: user.id
    };
    this.showSendEmailModal.set(true);
  }

  confirmSendEmailConfirmation() {
    const loadingToastId = this.toastService.loading('Sending', 'Sending email confirmation...');
    this.isLoading.set(true);
    this.userService.sendEmailConfirmation(this.sendEmailDto).subscribe({
      next: () => {
        this.showSendEmailModal.set(false);
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'Email confirmation sent successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to send email confirmation');
        this.isLoading.set(false);
        console.error('Error sending email confirmation:', error);
      }
    });
  }

  resetUserPassword(user: UserManagerDto) {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      this.toastService.warning('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    const loadingToastId = this.toastService.loading('Resetting', 'Resetting user password...');
    this.isLoading.set(true);
    this.userService.resetUserPassword(user.id, newPassword).subscribe({
      next: () => {
        this.loadUsers(this.filters$());
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'User password reset successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to reset user password');
        this.isLoading.set(false);
        console.error('Error resetting password:', error);
      }
    });
  }

  viewUserAddresses(user: UserManagerDto) {
    this.selectedUser = user;
    this.userAddresses = [];
    this.showAddressesModal.set(true);
    
    const loadingToastId = this.toastService.loading('Loading', 'Loading user addresses...');
    this.isLoading.set(true);
    this.userService.getUserAddresses(user.id).subscribe({
      next: (addresses) => {
        console.log(addresses);
        
        this.userAddresses = addresses;
        this.isLoading.set(false);
        this.toastService.updateToSuccess(loadingToastId, 'Success', 'User addresses loaded successfully');
      },
      error: (error) => {
        this.toastService.updateToError(loadingToastId, 'Error', 'Failed to load user addresses');
        this.isLoading.set(false);
        console.error('Error loading user addresses:', error);
      }
    });
  }

  closeModals() {
    this.showBlockModal.set(false);
    this.showUnblockModal.set(false);
    this.showChangePasswordModal.set(false);
    this.showChangeEmailModal.set(false);
    this.showSendEmailModal.set(false);
    this.showAddressesModal.set(false);
    this.selectedUser = null;
    this.blockDuration = 'permanent';
    this.blockUntilDate = null;
    this.userAddresses = [];
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
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
