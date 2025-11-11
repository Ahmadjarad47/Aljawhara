import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'register',
    loadComponent: () => import('./register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.LoginComponent)
  },
  {
    path: 'verify',
    loadComponent: () => import('./verify/verify').then(m => m.VerifyComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
