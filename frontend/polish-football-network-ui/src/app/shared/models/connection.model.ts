import { BaseEntity } from './common.model';

/// <summary>
/// Types of connections between football clubs.
/// </summary>
export type ConnectionType =
  | 'rivalry'
  | 'friendly'
  | 'geographic'
  | 'historical'
  | 'business'
  | 'player_transfer'
  | 'coaching_staff'
  | 'partnership';

/// <summary>
/// Strength levels for connections between clubs.
/// </summary>
export type ConnectionStrength = 'weak' | 'moderate' | 'strong' | 'very_strong';

/// <summary>
/// Connection entity representing relationships between football clubs.
/// </summary>
export interface Connection extends BaseEntity {
  sourceClubId: number;
  targetClubId: number;
  type: ConnectionType;
  strength: ConnectionStrength;
  description?: string;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
  weight: number; // Numeric weight for graph algorithms (0-100)
}

/// <summary>
/// DTO for displaying connection information with related club data.
/// </summary>
export interface ConnectionDto {
  id: number;
  sourceClub: {
    id: number;
    name: string;
    city: string;
    league: string;
  };
  targetClub: {
    id: number;
    name: string;
    city: string;
    league: string;
  };
  type: ConnectionType;
  strength: ConnectionStrength;
  description?: string;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  weight: number;
  duration?: number; // Computed: days between start and end date
  displayLabel: string; // Computed: formatted label for display
  createdAt: Date;
  updatedAt: Date;
}

/// <summary>
/// DTO for creating a new connection.
/// </summary>
export interface CreateConnectionDto {
  sourceClubId: number;
  targetClubId: number;
  type: ConnectionType;
  strength: ConnectionStrength;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
  weight?: number; // Default calculated based on type and strength
}

/// <summary>
/// DTO for updating an existing connection.
/// </summary>
export interface UpdateConnectionDto {
  type?: ConnectionType;
  strength?: ConnectionStrength;
  description?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
  weight?: number;
}

/// <summary>
/// Connection search criteria for filtering connections.
/// </summary>
export interface ConnectionSearchCriteria {
  clubId?: number; // Find connections involving this club
  sourceClubId?: number;
  targetClubId?: number;
  type?: ConnectionType;
  strength?: ConnectionStrength;
  isActive?: boolean;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  weightMin?: number;
  weightMax?: number;
  hasDescription?: boolean;
  league?: string; // Find connections involving clubs from this league
  city?: string; // Find connections involving clubs from this city
}

/// <summary>
/// Connection validation result.
/// </summary>
export interface ConnectionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/// <summary>
/// Connection statistics and aggregated data.
/// </summary>
export interface ConnectionStatistics {
  totalConnections: number;
  activeConnections: number;
  connectionsByType: Record<ConnectionType, number>;
  connectionsByStrength: Record<ConnectionStrength, number>;
  averageWeight: number;
  mostConnectedClubs: Array<{
    clubId: number;
    clubName: string;
    connectionCount: number;
  }>;
  connectionsByLeague: Record<string, number>;
  temporaryConnections: number; // Connections with end dates
  permanentConnections: number; // Connections without end dates
}

/// <summary>
/// Graph edge data for visualization.
/// </summary>
export interface GraphEdge {
  id: string;
  source: number; // Club ID
  target: number; // Club ID
  type: ConnectionType;
  strength: ConnectionStrength;
  weight: number;
  label?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrow?: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/// <summary>
/// Connection type configuration for UI and validation.
/// </summary>
export interface ConnectionTypeConfig {
  type: ConnectionType;
  label: string;
  description: string;
  color: string;
  icon: string;
  defaultStrength: ConnectionStrength;
  allowsBidirectional: boolean;
  requiresEndDate: boolean;
  weightRange: {
    min: number;
    max: number;
    default: number;
  };
}

/// <summary>
/// Bulk connection operation request.
/// </summary>
export interface BulkConnectionRequest {
  connections: CreateConnectionDto[];
  validateOnly?: boolean; // Only validate without creating
  allowDuplicates?: boolean;
  skipInvalid?: boolean; // Skip invalid connections instead of failing
}

/// <summary>
/// Bulk connection operation response.
/// </summary>
export interface BulkConnectionResponse {
  success: boolean;
  created: number;
  skipped: number;
  errors: Array<{
    index: number;
    connection: CreateConnectionDto;
    error: string;
  }>;
  warnings: string[];
  validationResults?: ConnectionValidation[];
}
