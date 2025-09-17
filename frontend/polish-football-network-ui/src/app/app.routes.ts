import { Routes } from '@angular/router';

/**
 * Main application routes - simplified for initial setup
 */
export const routes: Routes = [
  // Redirect root to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Authentication routes
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },

  // Dashboard route
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },

  // Graph view
  {
    path: 'graph',
    loadChildren: () => import('./features/graph/graph.routes').then(m => m.graphRoutes)
  },

  // Club management
  {
    path: 'clubs',
    loadChildren: () => import('./features/clubs/clubs.routes').then(m => m.clubsRoutes)
  },

  // Profile routes
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes)
  },

  // 404 Error page
  {
    path: '404',
    loadComponent: () => import('./features/error/not-found/not-found.component').then(m => m.NotFoundComponent)
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/404'
  }
];
