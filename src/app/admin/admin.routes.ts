import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from '../core/guards/auth.guard';

export const adminRoutes: Routes = [
    {
        path: '', component: Dashboard,  children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./dashboard-content/dashboard-content').then(m => m.DashboardContent) },
            { path: 'category', loadComponent: () => import('./category/category').then(m => m.Category) },
            { path: 'sub-category', loadComponent: () => import('./sub-category/sub-category').then(m => m.SubCategory) },
            { path: 'product', loadComponent: () => import('./product/product').then(m => m.Product) },
            { path: 'coupons', loadComponent: () => import('./copone/copone').then(m => m.Copone) },
            { path: 'transaction', loadComponent: () => import('./transaction/transaction').then(m => m.Transaction) },
            { path: 'order', loadComponent: () => import('./order/order').then(m => m.Order) },
            { path: 'user-management', loadComponent: () => import('./user-mangment/user-mangment').then(m => m.UserMangment) },
            { path: 'health', loadComponent: () => import('./health/health').then(m => m.Health) },
            // { path: 'companies', loadComponent: () => import('./companies/companies').then(m => m.Companies) },
            // { path: 'freelancers', loadComponent: () => import('./freelancers/freelancers').then(m => m.Freelancers) },
            // { path: 'jobs', loadComponent: () => import('./jobs/jobs').then(m => m.Jobs) },
            // { path: 'reviews', loadComponent: () => import('./reviews/reviews').then(m => m.Reviews) },
            // { path: 'analytics', loadComponent: () => import('./analytics/analytics').then(m => m.Analytics) },
            // { path: 'reports', loadComponent: () => import('./reports/reports').then(m => m.Reports) },
            // { path: 'settings', loadComponent: () => import('./settings/settings').then(m => m.Settings) },
        ]
    }
];
