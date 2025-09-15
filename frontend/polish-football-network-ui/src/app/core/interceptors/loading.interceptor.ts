import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

/**
 * Loading interceptor using functional approach (Angular 15+)
 * Manages loading states for HTTP requests automatically
 */
export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const apiService = inject(ApiService);

  // Generate operation key for tracking this specific request
  const operationKey = generateOperationKey(req);

  // Set loading state for this operation
  apiService.setLoading(operationKey, true);

  return next(req).pipe(
    tap({
      next: (event) => {
        // You can add additional logic here for successful responses
        if (event instanceof HttpResponse) {
          // Request completed successfully
        }
      },
      error: () => {
        // Error handling is done in error interceptor
        // Just ensure loading state is cleared
      }
    }),
    finalize(() => {
      // Always clear loading state when request completes (success or error)
      apiService.setLoading(operationKey, false);
    })
  );
};

/**
 * Generate a unique operation key for the request
 */
function generateOperationKey(req: HttpRequest<unknown>): string {
  // Create a unique key based on method, URL, and timestamp
  const baseKey = `${req.method}:${getEndpointFromUrl(req.url)}`;

  // For GET requests, include query parameters to differentiate
  if (req.method === 'GET' && req.params.keys().length > 0) {
    const params = req.params.keys().map(key => `${key}=${req.params.get(key)}`).join('&');
    return `${baseKey}?${params}`;
  }

  // For non-GET requests, add timestamp to allow multiple concurrent requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return `${baseKey}:${Date.now()}`;
  }

  return baseKey;
}

/**
 * Extract endpoint path from full URL
 */
function getEndpointFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    // If URL is relative, return as-is
    return url.split('?')[0]; // Remove query parameters
  }
}
