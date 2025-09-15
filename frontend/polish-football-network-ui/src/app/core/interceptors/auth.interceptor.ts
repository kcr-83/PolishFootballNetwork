import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { APP_CONSTANTS } from '../constants';

/**
 * Authentication interceptor using functional approach (Angular 15+)
 * Automatically adds JWT token to requests that require authentication
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // Get current token from auth service
  const token = authService.token();

  // Skip adding token for authentication endpoints to avoid circular issues
  const skipAuthUrls = [
    APP_CONSTANTS.ENDPOINTS.AUTH.LOGIN,
    APP_CONSTANTS.ENDPOINTS.AUTH.LOGOUT,
    APP_CONSTANTS.ENDPOINTS.AUTH.REFRESH,
    '/auth/register',
    '/auth/request-password-reset',
    '/auth/reset-password',
  ];

  const shouldSkipAuth = skipAuthUrls.some(url => req.url.includes(url));

  // If no token or should skip auth, proceed without modification
  if (!token || shouldSkipAuth) {
    return next(req);
  }

  // Clone request and add Authorization header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
