/// <summary>
/// Central index file for all application models and interfaces.
/// Provides convenient imports for all model types across the application.
/// </summary>

// Common models and base interfaces
export * from './common.model';

// API and communication models (excluding PaginationParams to avoid duplicate)
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RequestMetadata,
  FilterParams,
  BulkOperationRequest,
  BulkOperationResponse,
  CacheConfig,
  ApiRequestOptions,
  SearchConfig,
  ValidationError,
  OperationProgress
} from './api.model';

// Domain-specific models
export * from './club.model';
export * from './connection.model';
export * from './graph.model';

// Import types for utility functions
import type {
  BaseEntity,
  Club,
  Connection,
  Notification
} from './index';

/// <summary>
/// Model validation utilities and type guards.
/// </summary>

export function isValidId(id: unknown): id is number {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

export function isBaseEntity(obj: unknown): obj is BaseEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    isValidId((obj as any).id)
  );
}

export function isClub(obj: unknown): obj is Club {
  return (
    isBaseEntity(obj) &&
    'name' in obj &&
    'city' in obj &&
    'league' in obj &&
    'foundedYear' in obj &&
    'isActive' in obj &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).city === 'string' &&
    typeof (obj as any).league === 'string' &&
    typeof (obj as any).foundedYear === 'number' &&
    typeof (obj as any).isActive === 'boolean'
  );
}

export function isConnection(obj: unknown): obj is Connection {
  return (
    isBaseEntity(obj) &&
    'sourceClubId' in obj &&
    'targetClubId' in obj &&
    'type' in obj &&
    'strength' in obj &&
    'isActive' in obj &&
    'weight' in obj &&
    isValidId((obj as any).sourceClubId) &&
    isValidId((obj as any).targetClubId) &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).strength === 'string' &&
    typeof (obj as any).isActive === 'boolean' &&
    typeof (obj as any).weight === 'number'
  );
}

export function isNotification(obj: unknown): obj is Notification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'title' in obj &&
    'message' in obj &&
    'createdAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).title === 'string' &&
    typeof (obj as any).message === 'string' &&
    (obj as any).createdAt instanceof Date
  );
}
