import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from '../core/guards/auth.guard';

export const userRoutes: Routes = [
  {
    path: '',
    component: Dashboard,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'orders',
        pathMatch: 'full'
      },
      {
        path: 'orders',
        loadComponent: () => import('./dashboard/user-order/user-order').then(m => m.UserOrderComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./dashboard/transaction/transaction').then(m => m.Transaction)
      },
      {
        path: 'settings',
        loadComponent: () => import('./dashboard/setting/setting').then(m => m.Setting)
      },
      // {
      //   path: 'settings',
      //   loadComponent: () => import('./settings/settings').then(m => m.SettingsComponent)
      // }
    ]
  }
];