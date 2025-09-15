import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ERROR_MESSAGES } from '../constants';

/**
 * Authentication guard using functional approach (Angular 15+)
 * Protects routes that require user authentication
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login page with return URL
  const returnUrl = router.url;
  notificationService.info(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED);

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl }
  });
};

/**
 * Guest guard - prevents authenticated users from accessing auth pages
 * Redirects authenticated users to dashboard
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is authenticated, redirect to dashboard
  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
