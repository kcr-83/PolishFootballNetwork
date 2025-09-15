/**
 * HTTP Interceptors for the Polish Football Network application
 *
 * These interceptors handle cross-cutting concerns:
 * - Authentication: Automatically adds JWT tokens to requests
 * - Error handling: Global error handling and user notifications
 * - Loading states: Automatic loading state management
 *
 * TODO: Uncomment exports as interceptor files are created
 */

// export { authInterceptor } from './auth.interceptor';
// export { errorInterceptor } from './error.interceptor';
// export { loadingInterceptor } from './loading.interceptor';

/**
 * Array of HTTP interceptors in the order they should be applied
 * Order matters: auth -> loading -> error
 * TODO: Uncomment as interceptors are implemented
 */
export const httpInterceptors = [
  // authInterceptor,
  // loadingInterceptor,
  // errorInterceptor,
] as const;
