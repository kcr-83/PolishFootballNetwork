import { ConnectionStrength, ConnectionType, LeagueType } from './enums';

/**
 * Point2D value object interface matching backend Point2D
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/**
 * Base entity interface with common audit fields
 */
export interface BaseEntity {
  readonly id: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Club entity interface matching backend Club
 */
export interface Club extends BaseEntity {
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
  readonly metadata?: Record<string, unknown>;
}

/**
 * Connection entity interface matching backend Connection
 */
export interface Connection extends BaseEntity {
  readonly fromClubId: number;
  readonly toClubId: number;
  readonly fromClub?: Club;
  readonly toClub?: Club;
  readonly connectionType: ConnectionType;
  readonly strength: ConnectionStrength;
  readonly title: string;
  readonly description?: string;
  readonly historicalContext?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly isActive: boolean;
  readonly isVerified: boolean;
  readonly reliabilityScore: number;
  readonly evidenceUrls?: string[];
}

/**
 * User entity interface matching backend User
 */
export interface User extends BaseEntity {
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isActive: boolean;
  readonly lastLoginAt?: Date;
}

/**
 * File entity interface matching backend File
 */
export interface FileEntity extends BaseEntity {
  readonly filename: string;
  readonly originalFilename: string;
  readonly path: string;
  readonly mimeType: string;
  readonly size: number;
  readonly entityType?: string;
  readonly entityId?: number;
  readonly metadata?: Record<string, unknown>;
}
