import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthorizationService } from '../services/authorization.service';

/// <summary>
/// Structural directive that conditionally renders content based on user permissions.
/// Usage: *hasPermission="'permission.name'" or *hasPermission="['perm1', 'perm2']"
/// </summary>
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set hasPermission(permissions: string | string[]) {
    this.checkPermissions(permissions);
  }

  @Input() hasPermissionRequireAll = false;

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Re-check permissions when user changes
        if (this.hasPermission) {
          this.checkPermissions(this.hasPermission);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Checks permissions and updates view visibility
  /// </summary>
  /// <param name="permissions">Permission(s) to check</param>
  private checkPermissions(permissions: string | string[]): void {
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

    let hasPermission: boolean;

    if (this.hasPermissionRequireAll) {
      hasPermission = permissionArray.every(permission => this.authService.hasPermission(permission));
    } else {
      hasPermission = this.authService.hasAnyPermission(permissionArray);
    }

    this.updateView(hasPermission);
  }

  /// <summary>
  /// Updates the view based on permission check result
  /// </summary>
  /// <param name="show">Whether to show the view</param>
  private updateView(show: boolean): void {
    if (show && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!show && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/// <summary>
/// Structural directive that conditionally renders content based on user roles.
/// Usage: *hasRole="'role.name'" or *hasRole="['role1', 'role2']"
/// </summary>
@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set hasRole(roles: string | string[]) {
    this.checkRoles(roles);
  }

  @Input() hasRoleRequireAll = false;

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Re-check roles when user changes
        if (this.hasRole) {
          this.checkRoles(this.hasRole);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Checks roles and updates view visibility
  /// </summary>
  /// <param name="roles">Role(s) to check</param>
  private checkRoles(roles: string | string[]): void {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    let hasRole: boolean;

    if (this.hasRoleRequireAll) {
      hasRole = this.authService.hasAllRoles(roleArray);
    } else {
      hasRole = this.authService.hasAnyRole(roleArray);
    }

    this.updateView(hasRole);
  }

  /// <summary>
  /// Updates the view based on role check result
  /// </summary>
  /// <param name="show">Whether to show the view</param>
  private updateView(show: boolean): void {
    if (show && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!show && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/// <summary>
/// Structural directive that conditionally renders content based on resource access.
/// Usage: *canAccess="'resource:action'" or *canAccess="{resource: 'users', action: 'edit'}"
/// </summary>
@Directive({
  selector: '[canAccess]',
  standalone: true
})
export class CanAccessDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set canAccess(access: string | { resource: string; action: string; context?: any }) {
    this.checkAccess(access);
  }

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authorizationService: AuthorizationService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authorizationService.userPermissions()
    // Note: In a real implementation, we'd want to listen to user changes
    // For now, we'll check access once during initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Checks resource access and updates view visibility
  /// </summary>
  /// <param name="access">Access configuration</param>
  private checkAccess(access: string | { resource: string; action: string; context?: any }): void {
    let resource: string;
    let action: string;
    let context: any;

    if (typeof access === 'string') {
      // Parse "resource:action" format
      const parts = access.split(':');
      if (parts.length !== 2) {
        console.error('Invalid canAccess format. Use "resource:action" or object format.');
        return;
      }
      [resource, action] = parts;
    } else {
      resource = access.resource;
      action = access.action;
      context = access.context;
    }

    const canAccess = this.authorizationService.canAccess(resource, action, context);
    this.updateView(canAccess);
  }

  /// <summary>
  /// Updates the view based on access check result
  /// </summary>
  /// <param name="show">Whether to show the view</param>
  private updateView(show: boolean): void {
    if (show && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!show && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/// <summary>
/// Structural directive that shows content only when user is authenticated.
/// Usage: *isAuthenticated
/// </summary>
@Directive({
  selector: '[isAuthenticated]',
  standalone: true
})
export class IsAuthenticatedDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.updateView(!!user && user.isActive);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Updates the view based on authentication status
  /// </summary>
  /// <param name="show">Whether to show the view</param>
  private updateView(show: boolean): void {
    if (show && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!show && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/// <summary>
/// Structural directive that shows content only when user is NOT authenticated.
/// Usage: *isNotAuthenticated
/// </summary>
@Directive({
  selector: '[isNotAuthenticated]',
  standalone: true
})
export class IsNotAuthenticatedDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen for authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.updateView(!user || !user.isActive);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Updates the view based on authentication status
  /// </summary>
  /// <param name="show">Whether to show the view</param>
  private updateView(show: boolean): void {
    if (show && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!show && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
