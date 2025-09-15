import { ConnectionStrength, ConnectionType, LeagueType } from './enums';
import { Point2D } from './entities';

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
  readonly errors?: Record<string, string[]>;
  readonly timestamp: string;
  readonly correlationId?: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly totalItems: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Club DTO for API responses
 */
export interface ClubDto {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
  readonly league: LeagueType;
  readonly country: string;
  readonly city: string;
  readonly region?: string;
  readonly logoPath?: string;
  readonly position?: Point2D;
  readonly founded?: number;
  readonly stadium?: string;
  readonly website?: string;
  readonly colors?: string;
  readonly description?: string;
  readonly nickname?: string;
  readonly motto?: string;
  readonly isActive: boolean;
  readonly isVerified: boolean;
  readonly isFeatured: boolean;
  readonly connectionsCount?: number;
}

/**
 * Create club DTO for API requests
 */
export interface CreateClubDto {
  readonly name: string;
  readonly shortName: string;
  readonly league: LeagueType;
  readonly country: string;
  readonly city: string;
  readonly region?: string;
  readonly position?: Point2D;
  readonly founded?: number;
  readonly stadium?: string;
  readonly website?: string;
  readonly colors?: string;
  readonly description?: string;
  readonly nickname?: string;
  readonly motto?: string;
  readonly isActive?: boolean;
  readonly isVerified?: boolean;
  readonly isFeatured?: boolean;
}

/**
 * Update club DTO for API requests
 */
export interface UpdateClubDto extends Partial<CreateClubDto> {
  readonly id: number;
}

/**
 * Connection DTO for API responses
 */
export interface ConnectionDto {
  readonly id: number;
  readonly fromClubId: number;
  readonly toClubId: number;
  readonly fromClub?: ClubDto;
  readonly toClub?: ClubDto;
  readonly connectionType: ConnectionType;
  readonly strength: ConnectionStrength;
  readonly title: string;
  readonly description?: string;
  readonly historicalContext?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly isActive: boolean;
  readonly isVerified: boolean;
  readonly reliabilityScore: number;
  readonly evidenceUrls?: string[];
}

/**
 * Create connection DTO for API requests
 */
export interface CreateConnectionDto {
  readonly fromClubId: number;
  readonly toClubId: number;
  readonly connectionType: ConnectionType;
  readonly strength: ConnectionStrength;
  readonly title: string;
  readonly description?: string;
  readonly historicalContext?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly isActive?: boolean;
  readonly isVerified?: boolean;
  readonly evidenceUrls?: string[];
}

/**
 * Update connection DTO for API requests
 */
export interface UpdateConnectionDto extends Partial<CreateConnectionDto> {
  readonly id: number;
}

/**
 * Graph node DTO for visualization
 */
export interface GraphNodeDto {
  readonly id: string;
  readonly label: string;
  readonly data: ClubDto;
  readonly position?: Point2D;
  readonly classes?: string[];
}

/**
 * Graph edge DTO for visualization
 */
export interface GraphEdgeDto {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly data: ConnectionDto;
  readonly classes?: string[];
}

/**
 * Graph data DTO for visualization
 */
export interface GraphDataDto {
  readonly nodes: GraphNodeDto[];
  readonly edges: GraphEdgeDto[];
  readonly lastUpdated: string;
  readonly totalNodes: number;
  readonly totalEdges: number;
}

/**
 * Dashboard statistics DTO
 */
export interface DashboardStatsDto {
  readonly totalClubs: number;
  readonly totalConnections: number;
  readonly totalActiveClubs: number;
  readonly totalActiveConnections: number;
  readonly clubsByLeague: Record<LeagueType, number>;
  readonly connectionsByType: Record<ConnectionType, number>;
  readonly recentActivity: ActivityLogDto[];
  readonly lastUpdated: string;
}

/**
 * Activity log DTO
 */
export interface ActivityLogDto {
  readonly id: number;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: number;
  readonly entityName: string;
  readonly userId?: number;
  readonly username?: string;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Authentication request DTO
 */
export interface AuthRequestDto {
  readonly username: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

/**
 * Authentication response DTO
 */
export interface AuthResponseDto {
  readonly token: string;
  readonly refreshToken?: string;
  readonly expiresAt: string;
  readonly user: UserDto;
}

/**
 * User DTO
 */
export interface UserDto {
  readonly id: number;
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isActive: boolean;
  readonly lastLoginAt?: string;
}

/**
 * File upload response DTO
 */
export interface FileUploadResponseDto {
  readonly id: number;
  readonly filename: string;
  readonly originalFilename: string;
  readonly path: string;
  readonly url: string;
  readonly mimeType: string;
  readonly size: number;
}
