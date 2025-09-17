import { Routes } from '@angular/router';

/**
 * Graph/Network visualization feature routes
 */
export const graphRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./graph.component').then(m => m.GraphComponent),
    data: {
      title: 'Network Graph',
      description: 'Visualize football club connections and relationships'
    }
  }
];
