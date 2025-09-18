import { Injectable, computed, signal } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, User } from './auth.service';

/// <summary>
/// Permission definition with metadata
/// </summary>
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  dependsOn?: string[];
}

/// <summary>
/// Role definition with permissions
/// </summary>
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number; // Higher level = more permissions
}

/// <summary>
/// Resource access policy
/// </summary>
export interface AccessPolicy {
  resource: string;
  action: string;
  permissions: string[];
  roles?: string[];
  condition?: (user: User, context?: any) => boolean;
}

/// <summary>
/// Authorization context for access checks
/// </summary>
export interface AuthorizationContext {
  resource: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/// <summary>
/// Authorization service for managing user permissions and access control.
/// Provides role-based and permission-based authorization functionality.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private readonly _permissions = signal<Permission[]>(this.getSystemPermissions());
  private readonly _roles = signal<Role[]>(this.getSystemRoles());
  private readonly _policies = signal<AccessPolicy[]>(this.getAccessPolicies());

  // Computed permissions for current user
  private readonly _userPermissions = computed(() => {
    const user = this.authService.currentUser();
    return user?.permissions || [];
  });

  private readonly _userRoles = computed(() => {
    const user = this.authService.currentUser();
    return user?.roles || [];
  });

  // Public readonly signals
  public readonly permissions = this._permissions.asReadonly();
  public readonly roles = this._roles.asReadonly();
  public readonly userPermissions = this._userPermissions;
  public readonly userRoles = this._userRoles;

  constructor(private readonly authService: AuthService) {}

  /// <summary>
  /// Checks if current user can perform an action on a resource
  /// </summary>
  /// <param name="resource">Resource to check access for</param>
  /// <param name="action">Action to perform on the resource</param>
  /// <param name="context">Optional context for the authorization check</param>
  /// <returns>True if user has access, false otherwise</returns>
  canAccess(resource: string, action: string, context?: any): boolean {
    const user = this.authService.currentUser();
    if (!user || !user.isActive) {
      return false;
    }

    // Find applicable policies
    const policies = this._policies().filter(policy =>
      policy.resource === resource && policy.action === action
    );

    if (policies.length === 0) {
      // No specific policy found, deny access by default
      return false;
    }

    // Check if any policy grants access
    return policies.some(policy => this.evaluatePolicy(policy, user, context));
  }

  /// <summary>
  /// Checks if current user can access multiple resources/actions
  /// </summary>
  /// <param name="checks">Array of authorization contexts to check</param>
  /// <returns>Record of access results for each check</returns>
  canAccessMultiple(checks: AuthorizationContext[]): Record<string, boolean> {
    const results: Record<string, boolean> = {};

    checks.forEach(check => {
      const key = `${check.resource}:${check.action}`;
      results[key] = this.canAccess(check.resource, check.action, check.metadata);
    });

    return results;
  }

