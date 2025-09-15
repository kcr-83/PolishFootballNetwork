import { FormControl, FormGroup } from '@angular/forms';
import { ConnectionStrength, ConnectionType, LeagueType } from './enums';
import { Point2D } from './entities';

/**
 * Club form model interface
 */
export interface ClubFormModel {
  name: FormControl<string>;
  shortName: FormControl<string>;
  league: FormControl<LeagueType>;
  country: FormControl<string>;
  city: FormControl<string>;
  region: FormControl<string | null>;
  position: FormControl<Point2D | null>;
  founded: FormControl<number | null>;
  stadium: FormControl<string | null>;
  website: FormControl<string | null>;
  colors: FormControl<string | null>;
  description: FormControl<string | null>;
  nickname: FormControl<string | null>;
  motto: FormControl<string | null>;
  isActive: FormControl<boolean>;
  isVerified: FormControl<boolean>;
  isFeatured: FormControl<boolean>;
}

/**
 * Club form group type
 */
export type ClubFormGroup = FormGroup<ClubFormModel>;

/**
 * Connection form model interface
 */
export interface ConnectionFormModel {
  fromClubId: FormControl<number>;
  toClubId: FormControl<number>;
  connectionType: FormControl<ConnectionType>;
  strength: FormControl<ConnectionStrength>;
  title: FormControl<string>;
  description: FormControl<string | null>;
  historicalContext: FormControl<string | null>;
  startDate: FormControl<string | null>;
  endDate: FormControl<string | null>;
  isActive: FormControl<boolean>;
  isVerified: FormControl<boolean>;
  evidenceUrls: FormControl<string[]>;
}

/**
 * Connection form group type
 */
export type ConnectionFormGroup = FormGroup<ConnectionFormModel>;

/**
 * Authentication form model interface
 */
export interface AuthFormModel {
  username: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

/**
 * Authentication form group type
 */
export type AuthFormGroup = FormGroup<AuthFormModel>;

/**
 * Search form model interface
 */
export interface SearchFormModel {
  query: FormControl<string>;
  leagues: FormControl<LeagueType[]>;
  countries: FormControl<string[]>;
  connectionTypes: FormControl<ConnectionType[]>;
  showInactive: FormControl<boolean>;
}

/**
 * Search form group type
 */
export type SearchFormGroup = FormGroup<SearchFormModel>;

/**
 * Filter form model interface for admin lists
 */
export interface FilterFormModel {
  search: FormControl<string>;
  league: FormControl<LeagueType | null>;
  country: FormControl<string | null>;
  isActive: FormControl<boolean | null>;
  isVerified: FormControl<boolean | null>;
  sortBy: FormControl<string>;
  sortDirection: FormControl<'asc' | 'desc'>;
}

/**
 * Filter form group type
 */
export type FilterFormGroup = FormGroup<FilterFormModel>;

/**
 * Position picker form model interface
 */
export interface PositionPickerFormModel {
  x: FormControl<number>;
  y: FormControl<number>;
}

/**
 * Position picker form group type
 */
export type PositionPickerFormGroup = FormGroup<PositionPickerFormModel>;
