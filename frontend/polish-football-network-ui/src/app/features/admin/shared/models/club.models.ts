/// <summary>
/// Club entity model representing a football club in the system
/// </summary>
export interface Club {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  league: LeagueType;
  country: string;
  city: string;
  region?: string;
  logoPath?: string;
  position: Point2D;
  founded?: number;
  stadium?: string;
  website?: string;
  colors: ClubColors;
  description?: string;
  nickname?: string;
  motto?: string;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ClubMetadata;
}

/// <summary>
/// DTO for creating a new club
/// </summary>
export interface CreateClubDto {
  name: string;
  shortName: string;
  league: LeagueType;
  country: string;
  city: string;
  region?: string;
  position: Point2D;
  founded?: number;
  stadium?: string;
  website?: string;
  colors: ClubColors;
  description?: string;
  nickname?: string;
  motto?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isFeatured?: boolean;
}

/// <summary>
/// DTO for updating a club
/// </summary>
export interface UpdateClubDto extends Partial<CreateClubDto> {
  id: string;
}

/// <summary>
/// Club colors configuration
/// </summary>
export interface ClubColors {
  primary: string;
  secondary?: string;
  accent?: string;
  kit?: {
    home: string[];
    away: string[];
    third?: string[];
  };
}

/// <summary>
/// Additional club metadata
/// </summary>
export interface ClubMetadata {
  capacity?: number;
  founded?: number;
  rivalries?: string[];
  achievements?: Achievement[];
  socialMedia?: SocialMediaLinks;
  financialInfo?: FinancialInfo;
}

/// <summary>
/// Club achievement record
/// </summary>
export interface Achievement {
  type: AchievementType;
  title: string;
  year: number;
  description?: string;
}

/// <summary>
/// Social media links
/// </summary>
export interface SocialMediaLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

/// <summary>
/// Financial information
/// </summary>
export interface FinancialInfo {
  marketValue?: number;
  revenue?: number;
  currency: string;
}

/// <summary>
/// 2D coordinate point
/// </summary>
export interface Point2D {
  x: number;
  y: number;
}

/// <summary>
/// League classification
/// </summary>
export enum LeagueType {
  Ekstraklasa = 'Ekstraklasa',
  Fortuna1Liga = 'Fortuna1Liga', 
  EuropeanClub = 'EuropeanClub',
  Regional = 'Regional',
  International = 'International'
}

/// <summary>
/// Achievement types
/// </summary>
export enum AchievementType {
  Championship = 'Championship',
  Cup = 'Cup',
  European = 'European',
  International = 'International',
  Promotion = 'Promotion',
  Other = 'Other'
}

/// <summary>
/// Club status for filtering and display
/// </summary>
export enum ClubStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Pending = 'Pending',
  Suspended = 'Suspended',
  Archived = 'Archived'
}

/// <summary>
/// Club list item for table display
/// </summary>
export interface ClubListItem {
  id: string;
  name: string;
  shortName: string;
  league: LeagueType;
  city: string;
  logoPath?: string;
  status: ClubStatus;
  isVerified: boolean;
  isFeatured: boolean;
  connectionCount: number;
  lastUpdated: Date;
}

/// <summary>
/// Pagination parameters for club listing
/// </summary>
export interface ClubListParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  league?: LeagueType[];
  status?: ClubStatus[];
  city?: string[];
  country?: string[];
  isVerified?: boolean;
  isFeatured?: boolean;
}

/// <summary>
/// Paginated response for club listing
/// </summary>
export interface PaginatedClubResponse {
  items: ClubListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/// <summary>
/// Club form validation errors
/// </summary>
export interface ClubValidationErrors {
  name?: string[];
  shortName?: string[];
  league?: string[];
  country?: string[];
  city?: string[];
  position?: string[];
  website?: string[];
  colors?: string[];
  founded?: string[];
}

/// <summary>
/// Bulk operation request
/// </summary>
export interface BulkClubOperation {
  operation: BulkOperationType;
  clubIds: string[];
  data?: any;
}

/// <summary>
/// Bulk operation types
/// </summary>
export enum BulkOperationType {
  Activate = 'Activate',
  Deactivate = 'Deactivate',
  Verify = 'Verify',
  Unverify = 'Unverify',
  Feature = 'Feature',
  Unfeature = 'Unfeature',
  Delete = 'Delete',
  Export = 'Export',
  UpdateLeague = 'UpdateLeague'
}

/// <summary>
/// Club search suggestion
/// </summary>
export interface ClubSearchSuggestion {
  id: string;
  name: string;
  shortName: string;
  league: LeagueType;
  city: string;
  logoPath?: string;
}

/// <summary>
/// Club activity log entry
/// </summary>
export interface ClubActivity {
  id: string;
  clubId: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/// <summary>
/// Club statistics
/// </summary>
export interface ClubStatistics {
  totalConnections: number;
  incomingConnections: number;
  outgoingConnections: number;
  strongConnections: number;
  mediumConnections: number;
  weakConnections: number;
  rivalryConnections: number;
  friendshipConnections: number;
  allianceConnections: number;
}

/// <summary>
/// Logo upload response
/// </summary>
export interface LogoUploadResponse {
  success: boolean;
  logoPath?: string;
  originalFileName: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  errors?: string[];
}

/// <summary>
/// Export options for club data
/// </summary>
export interface ClubExportOptions {
  format: ExportFormat;
  includeFields: string[];
  filters?: ClubListParams;
  includeLogos?: boolean;
  includeConnections?: boolean;
}

/// <summary>
/// Export formats
/// </summary>
export enum ExportFormat {
  CSV = 'CSV',
  Excel = 'Excel',
  JSON = 'JSON',
  PDF = 'PDF'
}

/// <summary>
/// Club form field configuration
/// </summary>
export interface ClubFormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  validation?: ValidationRule[];
  options?: SelectOption[];
  placeholder?: string;
  helpText?: string;
}

/// <summary>
/// Form field types
/// </summary>
export enum FormFieldType {
  Text = 'Text',
  Number = 'Number',
  Email = 'Email',
  Url = 'Url',
  Select = 'Select',
  MultiSelect = 'MultiSelect',
  Textarea = 'Textarea',
  RichText = 'RichText',
  Date = 'Date',
  Year = 'Year',
  Color = 'Color',
  File = 'File',
  Position = 'Position',
  Boolean = 'Boolean'
}

/// <summary>
/// Validation rule
/// </summary>
export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

/// <summary>
/// Validation types
/// </summary>
export enum ValidationType {
  Required = 'Required',
  MinLength = 'MinLength',
  MaxLength = 'MaxLength',
  Pattern = 'Pattern',
  Email = 'Email',
  Url = 'Url',
  Min = 'Min',
  Max = 'Max',
  Custom = 'Custom'
}

/// <summary>
/// Select option for dropdowns
/// </summary>
export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
  group?: string;
}

/// <summary>
/// API response wrapper
/// </summary>
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: Date;
}

/// <summary>
/// Club import result
/// </summary>
export interface ClubImportResult {
  successful: number;
  failed: number;
  errors: ClubImportError[];
  clubs: Club[];
}

/// <summary>
/// Club import error
/// </summary>
export interface ClubImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}