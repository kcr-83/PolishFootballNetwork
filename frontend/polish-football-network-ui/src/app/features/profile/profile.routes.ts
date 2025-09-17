import { Routes } from '@angular/router';

/**
 * Profile feature routes
 */
export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile.component').then(m => m.ProfileComponent),
    data: {
      title: 'Profile',
      description: 'Manage your profile and account settings'
    }
  }
];
