import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { ServiceAuth } from '../../auth/service-auth';
import { UserResponseDto } from '../../auth/auth.models';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  currentUser: UserResponseDto | null = null;
  private destroy$ = new Subject<void>();
  isLoggingOut = false;
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      adminDashboard: 'لوحة تحكم الإدارة',
      welcomeBack: 'مرحباً بعودتك',
      administrator: 'المدير',
      dashboard: 'لوحة التحكم',
      categories: 'الفئات',
      subCategories: 'الفئات الفرعية',
      products: 'المنتجات',
      carousels: 'العروض المتحركة',
      coupons: 'الكوبونات',
      transactions: 'المعاملات',
      orders: 'الطلبات',
      userManagement: 'إدارة المستخدمين',
      health: 'الصحة',
      english: 'English',
      arabic: 'العربية',
      logout: 'تسجيل الخروج',
      loggingOut: 'جاري تسجيل الخروج...',
      open: 'فتح'
    },
    en: {
      adminDashboard: 'Admin Dashboard',
      welcomeBack: 'Welcome back',
      administrator: 'Administrator',
      dashboard: 'Dashboard',
      categories: 'Categories',
      subCategories: 'Sub-Categories',
      products: 'Products',
      carousels: 'Carousels',
      coupons: 'Coupons',
      transactions: 'Transactions',
      orders: 'Orders',
      userManagement: 'User Management',
      health: 'Health',
      english: 'English',
      arabic: 'العربية',
      logout: 'Logout',
      loggingOut: 'Logging out...',
      open: 'Open'
    }
  };

  // Translation helper
  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations.ar] || key;
  }

  constructor(
    private authService: ServiceAuth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user observable
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

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

  switchLanguage(lang: 'ar' | 'en'): void {
    this.currentLanguage.set(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  logout(): void {
    if (this.isLoggingOut) return;
    
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response);
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Navigate to login even if API call fails (local data is already cleared)
        this.router.navigate(['/auth/login']);
      },
      complete: () => {
        this.isLoggingOut = false;
      }
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'A';
    
    const username = this.currentUser.username || '';
    
    if (username.length >= 2) {
      return username.substring(0, 2).toUpperCase();
    } else if (username.length === 1) {
      return username.charAt(0).toUpperCase();
    } else if (this.currentUser.email) {
      return this.currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'A';
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'Admin User';
    
    if (this.currentUser.username) {
      return this.currentUser.username;
    } else if (this.currentUser.email) {
      return this.currentUser.email;
    }
    
    return 'Admin User';
  }

  getUserRole(): string {
    // Since UserResponseDto doesn't have a role field,
    // we'll display based on the route or default to Administrator
    // This can be updated when role information is available
    return this.t('administrator');
  }

  ngOnDestroy(): void {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
