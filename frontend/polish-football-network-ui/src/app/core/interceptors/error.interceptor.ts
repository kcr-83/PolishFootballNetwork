import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ERROR_MESSAGES, APP_CONSTANTS } from '../constants';

/**
 * Error interceptor using functional approach (Angular 15+)
 * Handles global error responses and provides user feedback
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    // Retry failed requests (except for specific error codes)
    retry({
      count: shouldRetry(req) ? APP_CONSTANTS.HTTP.RETRY_ATTEMPTS : 0,
      delay: (error: HttpErrorResponse) => {
        // Only retry on network errors or server errors (5xx)
        if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
          return throwError(() => error);
        }
        return throwError(() => error);
      },
    }),

    // Handle errors
    catchError((error: HttpErrorResponse) => {
      handleHttpError(error, authService, notificationService, router);
      return throwError(() => error);
    })
  );
};

/**
 * Handle HTTP errors based on status code
 */
function handleHttpError(
  error: HttpErrorResponse,
  authService: AuthService,
  notificationService: NotificationService,
  router: Router
): void {
  switch (error.status) {
    case 0:
      // Network error
      notificationService.error(ERROR_MESSAGES.GENERAL.NETWORK);
      break;

    case 400:
      // Bad Request - usually validation errors
      handleValidationError(error, notificationService);
      break;

    case 401:
      // Unauthorized - handle authentication issues
      handleUnauthorizedError(authService, notificationService, router);
      break;

    case 403:
      // Forbidden - access denied
      notificationService.error(ERROR_MESSAGES.GENERAL.FORBIDDEN);
      break;

    case 404:
      // Not Found
      if (shouldShowNotFoundError(error.url || '')) {
        notificationService.warning(ERROR_MESSAGES.GENERAL.NOT_FOUND);
      }
      break;

    case 408:
      // Request Timeout
      notificationService.error(ERROR_MESSAGES.GENERAL.TIMEOUT);
      break;

    case 409:
      // Conflict - usually business logic conflicts
      const conflictMessage = extractErrorMessage(error) || 'A conflict occurred. Please refresh and try again.';
      notificationService.warning(conflictMessage);
      break;

    case 422:
      // Unprocessable Entity - validation errors from server
      handleValidationError(error, notificationService);
      break;

    case 429:
      // Too Many Requests
      notificationService.warning('Too many requests. Please slow down and try again later.');
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      notificationService.error(ERROR_MESSAGES.GENERAL.SERVER_ERROR);
      break;

    default:
      // Unknown error
      const defaultMessage = extractErrorMessage(error) || ERROR_MESSAGES.GENERAL.UNKNOWN;
      notificationService.error(defaultMessage);
      break;
  }
}

/**
 * Handle validation errors (400, 422)
 */
function handleValidationError(error: HttpErrorResponse, notificationService: NotificationService): void {
  const errorData = error.error;

  if (errorData && typeof errorData === 'object') {
    // Check for validation errors object
    if (errorData.errors && typeof errorData.errors === 'object') {
      // Display first validation error
      const firstErrorKey = Object.keys(errorData.errors)[0];
      if (firstErrorKey && Array.isArray(errorData.errors[firstErrorKey])) {
        const firstError = errorData.errors[firstErrorKey][0];
        notificationService.error(firstError);
        return;
      }
    }

    // Check for message property
    if (errorData.message && typeof errorData.message === 'string') {
      notificationService.error(errorData.message);
      return;
    }
  }

  // Fallback to generic validation message
  notificationService.error(ERROR_MESSAGES.GENERAL.VALIDATION);
}

/**
 * Handle unauthorized errors (401)
 */
function handleUnauthorizedError(
  authService: AuthService,
  notificationService: NotificationService,
  router: Router
): void {
  // Clear authentication and redirect to login
  authService.logout();

  // Only show notification if not already on login page
  if (!router.url.includes('/auth/login')) {
    notificationService.warning(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED);
  }
}

/**
 * Extract error message from HTTP error response
 */
function extractErrorMessage(error: HttpErrorResponse): string | null {
  if (error.error && typeof error.error === 'object') {
    if (typeof error.error.message === 'string') {
      return error.error.message;
    }

    if (typeof error.error.error === 'string') {
      return error.error.error;
    }
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  return null;
}

/**
 * Determine if request should be retried
 */
function shouldRetry(req: HttpRequest<unknown>): boolean {
  // Don't retry authentication requests
  const authUrls = [
    '/auth/login',
    '/auth/logout',
    '/auth/register',
    '/auth/refresh',
  ];

  if (authUrls.some(url => req.url.includes(url))) {
    return false;
  }

  // Don't retry POST, PUT, PATCH, DELETE requests by default
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
    return false;
  }

  return true;
}

/**
 * Determine if 404 error should show notification
 */
function shouldShowNotFoundError(url: string): boolean {
  // Don't show 404 notifications for certain endpoints that might legitimately not exist
  const silentNotFoundUrls = [
    '/api/users/me', // User profile might not exist yet
    '/api/notifications', // Notifications might be empty
  ];

  return !silentNotFoundUrls.some(silentUrl => url.includes(silentUrl));
}
