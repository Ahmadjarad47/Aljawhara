import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./home/home-page/home-page').then(m => m.HomePage)
    },
    {
        path: 'product',
        loadComponent: () => import('./home/product/product').then(m => m.Product)
    },
    {
        path: 'product/:id',
        loadComponent: () => import('./home/product-detail/product-detail').then(m => m.ProductDetail)
    },
    {
        path: 'about',
        loadComponent: () => import('./home/about/about').then(m => m.About)
    },
    {
        path: 'contact',
        loadComponent: () => import('./home/contact/contact').then(m => m.Contact)
    },
    {
        path: 'privacy',
        loadComponent: () => import('./home/privacy-policy/privacy-policy').then(m => m.PrivacyPolicy)
    },
    {
        path: 'terms',
        loadComponent: () => import('./home/terms-of-service/terms-of-service').then(m => m.TermsOfService)
    },
    {
        path: 'cookies',
        loadComponent: () => import('./home/cookie-policy/cookie-policy').then(m => m.CookiePolicy)
    },
    {
        path: 'wishlist',
        loadComponent: () => import('./home/wishlist/wishlist').then(m => m.Wishlist)
    },
    {
        path: 'cart',
        loadComponent: () => import('./core/components/cart/cart').then(m => m.Cart)
    },
    {
        path: 'checkout',
        loadComponent: () => import('./core/stepper/stepper').then(m => m.StepperComponent),
        canActivate: [authGuard]
    },
    {
        path: 'checkout/success',
        loadComponent: () => import('./core/components/checkout-success/checkout-success').then(m => m.CheckoutSuccessComponent),
        canActivate: [authGuard]
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
    },
    {
        path: 'admin',
        canActivate:[adminGuard],
        loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
    },
    {
        path: 'user',
        loadChildren: () => import('./user/user.routes').then(m => m.userRoutes)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
