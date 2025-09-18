import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap, delay } from 'rxjs/operators';
import { 
  Club, 
  ClubListItem, 
  CreateClubDto, 
  UpdateClubDto, 
  ClubListParams, 
  PaginatedClubResponse,
  BulkClubOperation,
  ClubSearchSuggestion,
  ClubActivity,
  ClubStatistics,
  LogoUploadResponse,
  ClubExportOptions,
  ApiResponse,
  ClubImportResult,
  LeagueType,
  ClubStatus
} from '../models/club.models';
import { environment } from '../../../../../../environments/environment';

/// <summary>
/// Service for managing club data and operations.
/// Provides CRUD operations, search, filtering, and bulk operations for clubs.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private readonly apiUrl = `${environment.apiUrl}/api`;
  private readonly adminApiUrl = `${environment.apiUrl}/api/admin`;

  // Reactive state
  private readonly _clubs = signal<ClubListItem[]>([]);
  private readonly _selectedClub = signal<Club | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Cache for frequently accessed data
  private readonly clubsCache = new Map<string, Club>();
  private readonly searchCache = new Map<string, ClubSearchSuggestion[]>();

  // Public readonly signals
  public readonly clubs = this._clubs.asReadonly();
  public readonly selectedClub = this._selectedClub.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  // Computed properties
  public readonly activeClubs = computed(() => 
    this._clubs().filter(club => club.status === ClubStatus.Active)
  );
  public readonly featuredClubs = computed(() => 
    this._clubs().filter(club => club.isFeatured)
  );
  public readonly verifiedClubs = computed(() => 
    this._clubs().filter(club => club.isVerified)
  );

  constructor(private readonly http: HttpClient) {}

  /// <summary>
  /// Gets paginated list of clubs with filtering and sorting
  /// </summary>
  /// <param name="params">Query parameters for filtering and pagination</param>
  /// <returns>Observable of paginated club response</returns>
  getClubs(params: ClubListParams): Observable<PaginatedClubResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('pageSize', params.pageSize.toString());

    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.league?.length) {
      params.league.forEach(league => {
        httpParams = httpParams.append('league', league);
      });
    }
    if (params.status?.length) {
      params.status.forEach(status => {
        httpParams = httpParams.append('status', status);
      });
    }
    if (params.city?.length) {
      params.city.forEach(city => {
        httpParams = httpParams.append('city', city);
      });
    }
    if (params.country?.length) {
      params.country.forEach(country => {
        httpParams = httpParams.append('country', country);
      });
    }
    if (params.isVerified !== undefined) {
      httpParams = httpParams.set('isVerified', params.isVerified.toString());
    }
    if (params.isFeatured !== undefined) {
      httpParams = httpParams.set('isFeatured', params.isFeatured.toString());
    }

    return this.http.get<ApiResponse<PaginatedClubResponse>>(`${this.adminApiUrl}/clubs`, { params: httpParams })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this._clubs.set(response.data.items);
            this._isLoading.set(false);
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to load clubs');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Failed to load clubs');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Gets a single club by ID
  /// </summary>
  /// <param name="id">Club ID</param>
  /// <returns>Observable of club details</returns>
  getClubById(id: string): Observable<Club> {
    // Check cache first
    if (this.clubsCache.has(id)) {
      return of(this.clubsCache.get(id)!);
    }

    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ApiResponse<Club>>(`${this.adminApiUrl}/clubs/${id}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.clubsCache.set(id, response.data);
            this._selectedClub.set(response.data);
            this._isLoading.set(false);
            return response.data;
          } else {
            throw new Error(response.message || 'Club not found');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Failed to load club');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Creates a new club
  /// </summary>
  /// <param name="clubData">Club creation data</param>
  /// <returns>Observable of created club</returns>
  createClub(clubData: CreateClubDto): Observable<Club> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<Club>>(`${this.adminApiUrl}/clubs`, clubData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.clubsCache.set(response.data.id, response.data);
            this._isLoading.set(false);
            this.invalidateClubsList();
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to create club');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Failed to create club');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Updates an existing club
  /// </summary>
  /// <param name="clubData">Club update data</param>
  /// <returns>Observable of updated club</returns>
  updateClub(clubData: UpdateClubDto): Observable<Club> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<ApiResponse<Club>>(`${this.adminApiUrl}/clubs/${clubData.id}`, clubData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.clubsCache.set(response.data.id, response.data);
            this._selectedClub.set(response.data);
            this._isLoading.set(false);
            this.invalidateClubsList();
            return response.data;
          } else {
            throw new Error(response.message || 'Failed to update club');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Failed to update club');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Deletes a club
  /// </summary>
  /// <param name="id">Club ID to delete</param>
  /// <returns>Observable of success result</returns>
  deleteClub(id: string): Observable<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<ApiResponse<boolean>>(`${this.adminApiUrl}/clubs/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            this.clubsCache.delete(id);
            this._isLoading.set(false);
            this.invalidateClubsList();
            return true;
          } else {
            throw new Error(response.message || 'Failed to delete club');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Failed to delete club');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Performs bulk operations on multiple clubs
  /// </summary>
  /// <param name="operation">Bulk operation to perform</param>
  /// <returns>Observable of operation result</returns>
  bulkOperation(operation: BulkClubOperation): Observable<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<ApiResponse<boolean>>(`${this.adminApiUrl}/clubs/bulk`, operation)
      .pipe(
        map(response => {
          if (response.success) {
            this._isLoading.set(false);
            this.invalidateClubsList();
            // Clear cache for affected clubs
            operation.clubIds.forEach(id => this.clubsCache.delete(id));
            return true;
          } else {
            throw new Error(response.message || 'Bulk operation failed');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Bulk operation failed');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Searches clubs with autocomplete suggestions
  /// </summary>
  /// <param name="query">Search query</param>
  /// <returns>Observable of club suggestions</returns>
  searchClubs(query: string): Observable<ClubSearchSuggestion[]> {
    if (!query || query.length < 2) {
      return of([]);
    }

    // Check cache first
    if (this.searchCache.has(query)) {
      return of(this.searchCache.get(query)!);
    }

    const params = new HttpParams().set('q', query).set('limit', '10');

    return this.http.get<ApiResponse<ClubSearchSuggestion[]>>(`${this.apiUrl}/clubs/search`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.searchCache.set(query, response.data);
            return response.data;
          }
          return [];
        }),
        catchError(() => of([])),
        delay(300) // Debounce for better UX
      );
  }

  /// <summary>
  /// Gets activity history for a club
  /// </summary>
  /// <param name="clubId">Club ID</param>
  /// <returns>Observable of activity entries</returns>
  getClubActivity(clubId: string): Observable<ClubActivity[]> {
    return this.http.get<ApiResponse<ClubActivity[]>>(`${this.adminApiUrl}/clubs/${clubId}/activity`)
      .pipe(
        map(response => response.success && response.data ? response.data : []),
        catchError(() => of([]))
      );
  }

  /// <summary>
  /// Gets statistics for a club
  /// </summary>
  /// <param name="clubId">Club ID</param>
  /// <returns>Observable of club statistics</returns>
  getClubStatistics(clubId: string): Observable<ClubStatistics> {
    return this.http.get<ApiResponse<ClubStatistics>>(`${this.adminApiUrl}/clubs/${clubId}/statistics`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Failed to load statistics');
        }),
        catchError(error => throwError(() => error))
      );
  }

  /// <summary>
  /// Uploads a logo for a club
  /// </summary>
  /// <param name="clubId">Club ID</param>
  /// <param name="file">Logo file</param>
  /// <returns>Observable of upload response</returns>
  uploadLogo(clubId: string, file: File): Observable<LogoUploadResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('logo', file);

    return this.http.post<ApiResponse<LogoUploadResponse>>(`${this.adminApiUrl}/clubs/${clubId}/upload-logo`, formData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this._isLoading.set(false);
            // Update cache if club is loaded
            if (this.clubsCache.has(clubId)) {
              const club = this.clubsCache.get(clubId)!;
              club.logoPath = response.data.logoPath;
              this.clubsCache.set(clubId, club);
            }
            return response.data;
          } else {
            throw new Error(response.message || 'Logo upload failed');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Logo upload failed');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Exports club data
  /// </summary>
  /// <param name="options">Export options</param>
  /// <returns>Observable of blob for download</returns>
  exportClubs(options: ClubExportOptions): Observable<Blob> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post(`${this.adminApiUrl}/clubs/export`, options, { 
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        this._isLoading.set(false);
        return response.body!;
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set('Export failed');
        return throwError(() => error);
      })
    );
  }

  /// <summary>
  /// Imports clubs from file
  /// </summary>
  /// <param name="file">File to import</param>
  /// <returns>Observable of import result</returns>
  importClubs(file: File): Observable<ClubImportResult> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<ClubImportResult>>(`${this.adminApiUrl}/clubs/import`, formData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this._isLoading.set(false);
            this.invalidateClubsList();
            return response.data;
          } else {
            throw new Error(response.message || 'Import failed');
          }
        }),
        catchError(error => {
          this._isLoading.set(false);
          this._error.set(error.message || 'Import failed');
          return throwError(() => error);
        })
      );
  }

  /// <summary>
  /// Gets available leagues for dropdown
  /// </summary>
  /// <returns>Array of league options</returns>
  getLeagueOptions(): Array<{ value: LeagueType; label: string }> {
    return [
      { value: LeagueType.Ekstraklasa, label: 'Ekstraklasa' },
      { value: LeagueType.Fortuna1Liga, label: 'Fortuna 1 Liga' },
      { value: LeagueType.EuropeanClub, label: 'European Club' },
      { value: LeagueType.Regional, label: 'Regional League' },
      { value: LeagueType.International, label: 'International' }
    ];
  }

  /// <summary>
  /// Gets available status options for filtering
  /// </summary>
  /// <returns>Array of status options</returns>
  getStatusOptions(): Array<{ value: ClubStatus; label: string }> {
    return [
      { value: ClubStatus.Active, label: 'Active' },
      { value: ClubStatus.Inactive, label: 'Inactive' },
      { value: ClubStatus.Pending, label: 'Pending' },
      { value: ClubStatus.Suspended, label: 'Suspended' },
      { value: ClubStatus.Archived, label: 'Archived' }
    ];
  }

  /// <summary>
  /// Clears error state
  /// </summary>
  clearError(): void {
    this._error.set(null);
  }

  /// <summary>
  /// Clears selected club
  /// </summary>
  clearSelection(): void {
    this._selectedClub.set(null);
  }

  /// <summary>
  /// Invalidates clubs list cache
  /// </summary>
  private invalidateClubsList(): void {
    // This would trigger a refresh of the clubs list
    // Implementation depends on how the component is structured
  }

  /// <summary>
  /// Mock data generation for development
  /// </summary>
  getMockClubs(): ClubListItem[] {
    return [
      {
        id: '1',
        name: 'Legia Warszawa',
        shortName: 'Legia',
        league: LeagueType.Ekstraklasa,
        city: 'Warszawa',
        logoPath: '/assets/logos/legia.svg',
        status: ClubStatus.Active,
        isVerified: true,
        isFeatured: true,
        connectionCount: 15,
        lastUpdated: new Date()
      },
      {
        id: '2',
        name: 'Wisła Kraków',
        shortName: 'Wisła',
        league: LeagueType.Ekstraklasa,
        city: 'Kraków',
        logoPath: '/assets/logos/wisla.svg',
        status: ClubStatus.Active,
        isVerified: true,
        isFeatured: true,
        connectionCount: 12,
        lastUpdated: new Date()
      },
      {
        id: '3',
        name: 'Lech Poznań',
        shortName: 'Lech',
        league: LeagueType.Ekstraklasa,
        city: 'Poznań',
        logoPath: '/assets/logos/lech.svg',
        status: ClubStatus.Active,
        isVerified: true,
        isFeatured: false,
        connectionCount: 8,
        lastUpdated: new Date()
      }
    ];
  }
}