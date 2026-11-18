import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../services/language.service';

type NavIcon = 'orders' | 'transactions' | 'settings';
type NavKey =
  | 'dashboard'
  | 'homepage'
  | 'myOrders'
  | 'myTransactions'
  | 'settings'
  | 'backToStore'
  | 'accountSections'
  | 'skipToContent';

@Component({
  selector: 'app-dashboard',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  readonly currentLanguage = inject(LanguageService).current;

  readonly navItems: ReadonlyArray<{ link: string; key: NavKey; icon: NavIcon }> = [
    { link: '/user/orders', key: 'myOrders', icon: 'orders' },
    { link: '/user/transactions', key: 'myTransactions', icon: 'transactions' },
    { link: '/user/settings', key: 'settings', icon: 'settings' }
  ];

  private readonly translations = {
    ar: {
      dashboard: 'حسابي',
      homepage: 'الرئيسية',
      myOrders: 'طلباتي',
      myTransactions: 'معاملاتي',
      settings: 'الإعدادات',
      backToStore: 'العودة إلى المتجر',
      accountSections: 'أقسام الحساب',
      skipToContent: 'تخطَّ إلى المحتوى'
    },
    en: {
      dashboard: 'My account',
      homepage: 'Home',
      myOrders: 'My Orders',
      myTransactions: 'My Transactions',
      settings: 'Settings',
      backToStore: 'Back to store',
      accountSections: 'Account sections',
      skipToContent: 'Skip to content'
    }
  } as const;

  t(key: NavKey): string {
    return this.translations[this.currentLanguage()][key] ?? key;
  }
}
