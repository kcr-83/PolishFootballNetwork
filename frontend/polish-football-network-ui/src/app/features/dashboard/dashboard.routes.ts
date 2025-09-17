import { Routes } from '@angular/router';

/**
 * Dashboard feature routes
 */
export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent),
    data: {
      title: 'Dashboard',
      description: 'Overview of your Polish Football Network activity'
    }
  }
];
