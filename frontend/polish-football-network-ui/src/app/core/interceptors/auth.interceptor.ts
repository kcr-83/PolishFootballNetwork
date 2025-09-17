import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Authentication interceptor using functional approach (Angular 15+)
 * Automatically adds JWT token to outgoing HTTP requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // URLs that should skip authentication
  const skipAuthUrls = [
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
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
