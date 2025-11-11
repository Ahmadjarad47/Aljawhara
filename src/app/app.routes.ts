import { Routes } from '@angular/router';
import { HomePage } from './home/home-page/home-page';
import { Product } from './home/product/product';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        component: HomePage
    },
    {
        path: 'product',
        component: Product
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
