import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, catchError, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { Club, ClubDto, CreateClubDto, UpdateClubDto } from '../../shared/models/club.model';
import { PaginatedResponse, ApiResponse } from '../../shared/models/api.model';
import { LoadingState } from '../../shared/models/common.model';

/// <summary>
/// Service for managing club-related operations with reactive state management using Angular signals.
/// Provides CRUD operations, search functionality, and optimistic updates with local caching.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class ClubService {
  // State signals
  private readonly _clubs = signal<Club[]>([]);
  private readonly _selectedClub = signal<Club | null>(null);
  private readonly _loadingState = signal<LoadingState>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _searchQuery = signal<string>('');
  private readonly _totalCount = signal<number>(0);

  // Public computed signals
  public readonly clubs = computed(() => this._clubs());
  public readonly selectedClub = computed(() => this._selectedClub());
  public readonly loadingState = computed(() => this._loadingState());
  public readonly error = computed(() => this._error());
  public readonly searchQuery = computed(() => this._searchQuery());
  public readonly totalCount = computed(() => this._totalCount());
  public readonly isLoading = computed(() => this._loadingState() === 'loading');
  public readonly hasError = computed(() => this._error() !== null);
  public readonly hasClubs = computed(() => this._clubs().length > 0);

  // Filtered clubs based on search query
  public readonly filteredClubs = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    if (!query) {
      return this._clubs();
    }
    return this._clubs().filter(club =>
      club.name.toLowerCase().includes(query) ||
      club.city.toLowerCase().includes(query) ||
      club.league.toLowerCase().includes(query)
    );
  });

  // Club statistics
  public readonly clubStats = computed(() => {
    const clubs = this._clubs();
    const leagues = new Set(clubs.map(club => club.league));
    const cities = new Set(clubs.map(club => club.city));

    return {
      totalClubs: clubs.length,
      totalLeagues: leagues.size,
      totalCities: cities.size,
      clubsByLeague: this.groupClubsByLeague(clubs)
    };
  });

  constructor(private apiService: ApiService) {}

  /// <summary>
  /// Loads all clubs with optional pagination and caching support.
  /// Updates the local state with the fetched clubs.
  /// </summary>
  /// <param name="page">Page number for pagination (optional)</param>
  /// <param name="pageSize">Number of items per page (optional)</param>
  /// <param name="forceRefresh">Force refresh bypassing cache (optional)</param>
  /// <returns>Observable of paginated club response</returns>
  public getAllClubs(page?: number, pageSize?: number, forceRefresh = false): Observable<PaginatedResponse<Club>> {
    this._loadingState.set('loading');
    this._error.set(null);

    const params: Record<string, any> = {};
    if (page !== undefined) params['page'] = page;
    if (pageSize !== undefined) params['pageSize'] = pageSize;

    const cacheConfig = forceRefresh ? { enabled: false } : { enabled: true, ttl: 300000 }; // 5 minutes cache

    return this.apiService.get<PaginatedResponse<Club>>('/clubs', params, cacheConfig).pipe(
      tap(response => {
        this._clubs.set(response.data);
        this._totalCount.set(response.totalCount);
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load clubs');
        this._loadingState.set('error');
        return of({
          data: [],
          totalCount: 0,
          page: page || 1,
          pageSize: pageSize || 10,
          totalPages: 0
        } as PaginatedResponse<Club>);
      })
    );
  }

  /// <summary>
  /// Retrieves a specific club by its ID with caching support.
  /// Updates the selected club state.
  /// </summary>
  /// <param name="id">The club ID to retrieve</param>
  /// <param name="forceRefresh">Force refresh bypassing cache (optional)</param>
  /// <returns>Observable of the club or null if not found</returns>
  public getClubById(id: number, forceRefresh = false): Observable<Club | null> {
    this._loadingState.set('loading');
    this._error.set(null);

    const cacheConfig = forceRefresh ? { enabled: false } : { enabled: true, ttl: 300000 }; // 5 minutes cache

    return this.apiService.get<ApiResponse<Club>>(`/clubs/${id}`, {}, cacheConfig).pipe(
      map(response => response.data),
      tap(club => {
        this._selectedClub.set(club);
        this._loadingState.set('success');

        // Update club in local array if it exists
        if (club) {
          this.updateClubInArray(club);
        }
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load club');
        this._loadingState.set('error');
        this._selectedClub.set(null);
        return of(null);
      })
    );
  }

  /// <summary>
  /// Searches clubs based on various criteria with local filtering and server-side search.
  /// Updates the search query state and triggers filtering.
  /// </summary>
  /// <param name="query">Search query string</param>
  /// <param name="searchServer">Whether to search on server side (optional)</param>
  /// <returns>Observable of search results</returns>
  public searchClubs(query: string, searchServer = false): Observable<Club[]> {
    this._searchQuery.set(query);

    if (!searchServer) {
      // Use local filtering through computed signal
      return of(this.filteredClubs());
    }

    // Server-side search
    this._loadingState.set('loading');
    this._error.set(null);

    const params = { search: query };

    return this.apiService.get<PaginatedResponse<Club>>('/clubs/search', params).pipe(
      map(response => response.data),
      tap(clubs => {
        this._clubs.set(clubs);
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to search clubs');
        this._loadingState.set('error');
        return of([]);
      })
    );
  }

  /// <summary>
  /// Creates a new club with optimistic updates.
  /// Updates local state immediately and reverts on error.
  /// </summary>
  /// <param name="clubData">Data for creating the new club</param>
  /// <returns>Observable of the created club</returns>
  public createClub(clubData: CreateClubDto): Observable<Club | null> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Optimistic update - create temporary club
    const tempClub: Club = {
      id: Date.now(), // Temporary ID
      ...clubData,
      foundedYear: clubData.foundedYear || new Date().getFullYear(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentClubs = this._clubs();
    this._clubs.set([...currentClubs, tempClub]);

    return this.apiService.post<ApiResponse<Club>>('/clubs', clubData).pipe(
      map(response => response.data),
      tap(createdClub => {
        if (createdClub) {
          // Replace temporary club with real one
          const updatedClubs = this._clubs().filter(c => c.id !== tempClub.id);
          this._clubs.set([...updatedClubs, createdClub]);
          this._totalCount.set(this._totalCount() + 1);
        }
        this._loadingState.set('success');
      }),
      catchError(error => {
        // Revert optimistic update
        const revertedClubs = this._clubs().filter(c => c.id !== tempClub.id);
        this._clubs.set(revertedClubs);
        this._error.set(error.message || 'Failed to create club');
        this._loadingState.set('error');
        return of(null);
      })
    );
  }

  /// <summary>
  /// Updates an existing club with optimistic updates.
  /// Updates local state immediately and reverts on error.
  /// </summary>
  /// <param name="id">ID of the club to update</param>
  /// <param name="clubData">Updated club data</param>
  /// <returns>Observable of the updated club</returns>
  public updateClub(id: number, clubData: UpdateClubDto): Observable<Club | null> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Store original club for potential rollback
    const originalClub = this._clubs().find(c => c.id === id);
    if (!originalClub) {
      this._error.set('Club not found');
      this._loadingState.set('error');
      return of(null);
    }

    // Optimistic update
    const updatedClub: Club = {
      ...originalClub,
      ...clubData,
      updatedAt: new Date()
    };

    this.updateClubInArray(updatedClub);

    return this.apiService.put<ApiResponse<Club>>(`/clubs/${id}`, clubData).pipe(
      map(response => response.data),
      tap(club => {
        if (club) {
          this.updateClubInArray(club);
          if (this._selectedClub()?.id === id) {
            this._selectedClub.set(club);
          }
        }
        this._loadingState.set('success');
      }),
      catchError(error => {
        // Revert optimistic update
        this.updateClubInArray(originalClub);
        this._error.set(error.message || 'Failed to update club');
        this._loadingState.set('error');
        return of(null);
      })
    );
  }

  /// <summary>
  /// Deletes a club with optimistic updates.
  /// Removes from local state immediately and reverts on error.
  /// </summary>
  /// <param name="id">ID of the club to delete</param>
  /// <returns>Observable indicating success</returns>
  public deleteClub(id: number): Observable<boolean> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Store original state for potential rollback
    const originalClubs = [...this._clubs()];
    const clubToDelete = originalClubs.find(c => c.id === id);

    if (!clubToDelete) {
      this._error.set('Club not found');
      this._loadingState.set('error');
      return of(false);
    }

    // Optimistic update - remove club
    const updatedClubs = originalClubs.filter(c => c.id !== id);
    this._clubs.set(updatedClubs);
    this._totalCount.set(this._totalCount() - 1);

    // Clear selected club if it's the one being deleted
    if (this._selectedClub()?.id === id) {
      this._selectedClub.set(null);
    }

    return this.apiService.delete(`/clubs/${id}`).pipe(
      map(() => true),
      tap(() => {
        this._loadingState.set('success');
      }),
      catchError(error => {
        // Revert optimistic update
        this._clubs.set(originalClubs);
        this._totalCount.set(this._totalCount() + 1);
        if (clubToDelete && this._selectedClub() === null) {
          this._selectedClub.set(clubToDelete);
        }
        this._error.set(error.message || 'Failed to delete club');
        this._loadingState.set('error');
        return of(false);
      })
    );
  }

  /// <summary>
  /// Gets clubs by league with caching support.
  /// </summary>
  /// <param name="league">League name to filter by</param>
  /// <returns>Observable of clubs in the specified league</returns>
  public getClubsByLeague(league: string): Observable<Club[]> {
    const params = { league };

    return this.apiService.get<PaginatedResponse<Club>>('/clubs', params, { enabled: true, ttl: 300000 }).pipe(
      map(response => response.data),
      catchError(error => {
        this._error.set(error.message || 'Failed to load clubs by league');
        return of([]);
      })
    );
  }

  /// <summary>
  /// Gets clubs by city with caching support.
  /// </summary>
  /// <param name="city">City name to filter by</param>
  /// <returns>Observable of clubs in the specified city</returns>
  public getClubsByCity(city: string): Observable<Club[]> {
    const params = { city };

    return this.apiService.get<PaginatedResponse<Club>>('/clubs', params, { enabled: true, ttl: 300000 }).pipe(
      map(response => response.data),
      catchError(error => {
        this._error.set(error.message || 'Failed to load clubs by city');
        return of([]);
      })
    );
  }

  /// <summary>
  /// Sets the selected club in the state.
  /// </summary>
  /// <param name="club">Club to select or null to clear selection</param>
  public setSelectedClub(club: Club | null): void {
    this._selectedClub.set(club);
  }

  /// <summary>
  /// Clears the current search query and resets filtering.
  /// </summary>
  public clearSearch(): void {
    this._searchQuery.set('');
  }

  /// <summary>
  /// Clears any error state.
  /// </summary>
  public clearError(): void {
    this._error.set(null);
  }

  /// <summary>
  /// Refreshes the club data by clearing cache and reloading.
  /// </summary>
  /// <returns>Observable of the refreshed data</returns>
  public refresh(): Observable<PaginatedResponse<Club>> {
    this.apiService.clearCache();
    return this.getAllClubs(1, 50, true);
  }

  /// <summary>
  /// Gets the total count of clubs.
  /// </summary>
  /// <returns>Total number of clubs</returns>
  public getTotalCount(): number {
    return this._totalCount();
  }

  // Private helper methods

  /// <summary>
  /// Updates a club in the local clubs array.
  /// </summary>
  /// <param name="updatedClub">The updated club object</param>
  private updateClubInArray(updatedClub: Club): void {
    const currentClubs = this._clubs();
    const index = currentClubs.findIndex(c => c.id === updatedClub.id);

    if (index !== -1) {
      const newClubs = [...currentClubs];
      newClubs[index] = updatedClub;
      this._clubs.set(newClubs);
    }
  }

  /// <summary>
  /// Groups clubs by league for statistics.
  /// </summary>
  /// <param name="clubs">Array of clubs to group</param>
  /// <returns>Object with league names as keys and club counts as values</returns>
  private groupClubsByLeague(clubs: Club[]): Record<string, number> {
    return clubs.reduce((acc, club) => {
      acc[club.league] = (acc[club.league] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
