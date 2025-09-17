import { Routes } from '@angular/router';

/**
 * Clubs feature routes
 */
export const clubsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./clubs.component').then(m => m.ClubsComponent),
    data: {
      title: 'Clubs',
      description: 'Browse and manage football clubs'
    }
  }
];
