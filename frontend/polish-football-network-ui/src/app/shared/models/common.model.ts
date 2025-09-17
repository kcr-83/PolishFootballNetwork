/// <summary>
/// Common type definitions and enums used across the application.
/// </summary>

/// <summary>
/// Represents the loading state of an operation.
/// </summary>
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/// <summary>
/// Generic result type for operations that can succeed or fail.
/// </summary>
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/// <summary>
/// Base interface for entities with common properties.
/// </summary>
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

/// <summary>
/// Search parameters for filtering requests.
/// </summary>
export interface SearchParams {
  search?: string;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/// <summary>
/// File upload information.
/// </summary>
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: Date;
}

/// <summary>
/// Notification types for user feedback.
/// </summary>
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/// <summary>
/// Notification object structure with enhanced properties for queue management.
/// </summary>
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  createdAt: Date;
  // Enhanced properties
  action?: string;
  persistent?: boolean;
  data?: unknown;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  groupKey?: string;
  timestamp?: Date; // For backward compatibility
}

/// <summary>
/// Service state management interface for consistent state handling across services.
/// </summary>
export interface ServiceState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  hasPendingChanges: boolean;
}

/// <summary>
/// Generic operation result with additional metadata.
/// </summary>
export interface OperationResult<T = unknown> extends Result<T> {
  operation: string;
  timestamp: Date;
  duration?: number; // Operation duration in milliseconds
  metadata?: Record<string, unknown>;
}

/// <summary>
/// Validation rule configuration.
/// </summary>
export interface ValidationRule {
  field: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url' | 'custom';
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

/// <summary>
/// Field validation result.
/// </summary>
export interface FieldValidationResult {
  field: string;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/// <summary>
/// Form validation result.
/// </summary>
export interface FormValidationResult {
  isValid: boolean;
  fieldResults: FieldValidationResult[];
  globalErrors?: string[];
  summary: {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    warningFields: number;
  };
}

/// <summary>
/// Sorting configuration.
/// </summary>
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  type?: 'string' | 'number' | 'date' | 'boolean';
}

/// <summary>
/// Cache entry metadata.
/// </summary>
export interface CacheMetadata {
  key: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  size?: number; // Size in bytes
}

/// <summary>
/// Service configuration interface.
/// </summary>
export interface ServiceConfig {
  name: string;
  enabled: boolean;
  options: Record<string, unknown>;
  caching?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  retry?: {
    attempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
}

/// <summary>
/// Application theme configuration.
/// </summary>
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    warn: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

/// <summary>
/// User preferences and settings.
/// </summary>
export interface UserPreferences {
  theme: string;
  language: string;
  notifications: {
    enabled: boolean;
    position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    duration: number;
    sound: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
    refreshInterval: number;
  };
  graph: {
    defaultLayout: string;
    animationsEnabled: boolean;
    showLabels: boolean;
    colorScheme: string;
  };
}
