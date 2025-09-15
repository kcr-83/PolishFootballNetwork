// Re-export all models for easier imports
export * from './entities';
export * from './dtos';
export * from './enums';
export * from './forms';

/**
 * Common utility types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number | string;

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
}

/**
 * Filter parameters interface
 */
export interface FilterParams {
  readonly search?: string;
  readonly league?: string;
  readonly country?: string;
  readonly isActive?: boolean;
  readonly isVerified?: boolean;
}

/**
 * API error interface
 */
export interface ApiError {
  readonly message: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly path: string;
  readonly errors?: Record<string, string[]>;
  readonly correlationId?: string;
}

/**
 * Loading state interface
 */
export interface LoadingState {
  readonly isLoading: boolean;
  readonly error?: ApiError;
}

/**
 * Feature flags interface
 */
export interface FeatureFlags {
  readonly enableDarkMode: boolean;
  readonly enableNotifications: boolean;
  readonly enableAnalytics: boolean;
  readonly enableExperimentalFeatures: boolean;
  readonly maintenanceMode: boolean;
}

/**
 * App configuration interface
 */
export interface AppConfig {
  readonly production: boolean;
  readonly apiUrl: string;
  readonly version: string;
  readonly buildTimestamp: string;
  readonly supportEmail: string;
  readonly features: FeatureFlags;
}
