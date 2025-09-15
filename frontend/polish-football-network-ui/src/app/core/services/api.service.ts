import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, retry, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { APP_CONSTANTS, ERROR_MESSAGES } from '../constants';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
  ApiError,
} from '../models';

/**
 * Generic API service with modern Angular patterns and error handling
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Loading state management with signals
  private readonly loadingState = signal<Record<string, boolean>>({});
  private readonly errorState = signal<ApiError | null>(null);

  // Computed signals for UI consumption
  public readonly isLoading = computed(() => Object.values(this.loadingState()).some(Boolean));
  public readonly currentError = computed(() => this.errorState());

  /**
   * Generic GET request method
   */
  public get<T>(endpoint: string, params?: Record<string, unknown>): Observable<T> {
    return this.makeRequest<T>('GET', endpoint, undefined, params);
  }

  /**
   * Generic POST request method
   */
  public post<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Observable<T> {
    return this.makeRequest<T>('POST', endpoint, body, params);
  }

  /**
   * Generic PUT request method
   */
  public put<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Observable<T> {
    return this.makeRequest<T>('PUT', endpoint, body, params);
  }

  /**
   * Generic DELETE request method
   */
  public delete<T>(endpoint: string, params?: Record<string, unknown>): Observable<T> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, params);
  }

  /**
   * Generic PATCH request method
   */
  public patch<T>(endpoint: string, body?: unknown, params?: Record<string, unknown>): Observable<T> {
    return this.makeRequest<T>('PATCH', endpoint, body, params);
  }

  /**
   * Upload file method with progress tracking
   */
  public uploadFile<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.makeRequest<T>('POST', endpoint, formData);
  }

  /**
   * Get paginated data
   */
  public getPaginated<T>(
    endpoint: string,
    pagination: PaginationParams,
    filters?: FilterParams
  ): Observable<PaginatedResponse<T>> {
    const params = this.buildPaginationParams(pagination, filters);
    return this.get<PaginatedResponse<T>>(endpoint, params);
  }

  /**
   * Set loading state for specific operation
   */
  public setLoading(operation: string, isLoading: boolean): void {
    this.loadingState.update(state => ({
      ...state,
      [operation]: isLoading,
    }));
  }

  /**
   * Clear all loading states
   */
  public clearLoading(): void {
    this.loadingState.set({});
  }

  /**
   * Set error state
   */
  public setError(error: ApiError | null): void {
    this.errorState.set(error);
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.errorState.set(null);
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Build HTTP params from object
   */
  private buildHttpParams(params?: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(item => {
              httpParams = httpParams.append(key, String(item));
            });
          } else {
            httpParams = httpParams.set(key, String(value));
          }
        }
      });
    }

    return httpParams;
  }

  /**
   * Build pagination parameters
   */
  private buildPaginationParams(
    pagination: PaginationParams,
    filters?: FilterParams
  ): Record<string, unknown> {
    return {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(pagination.sortBy && { sortBy: pagination.sortBy }),
      ...(pagination.sortDirection && { sortDirection: pagination.sortDirection }),
      ...(filters && filters),
    };
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  private makeRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Observable<T> {
    const url = this.buildUrl(endpoint);
    const httpParams = this.buildHttpParams(params);
    const operationKey = `${method}:${endpoint}`;

    // Set loading state
    this.setLoading(operationKey, true);
    this.clearError();

    const options: Record<string, unknown> = {
      params: httpParams,
    };

    if (body) {
      options['body'] = body;
    }

    const request$ = this.http.request<ApiResponse<T>>(method, url, options).pipe(
      timeout(APP_CONSTANTS.HTTP.TIMEOUT),
      retry({
        count: APP_CONSTANTS.HTTP.RETRY_ATTEMPTS,
        delay: APP_CONSTANTS.HTTP.RETRY_DELAY,
      }),
      map(response => {
        if (response && typeof response === 'object' && 'data' in response) {
          return (response as ApiResponse<T>).data;
        }
        return response as T;
      }),
      catchError(error => {
        const apiError = this.handleHttpError(error);
        this.setError(apiError);
        return throwError(() => apiError);
      })
    );

    // Handle loading state cleanup
    request$.subscribe({
      next: () => this.setLoading(operationKey, false),
      error: () => this.setLoading(operationKey, false),
    });

    return request$;
  }

  /**
   * Handle HTTP errors and convert to ApiError
   */
  private handleHttpError(error: unknown): ApiError {
    if (error && typeof error === 'object') {
      const httpError = error as {
        status?: number;
        error?: {
          message?: string;
          errors?: Record<string, string[]>;
          timestamp?: string;
          path?: string;
          correlationId?: string;
        };
        message?: string;
        url?: string;
      };

      const statusCode = httpError.status ?? 500;
      const errorData = httpError.error;

      let message: string = ERROR_MESSAGES.GENERAL.UNKNOWN;

      switch (statusCode) {
        case 400:
          message = errorData?.message ?? ERROR_MESSAGES.GENERAL.VALIDATION;
          break;
        case 401:
          message = ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;
          break;
        case 403:
          message = ERROR_MESSAGES.GENERAL.FORBIDDEN;
          break;
        case 404:
          message = ERROR_MESSAGES.GENERAL.NOT_FOUND;
          break;
        case 408:
          message = ERROR_MESSAGES.GENERAL.TIMEOUT;
          break;
        case 0:
          message = ERROR_MESSAGES.GENERAL.NETWORK;
          break;
        case 500:
        default:
          message = ERROR_MESSAGES.GENERAL.SERVER_ERROR;
          break;
      }

      return {
        message: errorData?.message ?? message,
        statusCode,
        timestamp: errorData?.timestamp ?? new Date().toISOString(),
        path: errorData?.path ?? httpError.url ?? '',
        errors: errorData?.errors,
        correlationId: errorData?.correlationId,
      };
    }

    return {
      message: ERROR_MESSAGES.GENERAL.UNKNOWN,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }
}
