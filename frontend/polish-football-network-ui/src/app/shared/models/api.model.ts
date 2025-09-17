/// <summary>
/// API response and request models for standardized communication with the backend.
/// </summary>

/// <summary>
/// Standard API response wrapper for single items.
/// </summary>
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp: string;
}

/// <summary>
/// Paginated response wrapper for list endpoints.
/// </summary>
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/// <summary>
/// Error response structure from the API.
/// </summary>
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  statusCode: number;
  timestamp: string;
  path?: string;
}

/// <summary>
/// Request metadata for API calls.
/// </summary>
export interface RequestMetadata {
  requestId?: string;
  timestamp: string;
  userId?: string;
  userAgent?: string;
}

/// <summary>
/// Pagination parameters for list requests.
/// </summary>
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/// <summary>
/// Filter parameters for search and filtering operations.
/// </summary>
export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  activeOnly?: boolean;
}

/// <summary>
/// Bulk operation request structure.
/// </summary>
export interface BulkOperationRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    stopOnError?: boolean;
    batchSize?: number;
    validateAll?: boolean;
  };
}

/// <summary>
/// Bulk operation response structure.
/// </summary>
export interface BulkOperationResponse<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
    index: number;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/// <summary>
/// Cache configuration for API requests.
/// </summary>
export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  enabled?: boolean;
  tags?: string[]; // Cache tags for invalidation
}

/// <summary>
/// API request options with enhanced configuration.
/// </summary>
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  cache?: CacheConfig;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/// <summary>
/// Search and sort configuration.
/// </summary>
export interface SearchConfig {
  searchFields?: string[];
  highlightMatches?: boolean;
  fuzzySearch?: boolean;
  minimumScore?: number;
}

/// <summary>
/// Validation error details.
/// </summary>
export interface ValidationError {
  field: string;
  value: unknown;
  message: string;
  code: string;
}

/// <summary>
/// Progress tracking for long-running operations.
/// </summary>
export interface OperationProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message?: string;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

/// <summary>
/// Standard list request parameters.
/// </summary>
export interface ListRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

/// <summary>
/// Bulk operation request structure.
/// </summary>
export interface BulkRequest<T> {
  items: T[];
  operation: 'create' | 'update' | 'delete';
  metadata?: RequestMetadata;
}

/// <summary>
/// Bulk operation response structure.
/// </summary>
export interface BulkResponse<T> {
  success: boolean;
  successCount: number;
  errorCount: number;
  results: BulkItemResult<T>[];
  message?: string;
}

/// <summary>
/// Individual item result within a bulk operation.
/// </summary>
export interface BulkItemResult<T> {
  success: boolean;
  item?: T;
  error?: string;
  index: number;
}

/// <summary>
/// File upload response structure.
/// </summary>
export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

/// <summary>
/// Health check response structure.
/// </summary>
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: Record<string, ServiceHealth>;
  version?: string;
}

/// <summary>
/// Individual service health information.
/// </summary>
export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  message?: string;
}