  /// <summary>
  /// Observable version of canAccess for reactive components
  /// </summary>
  /// <param name="resource">Resource to check access for</param>
  /// <param name="action">Action to perform on the resource</param>
  /// <param name="context">Optional context for the authorization check</param>
  /// <returns>Observable of access result</returns>
  canAccess$(resource: string, action: string, context?: any): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !user.isActive) {
          return false;
        }
        return this.canAccess(resource, action, context);
      })
    );
  }

  /// <summary>
  /// Checks if user has permission for admin panel access
  /// </summary>
  /// <returns>True if user can access admin panel</returns>
  canAccessAdmin(): boolean {
    return this.authService.hasAnyRole(['admin', 'super_admin', 'moderator']) &&
           this.authService.hasAnyPermission(['admin.access', 'system.settings']);
  }

  /// <summary>
  /// Gets available actions for a resource based on user permissions
  /// </summary>
  /// <param name="resource">Resource to get actions for</param>
  /// <returns>Array of allowed actions</returns>
  getAvailableActions(resource: string): string[] {
    const user = this.authService.currentUser();
    if (!user || !user.isActive) {
      return [];
    }

    const resourcePolicies = this._policies().filter(policy => policy.resource === resource);
    const allowedActions: string[] = [];

    resourcePolicies.forEach(policy => {
      if (this.evaluatePolicy(policy, user)) {
        allowedActions.push(policy.action);
      }
    });

    return [...new Set(allowedActions)];
  }

  /// <summary>
  /// Gets user's effective permissions (including role-based permissions)
  /// </summary>
  /// <returns>Array of all effective permissions</returns>
  getEffectivePermissions(): string[] {
    const user = this.authService.currentUser();
    if (!user) {
      return [];
    }

    const userPermissions = new Set(user.permissions || []);

    // Add permissions from roles
    const userRoles = this._roles().filter(role => user.roles?.includes(role.id));
    userRoles.forEach(role => {
      role.permissions.forEach(permission => userPermissions.add(permission));
    });

    return Array.from(userPermissions);
  }

  /// <summary>
  /// Checks if user has minimum required role level
  /// </summary>
  /// <param name="minLevel">Minimum role level required</param>
  /// <returns>True if user has sufficient role level</returns>
  hasMinimumRoleLevel(minLevel: number): boolean {
    const user = this.authService.currentUser();
    if (!user || !user.roles) {
      return false;
    }

    const userRoles = this._roles().filter(role => user.roles!.includes(role.id));
    const maxUserLevel = Math.max(...userRoles.map(role => role.level), 0);

    return maxUserLevel >= minLevel;
  }

  /// <summary>
  /// Gets permission details by ID
  /// </summary>
  /// <param name="permissionId">Permission ID to get details for</param>
  /// <returns>Permission details or null if not found</returns>
  getPermissionDetails(permissionId: string): Permission | null {
    return this._permissions().find(p => p.id === permissionId) || null;
  }

  /// <summary>
  /// Gets role details by ID
  /// </summary>
  /// <param name="roleId">Role ID to get details for</param>
  /// <returns>Role details or null if not found</returns>
  getRoleDetails(roleId: string): Role | null {
    return this._roles().find(r => r.id === roleId) || null;
  }

  /// <summary>
  /// Checks if user owns a specific resource
  /// </summary>
  /// <param name="resourceType">Type of resource</param>
  /// <param name="resourceId">ID of the resource</param>
  /// <param name="ownerIdField">Field name that contains the owner ID (default: 'ownerId')</param>
  /// <returns>Observable of ownership result</returns>
  isResourceOwner(resourceType: string, resourceId: string, ownerIdField: string = 'ownerId'): Observable<boolean> {
    const user = this.authService.currentUser();
    if (!user) {
      return of(false);
    }

    // In a real application, this would make an API call to check ownership
    // For now, we'll simulate the check
    return of(true); // Mock implementation
  }

  /// <summary>
  /// Evaluates an access policy against a user and context
  /// </summary>
  /// <param name="policy">Access policy to evaluate</param>
  /// <param name="user">User to check against</param>
  /// <param name="context">Optional context for evaluation</param>
  /// <returns>True if policy grants access, false otherwise</returns>
  private evaluatePolicy(policy: AccessPolicy, user: User, context?: any): boolean {
    // Check role-based access
    if (policy.roles && policy.roles.length > 0) {
      const hasRequiredRole = policy.roles.some(role => user.roles?.includes(role));
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check permission-based access
    if (policy.permissions && policy.permissions.length > 0) {
      const hasRequiredPermission = policy.permissions.some(permission =>
        user.permissions?.includes(permission)
      );
      if (!hasRequiredPermission) {
        return false;
      }
    }

    // Check custom condition
    if (policy.condition) {
      return policy.condition(user, context);
    }

    return true;
  }

  /// <summary>
  /// Gets system permissions configuration
  /// </summary>
  /// <returns>Array of system permissions</returns>
  private getSystemPermissions(): Permission[] {
    return [
      // User management permissions
      { id: 'users.view', name: 'View Users', description: 'Can view user list and details', category: 'User Management' },
      { id: 'users.create', name: 'Create Users', description: 'Can create new users', category: 'User Management' },
      { id: 'users.edit', name: 'Edit Users', description: 'Can edit user information', category: 'User Management' },
      { id: 'users.delete', name: 'Delete Users', description: 'Can delete users', category: 'User Management' },
      { id: 'users.manage_roles', name: 'Manage User Roles', description: 'Can assign/remove user roles', category: 'User Management' },

      // Club management permissions
      { id: 'clubs.view', name: 'View Clubs', description: 'Can view club list and details', category: 'Club Management' },
      { id: 'clubs.create', name: 'Create Clubs', description: 'Can create new clubs', category: 'Club Management' },
      { id: 'clubs.edit', name: 'Edit Clubs', description: 'Can edit club information', category: 'Club Management' },
      { id: 'clubs.delete', name: 'Delete Clubs', description: 'Can delete clubs', category: 'Club Management' },
      { id: 'clubs.approve', name: 'Approve Clubs', description: 'Can approve club registrations', category: 'Club Management' },

      // Connection management permissions
      { id: 'connections.view', name: 'View Connections', description: 'Can view connection data', category: 'Connection Management' },
      { id: 'connections.create', name: 'Create Connections', description: 'Can create new connections', category: 'Connection Management' },
      { id: 'connections.edit', name: 'Edit Connections', description: 'Can edit connection information', category: 'Connection Management' },
      { id: 'connections.delete', name: 'Delete Connections', description: 'Can delete connections', category: 'Connection Management' },

      // File management permissions
      { id: 'files.view', name: 'View Files', description: 'Can view file list and details', category: 'File Management' },
      { id: 'files.upload', name: 'Upload Files', description: 'Can upload new files', category: 'File Management' },
      { id: 'files.delete', name: 'Delete Files', description: 'Can delete files', category: 'File Management' },
      { id: 'files.manage', name: 'Manage Files', description: 'Can organize and manage file structure', category: 'File Management' },

      // System permissions
      { id: 'system.settings', name: 'System Settings', description: 'Can access system settings', category: 'System' },
      { id: 'system.health', name: 'System Health', description: 'Can view system health information', category: 'System' },
      { id: 'system.logs', name: 'System Logs', description: 'Can view system logs', category: 'System' },
      { id: 'system.backup', name: 'System Backup', description: 'Can manage system backups', category: 'System' },

      // Analytics and reporting
      { id: 'analytics.view', name: 'View Analytics', description: 'Can view analytics data', category: 'Analytics' },
      { id: 'reports.generate', name: 'Generate Reports', description: 'Can generate system reports', category: 'Analytics' },

      // Admin panel access
      { id: 'admin.access', name: 'Admin Panel Access', description: 'Can access admin panel', category: 'Administration' }
    ];
  }

  /// <summary>
  /// Gets system roles configuration
  /// </summary>
  /// <returns>Array of system roles</returns>
  private getSystemRoles(): Role[] {
    return [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        level: 100,
        permissions: [
          'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
          'clubs.view', 'clubs.create', 'clubs.edit', 'clubs.delete', 'clubs.approve',
          'connections.view', 'connections.create', 'connections.edit', 'connections.delete',
          'files.view', 'files.upload', 'files.delete', 'files.manage',
          'system.settings', 'system.health', 'system.logs', 'system.backup',
          'analytics.view', 'reports.generate', 'admin.access'
        ]
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'System administration with most permissions',
        level: 80,
        permissions: [
          'users.view', 'users.edit', 'users.manage_roles',
          'clubs.view', 'clubs.create', 'clubs.edit', 'clubs.approve',
          'connections.view', 'connections.create', 'connections.edit',
          'files.view', 'files.upload', 'files.delete', 'files.manage',
          'system.settings', 'system.health', 'analytics.view', 'reports.generate', 'admin.access'
        ]
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Content moderation and basic administration',
        level: 50,
        permissions: [
          'users.view', 'users.edit',
          'clubs.view', 'clubs.edit', 'clubs.approve',
          'connections.view', 'connections.edit',
          'files.view', 'files.upload', 'admin.access'
        ]
      },
      {
        id: 'user',
        name: 'User',
        description: 'Basic user with limited permissions',
        level: 10,
        permissions: [
          'clubs.view', 'connections.view', 'files.view'
        ]
      }
    ];
  }

  /// <summary>
  /// Gets access policies configuration
  /// </summary>
  /// <returns>Array of access policies</returns>
  private getAccessPolicies(): AccessPolicy[] {
    return [
      // Admin panel access
      { resource: 'admin', action: 'access', permissions: ['admin.access'], roles: ['admin', 'super_admin', 'moderator'] },

      // Dashboard access
      { resource: 'dashboard', action: 'view', permissions: ['admin.access'] },

      // User management policies
      { resource: 'users', action: 'view', permissions: ['users.view'] },
      { resource: 'users', action: 'create', permissions: ['users.create'] },
      { resource: 'users', action: 'edit', permissions: ['users.edit'] },
      { resource: 'users', action: 'delete', permissions: ['users.delete'], roles: ['super_admin'] },

      // Club management policies
      { resource: 'clubs', action: 'view', permissions: ['clubs.view'] },
      { resource: 'clubs', action: 'create', permissions: ['clubs.create'] },
      { resource: 'clubs', action: 'edit', permissions: ['clubs.edit'] },
      { resource: 'clubs', action: 'delete', permissions: ['clubs.delete'], roles: ['admin', 'super_admin'] },

      // Connection management policies
      { resource: 'connections', action: 'view', permissions: ['connections.view'] },
      { resource: 'connections', action: 'create', permissions: ['connections.create'] },
      { resource: 'connections', action: 'edit', permissions: ['connections.edit'] },
      { resource: 'connections', action: 'delete', permissions: ['connections.delete'] },

      // File management policies
      { resource: 'files', action: 'view', permissions: ['files.view'] },
      { resource: 'files', action: 'upload', permissions: ['files.upload'] },
      { resource: 'files', action: 'delete', permissions: ['files.delete'] },

      // System management policies
      { resource: 'system', action: 'settings', permissions: ['system.settings'], roles: ['admin', 'super_admin'] },
      { resource: 'system', action: 'health', permissions: ['system.health'] },
      { resource: 'system', action: 'logs', permissions: ['system.logs'], roles: ['admin', 'super_admin'] }
    ];
  }
}
