import { BaseEntity } from './common.model';

/// <summary>
/// Football club entity representing a team in the Polish football network.
/// </summary>
export interface Club extends BaseEntity {
  name: string;
  city: string;
  league: string;
  foundedYear: number;
  stadium?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  contactEmail?: string;
  contactPhone?: string;
}

/// <summary>
/// DTO for displaying club information with computed properties.
/// </summary>
export interface ClubDto {
  id: number;
  name: string;
  city: string;
  league: string;
  foundedYear: number;
  stadium?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  contactEmail?: string;
  contactPhone?: string;
  age: number; // Computed: current year - founded year
  displayName: string; // Computed: name with city
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    email: string;
    phone: string;
  };
}

/// <summary>
/// DTO for creating a new club.
/// </summary>
export interface CreateClubDto {
  name: string;
  city: string;
  league: string;
  foundedYear?: number;
  stadium?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  contactEmail?: string;
  contactPhone?: string;
}

/// <summary>
/// DTO for updating an existing club.
/// </summary>
export interface UpdateClubDto {
  name?: string;
  city?: string;
  league?: string;
  foundedYear?: number;
  stadium?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
  contactEmail?: string;
  contactPhone?: string;
}

/// <summary>
/// Club search criteria for filtering clubs.
/// </summary>
export interface ClubSearchCriteria {
  name?: string;
  city?: string;
  league?: string;
  foundedYearFrom?: number;
  foundedYearTo?: number;
  isActive?: boolean;
  hasCoordinates?: boolean;
  searchRadius?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}

/// <summary>
/// Club statistics and aggregated data.
/// </summary>
export interface ClubStatistics {
  totalClubs: number;
  totalLeagues: number;
  totalCities: number;
  clubsByLeague: Record<string, number>;
  clubsByCity: Record<string, number>;
  averageFoundedYear: number;
  oldestClub?: ClubDto;
  newestClub?: ClubDto;
  clubsWithStadiums: number;
  clubsWithWebsites: number;
  clubsWithCoordinates: number;
}

/// <summary>
/// League information derived from club data.
/// </summary>
export interface League {
  name: string;
  clubCount: number;
  cities: string[];
  averageFoundedYear: number;
  clubs: ClubDto[];
}

/// <summary>
/// City information derived from club data.
/// </summary>
export interface City {
  name: string;
  clubCount: number;
  leagues: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  clubs: ClubDto[];
}
