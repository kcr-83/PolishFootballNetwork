import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthorizationService } from '../services/authorization.service';

/// <summary>
/// Authentication guard to protect routes that require user to be logged in.
/// Redirects unauthenticated users to login page.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  /// <summary>
  /// Checks if route can be activated based on authentication status
  /// </summary>
  /// <param name="route">Activated route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user is authenticated, false otherwise</returns>
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuthentication(state.url);
  }

  /// <summary>
  /// Checks if child routes can be activated based on authentication status
  /// </summary>
  /// <param name="childRoute">Child route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user is authenticated, false otherwise</returns>
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /// <summary>
  /// Performs authentication check and redirects if necessary
  /// </summary>
  /// <param name="url">Current URL attempting to access</param>
  /// <returns>Observable indicating if access is allowed</returns>
  private checkAuthentication(url: string): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (user && user.isActive) {
          return true;
        } else {
          // Store intended URL for redirect after login
          localStorage.setItem('intended_url', url);
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}

/// <summary>
/// Admin guard to protect admin routes that require admin access.
/// Checks both authentication and admin permissions.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly router: Router
  ) {}

  /// <summary>
  /// Checks if route can be activated based on admin permissions
  /// </summary>
  /// <param name="route">Activated route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has admin access, false otherwise</returns>
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAdminAccess();
  }

  /// <summary>
  /// Checks if child routes can be activated based on admin permissions
  /// </summary>
  /// <param name="childRoute">Child route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has admin access, false otherwise</returns>
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /// <summary>
  /// Performs admin access check
  /// </summary>
  /// <returns>Observable indicating if admin access is allowed</returns>
  private checkAdminAccess(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !user.isActive) {
          this.router.navigate(['/login']);
          return false;
        }

        if (this.authorizationService.canAccessAdmin()) {
          return true;
        } else {
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }),
      catchError(() => {
        this.router.navigate(['/unauthorized']);
        return of(false);
      })
    );
  }
}

/// <summary>
/// Role-based guard to protect routes that require specific roles.
/// Configured via route data with 'roles' property.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  /// <summary>
  /// Checks if route can be activated based on required roles
  /// </summary>
  /// <param name="route">Activated route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has required roles, false otherwise</returns>
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredRoles = route.data['roles'] as string[];
    return this.checkRoles(requiredRoles);
  }

  /// <summary>
  /// Checks if child routes can be activated based on required roles
  /// </summary>
  /// <param name="childRoute">Child route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has required roles, false otherwise</returns>
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /// <summary>
  /// Performs role-based access check
  /// </summary>
  /// <param name="requiredRoles">Array of required roles</param>
  /// <returns>Observable indicating if role access is allowed</returns>
  private checkRoles(requiredRoles: string[]): Observable<boolean> {
    if (!requiredRoles || requiredRoles.length === 0) {
      return of(true);
    }

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !user.isActive) {
          this.router.navigate(['/login']);
          return false;
        }

        const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
        if (!hasRequiredRole) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      }),
      catchError(() => {
        this.router.navigate(['/unauthorized']);
        return of(false);
      })
    );
  }
}

/// <summary>
/// Permission-based guard to protect routes that require specific permissions.
/// Configured via route data with 'permissions' property.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly router: Router
  ) {}

  /// <summary>
  /// Checks if route can be activated based on required permissions
  /// </summary>
  /// <param name="route">Activated route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has required permissions, false otherwise</returns>
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredPermissions = route.data['permissions'] as string[];
    const requireAll = route.data['requireAllPermissions'] as boolean || false;
    return this.checkPermissions(requiredPermissions, requireAll);
  }

  /// <summary>
  /// Checks if child routes can be activated based on required permissions
  /// </summary>
  /// <param name="childRoute">Child route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has required permissions, false otherwise</returns>
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /// <summary>
  /// Performs permission-based access check
  /// </summary>
  /// <param name="requiredPermissions">Array of required permissions</param>
  /// <param name="requireAll">Whether all permissions are required (default: any)</param>
  /// <returns>Observable indicating if permission access is allowed</returns>
  private checkPermissions(requiredPermissions: string[], requireAll: boolean = false): Observable<boolean> {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return of(true);
    }

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !user.isActive) {
          this.router.navigate(['/login']);
          return false;
        }

        const hasPermissions = requireAll
          ? requiredPermissions.every(permission => this.authService.hasPermission(permission))
          : this.authService.hasAnyPermission(requiredPermissions);

        if (!hasPermissions) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        return true;
      }),
      catchError(() => {
        this.router.navigate(['/unauthorized']);
        return of(false);
      })
    );
  }
}

/// <summary>
/// Resource-based guard to protect routes that require access to specific resources.
/// Configured via route data with 'resource' and 'action' properties.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class ResourceGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
    private readonly router: Router
  ) {}

  /// <summary>
  /// Checks if route can be activated based on resource access
  /// </summary>
  /// <param name="route">Activated route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has resource access, false otherwise</returns>
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const resource = route.data['resource'] as string;
    const action = route.data['action'] as string;
    const context = {
      routeParams: route.params,
      queryParams: route.queryParams,
      ...route.data['context']
    };

    return this.checkResourceAccess(resource, action, context);
  }

  /// <summary>
  /// Checks if child routes can be activated based on resource access
  /// </summary>
  /// <param name="childRoute">Child route snapshot</param>
  /// <param name="state">Router state snapshot</param>
  /// <returns>True if user has resource access, false otherwise</returns>
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  /// <summary>
  /// Performs resource-based access check
  /// </summary>
  /// <param name="resource">Resource to check access for</param>
  /// <param name="action">Action to check access for</param>
  /// <param name="context">Context for the access check</param>
  /// <returns>Observable indicating if resource access is allowed</returns>
  private checkResourceAccess(resource: string, action: string, context?: any): Observable<boolean> {
    if (!resource || !action) {
      return of(true);
    }

    return this.authorizationService.canAccess$(resource, action, context).pipe(
      tap(hasAccess => {
        if (!hasAccess) {
          const user = this.authService.currentUser();
          if (!user) {
            this.router.navigate(['/login']);
          } else {
            this.router.navigate(['/unauthorized']);
          }
        }
      }),
      catchError(() => {
        this.router.navigate(['/unauthorized']);
        return of(false);
      })
    );
  }
}
