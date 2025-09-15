import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../models';
import { ERROR_MESSAGES } from '../constants';

/**
 * Admin guard - restricts access to admin-only routes
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Check if user is authenticated first
  if (!authService.isAuthenticated()) {
    notificationService.info(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED);
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user has admin role
  if (authService.hasAnyRole([UserRole.Admin, UserRole.SuperAdmin])) {
    return true;
  }

  // Access denied
  notificationService.error(ERROR_MESSAGES.AUTH.ACCESS_DENIED);
  return router.createUrlTree(['/dashboard']);
};

/**
 * Super admin guard - restricts access to super admin only routes
 */
export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Check if user is authenticated first
  if (!authService.isAuthenticated()) {
    notificationService.info(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED);
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user has super admin role
  if (authService.hasRole(UserRole.SuperAdmin)) {
    return true;
  }

  // Access denied
  notificationService.error(ERROR_MESSAGES.AUTH.ACCESS_DENIED);
  return router.createUrlTree(['/dashboard']);
};

/**
 * Club admin guard - allows club admins and admins
 */
export const clubAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Check if user is authenticated first
  if (!authService.isAuthenticated()) {
    notificationService.info(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED);
    return router.createUrlTree(['/auth/login']);
  }

  // Check if user can manage clubs
  if (authService.canManageClubs()) {
    return true;
  }

  // Access denied
  notificationService.error(ERROR_MESSAGES.AUTH.ACCESS_DENIED);
  return router.createUrlTree(['/dashboard']);
};

/**
 * Role-based guard factory - creates guards for specific roles
 */
export function createRoleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    // Check if user is authenticated first
    if (!authService.isAuthenticated()) {
      notificationService.info(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED);
      return router.createUrlTree(['/auth/login']);
    }

    // Check if user has any of the allowed roles
    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    // Access denied
    notificationService.error(ERROR_MESSAGES.AUTH.ACCESS_DENIED);
    return router.createUrlTree(['/dashboard']);
  };
}
