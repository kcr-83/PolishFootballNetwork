import { Routes } from '@angular/router';
import { AdminGuard, RoleGuard, PermissionGuard, ResourceGuard } from './shared/guards/route.guards';

/// <summary>
/// Admin module routes configuration with comprehensive security guards.
/// All routes require authentication and appropriate permissions.
/// </summary>
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    children: [
      // Default redirect to dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard - Basic admin access required
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        data: {
          title: 'Dashboard',
          breadcrumb: 'Dashboard',
          permissions: ['admin.access'],
          resource: 'dashboard',
          action: 'view'
        }
      },

      // User Management - Requires user management permissions
      {
        path: 'users',
        data: {
          title: 'User Management',
          breadcrumb: 'Users'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/users/user-list.component').then(m => m.UserListComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['users.view'],
              resource: 'users',
              action: 'view'
            }
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/users/user-create.component').then(m => m.UserCreateComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['users.create'],
              resource: 'users',
              action: 'create',
              breadcrumb: 'Create User'
            }
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/users/user-detail.component').then(m => m.UserDetailComponent),
            canActivate: [ResourceGuard],
            data: {
              resource: 'users',
              action: 'view',
              breadcrumb: 'User Details'
            }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./pages/users/user-edit.component').then(m => m.UserEditComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['users.edit'],
              resource: 'users',
              action: 'edit',
              breadcrumb: 'Edit User'
            }
          }
        ]
      },

      // Club Management - Requires club management permissions
      {
        path: 'clubs',
        data: {
          title: 'Club Management',
          breadcrumb: 'Clubs'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/clubs/club-list.component').then(m => m.ClubListComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['clubs.view'],
              resource: 'clubs',
              action: 'view'
            }
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/clubs/club-create.component').then(m => m.ClubCreateComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['clubs.create'],
              resource: 'clubs',
              action: 'create',
              breadcrumb: 'Create Club'
            }
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/clubs/club-detail.component').then(m => m.ClubDetailComponent),
            canActivate: [ResourceGuard],
            data: {
              resource: 'clubs',
              action: 'view',
              breadcrumb: 'Club Details'
            }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./pages/clubs/club-edit.component').then(m => m.ClubEditComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['clubs.edit'],
              resource: 'clubs',
              action: 'edit',
              breadcrumb: 'Edit Club'
            }
          },
          {
            path: ':id/approve',
            loadComponent: () => import('./pages/clubs/club-approve.component').then(m => m.ClubApproveComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['clubs.approve'],
              resource: 'clubs',
              action: 'approve',
              breadcrumb: 'Approve Club'
            }
          }
        ]
      },

      // Connection Management - Requires connection management permissions
      {
        path: 'connections',
        data: {
          title: 'Connection Management',
          breadcrumb: 'Connections'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/connections/connection-list.component').then(m => m.ConnectionListComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['connections.view'],
              resource: 'connections',
              action: 'view'
            }
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/connections/connection-create.component').then(m => m.ConnectionCreateComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['connections.create'],
              resource: 'connections',
              action: 'create',
              breadcrumb: 'Create Connection'
            }
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/connections/connection-detail.component').then(m => m.ConnectionDetailComponent),
            canActivate: [ResourceGuard],
            data: {
              resource: 'connections',
              action: 'view',
              breadcrumb: 'Connection Details'
            }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./pages/connections/connection-edit.component').then(m => m.ConnectionEditComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['connections.edit'],
              resource: 'connections',
              action: 'edit',
              breadcrumb: 'Edit Connection'
            }
          }
        ]
      },

      // File Management - Requires file management permissions
      {
        path: 'files',
        data: {
          title: 'File Management',
          breadcrumb: 'Files'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/files/file-list.component').then(m => m.FileListComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['files.view'],
              resource: 'files',
              action: 'view'
            }
          },
          {
            path: 'upload',
            loadComponent: () => import('./pages/files/file-upload.component').then(m => m.FileUploadComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['files.upload'],
              resource: 'files',
              action: 'upload',
              breadcrumb: 'Upload Files'
            }
          },
          {
            path: 'manage',
            loadComponent: () => import('./pages/files/file-manager.component').then(m => m.FileManagerComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['files.manage'],
              resource: 'files',
              action: 'manage',
              breadcrumb: 'File Manager'
            }
          }
        ]
      },

      // System Settings - Requires admin or super admin role
      {
        path: 'settings',
        data: {
          title: 'System Settings',
          breadcrumb: 'Settings'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/settings/settings-overview.component').then(m => m.SettingsOverviewComponent),
            canActivate: [RoleGuard],
            data: {
              roles: ['admin', 'super_admin'],
              resource: 'system',
              action: 'settings'
            }
          },
          {
            path: 'general',
            loadComponent: () => import('./pages/settings/general-settings.component').then(m => m.GeneralSettingsComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['system.settings'],
              breadcrumb: 'General Settings'
            }
          },
          {
            path: 'security',
            loadComponent: () => import('./pages/settings/security-settings.component').then(m => m.SecuritySettingsComponent),
            canActivate: [RoleGuard],
            data: {
              roles: ['super_admin'],
              breadcrumb: 'Security Settings'
            }
          },
          {
            path: 'notifications',
            loadComponent: () => import('./pages/settings/notification-settings.component').then(m => m.NotificationSettingsComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['system.settings'],
              breadcrumb: 'Notification Settings'
            }
          },
          {
            path: 'backup',
            loadComponent: () => import('./pages/settings/backup-settings.component').then(m => m.BackupSettingsComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['system.backup'],
              breadcrumb: 'Backup Settings'
            }
          }
        ]
      },

      // System Health - Requires system health permissions
      {
        path: 'health',
        loadComponent: () => import('./pages/health/system-health.component').then(m => m.SystemHealthComponent),
        canActivate: [PermissionGuard],
        data: {
          title: 'System Health',
          breadcrumb: 'System Health',
          permissions: ['system.health'],
          resource: 'system',
          action: 'health'
        }
      },

      // System Logs - Requires admin role
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/system-logs.component').then(m => m.SystemLogsComponent),
        canActivate: [RoleGuard, PermissionGuard],
        data: {
          title: 'System Logs',
          breadcrumb: 'System Logs',
          roles: ['admin', 'super_admin'],
          permissions: ['system.logs'],
          resource: 'system',
          action: 'logs'
        }
      },

      // Analytics - Requires analytics permissions
      {
        path: 'analytics',
        data: {
          title: 'Analytics',
          breadcrumb: 'Analytics'
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/analytics/analytics-overview.component').then(m => m.AnalyticsOverviewComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['analytics.view'],
              resource: 'analytics',
              action: 'view'
            }
          },
          {
            path: 'reports',
            loadComponent: () => import('./pages/analytics/reports.component').then(m => m.ReportsComponent),
            canActivate: [PermissionGuard],
            data: {
              permissions: ['reports.generate'],
              resource: 'reports',
              action: 'generate',
              breadcrumb: 'Reports'
            }
          }
        ]
      },

      // User Profile - Accessible by any authenticated admin user
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/user-profile.component').then(m => m.UserProfileComponent),
        data: {
          title: 'User Profile',
          breadcrumb: 'Profile'
        }
      },

      // Catch-all route for invalid admin paths
      {
        path: '**',
        loadComponent: () => import('../shared/components/not-found.component').then(m => m.NotFoundComponent),
        data: {
          title: 'Page Not Found',
          breadcrumb: 'Not Found'
        }
      }
    ]
  }
];

/// <summary>
/// Route configuration for authentication pages (login, logout, etc.)
/// These routes are accessible without authentication.
/// </summary>
export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent),
    data: {
      title: 'Login'
    }
  },
  {
    path: 'logout',
    loadComponent: () => import('./auth/logout.component').then(m => m.LogoutComponent),
    data: {
      title: 'Logout'
    }
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./auth/unauthorized.component').then(m => m.UnauthorizedComponent),
    data: {
      title: 'Unauthorized Access'
    }
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    data: {
      title: 'Forgot Password'
    }
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/reset-password.component').then(m => m.ResetPasswordComponent),
    data: {
      title: 'Reset Password'
    }
  }
];

/// <summary>
/// Main application routes that include admin and auth routes
/// </summary>
export const appRoutes: Routes = [
  // Default redirect to admin
  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  },

  // Admin routes with lazy loading
  {
    path: 'admin',
    children: adminRoutes
  },

  // Authentication routes
  ...authRoutes,

  // Public routes (if any)
  {
    path: 'public',
    loadChildren: () => import('../public/public.routes').then(m => m.publicRoutes)
  },

  // Catch-all route
  {
    path: '**',
    redirectTo: '/admin'
  }
];
