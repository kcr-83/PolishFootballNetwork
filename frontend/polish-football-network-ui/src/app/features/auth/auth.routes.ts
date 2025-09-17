import { Routes } from '@angular/router';

/**
 * Authentication feature routes
 */
export const authRoutes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    data: {
      title: 'Login',
      description: 'Sign in to your account'
    }
  }
];
