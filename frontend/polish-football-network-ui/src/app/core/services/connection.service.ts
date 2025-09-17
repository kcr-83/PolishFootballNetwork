import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, catchError, of, forkJoin, combineLatest } from 'rxjs';
import { ApiService } from './api.service';
import {
  Connection,
  ConnectionDto,
  CreateConnectionDto,
  UpdateConnectionDto,
  ConnectionSearchCriteria,
  ConnectionValidation,
  ConnectionStatistics,
  ConnectionType,
  ConnectionStrength,
  BulkConnectionRequest,
  BulkConnectionResponse,
  GraphEdge,
  ConnectionTypeConfig
} from '../../shared/models/connection.model';
import { PaginatedResponse, ApiResponse } from '../../shared/models/api.model';
import { LoadingState } from '../../shared/models/common.model';

/// <summary>
/// Service for managing club connections with reactive state management using Angular signals.
/// Provides CRUD operations, validation, search functionality, and graph data preparation.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  // State signals
  private readonly _connections = signal<ConnectionDto[]>([]);
  private readonly _selectedConnection = signal<ConnectionDto | null>(null);
  private readonly _loadingState = signal<LoadingState>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _searchCriteria = signal<ConnectionSearchCriteria>({});
  private readonly _totalCount = signal<number>(0);
  private readonly _statistics = signal<ConnectionStatistics | null>(null);

  // Public computed signals
  public readonly connections = computed(() => this._connections());
  public readonly selectedConnection = computed(() => this._selectedConnection());
  public readonly loadingState = computed(() => this._loadingState());
  public readonly error = computed(() => this._error());
  public readonly searchCriteria = computed(() => this._searchCriteria());
  public readonly totalCount = computed(() => this._totalCount());
  public readonly statistics = computed(() => this._statistics());
  public readonly isLoading = computed(() => this._loadingState() === 'loading');
  public readonly hasError = computed(() => this._error() !== null);
  public readonly hasConnections = computed(() => this._connections().length > 0);

  // Filtered connections based on search criteria
  public readonly filteredConnections = computed(() => {
    const criteria = this._searchCriteria();
    let connections = this._connections();

    if (criteria.clubId) {
      connections = connections.filter(conn =>
        conn.sourceClub.id === criteria.clubId || conn.targetClub.id === criteria.clubId
      );
    }

    if (criteria.type) {
      connections = connections.filter(conn => conn.type === criteria.type);
    }

    if (criteria.strength) {
      connections = connections.filter(conn => conn.strength === criteria.strength);
    }

    if (criteria.isActive !== undefined) {
      connections = connections.filter(conn => conn.isActive === criteria.isActive);
    }

    if (criteria.league) {
      connections = connections.filter(conn =>
        conn.sourceClub.league === criteria.league || conn.targetClub.league === criteria.league
      );
    }

    if (criteria.city) {
      connections = connections.filter(conn =>
        conn.sourceClub.city === criteria.city || conn.targetClub.city === criteria.city
      );
    }

    return connections;
  });

  // Connection types grouped by category
  public readonly connectionsByType = computed(() => {
    const connections = this._connections();
    return connections.reduce((acc, conn) => {
      if (!acc[conn.type]) {
        acc[conn.type] = [];
      }
      acc[conn.type].push(conn);
      return acc;
    }, {} as Record<ConnectionType, ConnectionDto[]>);
  });

  // Active connections only
  public readonly activeConnections = computed(() => {
    return this._connections().filter(conn => conn.isActive);
  });

  // Graph edges for visualization
  public readonly graphEdges = computed(() => {
    return this._connections().map(conn => this.connectionToGraphEdge(conn));
  });

  // Connection type configurations
  private readonly connectionTypeConfigs: ConnectionTypeConfig[] = [
    {
      type: 'rivalry',
      label: 'Rivalry',
      description: 'Traditional rivalry between clubs',
      color: '#f44336',
      icon: 'shield',
      defaultStrength: 'strong',
      allowsBidirectional: true,
      requiresEndDate: false,
      weightRange: { min: 70, max: 100, default: 85 }
    },
    {
      type: 'friendly',
      label: 'Friendly',
      description: 'Friendly relationship between clubs',
      color: '#4caf50',
      icon: 'handshake',
      defaultStrength: 'moderate',
      allowsBidirectional: true,
      requiresEndDate: false,
      weightRange: { min: 30, max: 70, default: 50 }
    },
    {
      type: 'geographic',
      label: 'Geographic',
      description: 'Clubs from the same region or city',
      color: '#2196f3',
      icon: 'location',
      defaultStrength: 'moderate',
      allowsBidirectional: true,
      requiresEndDate: false,
      weightRange: { min: 40, max: 80, default: 60 }
    },
    {
      type: 'historical',
      label: 'Historical',
      description: 'Historical connection between clubs',
      color: '#9c27b0',
      icon: 'history',
      defaultStrength: 'strong',
      allowsBidirectional: true,
      requiresEndDate: false,
      weightRange: { min: 60, max: 90, default: 75 }
    },
    {
      type: 'business',
      label: 'Business',
      description: 'Business partnership or cooperation',
      color: '#ff9800',
      icon: 'business',
      defaultStrength: 'moderate',
      allowsBidirectional: false,
      requiresEndDate: true,
      weightRange: { min: 40, max: 80, default: 60 }
    },
    {
      type: 'player_transfer',
      label: 'Player Transfer',
      description: 'Player movement between clubs',
      color: '#607d8b',
      icon: 'person',
      defaultStrength: 'weak',
      allowsBidirectional: false,
      requiresEndDate: false,
      weightRange: { min: 20, max: 60, default: 40 }
    },
    {
      type: 'coaching_staff',
      label: 'Coaching Staff',
      description: 'Coaching staff movement between clubs',
      color: '#795548',
      icon: 'school',
      defaultStrength: 'weak',
      allowsBidirectional: false,
      requiresEndDate: false,
      weightRange: { min: 20, max: 60, default: 40 }
    },
    {
      type: 'partnership',
      label: 'Partnership',
      description: 'Official partnership between clubs',
      color: '#009688',
      icon: 'link',
      defaultStrength: 'strong',
      allowsBidirectional: true,
      requiresEndDate: false,
      weightRange: { min: 70, max: 100, default: 85 }
    }
  ];

  constructor(private apiService: ApiService) {}

  /// <summary>
  /// Loads all connections with optional pagination and filtering.
  /// Updates the local state with the fetched connections.
  /// </summary>
  /// <param name="page">Page number for pagination (optional)</param>
  /// <param name="pageSize">Number of items per page (optional)</param>
  /// <param name="forceRefresh">Force refresh bypassing cache (optional)</param>
  /// <returns>Observable of paginated connection response</returns>
  public getAllConnections(page?: number, pageSize?: number, forceRefresh = false): Observable<PaginatedResponse<ConnectionDto>> {
    this._loadingState.set('loading');
    this._error.set(null);

    const params: Record<string, any> = {};
    if (page !== undefined) params['page'] = page;
    if (pageSize !== undefined) params['pageSize'] = pageSize;

    const cacheConfig = forceRefresh ? { enabled: false } : { enabled: true, ttl: 300000 }; // 5 minutes cache

    return this.apiService.get<PaginatedResponse<ConnectionDto>>('/connections', params, cacheConfig).pipe(
      tap(response => {
        this._connections.set(response.data);
        this._totalCount.set(response.totalCount);
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load connections');
        this._loadingState.set('error');
        return of({
          data: [],
          totalCount: 0,
          page: page || 1,
          pageSize: pageSize || 10,
          totalPages: 0
        } as PaginatedResponse<ConnectionDto>);
      })
    );
  }

  /// <summary>
  /// Retrieves connections for a specific club.
  /// </summary>
  /// <param name="clubId">The club ID to get connections for</param>
  /// <param name="includeIncoming">Include connections where club is target (optional)</param>
  /// <param name="includeOutgoing">Include connections where club is source (optional)</param>
  /// <returns>Observable of connections involving the club</returns>
  public getConnectionsByClub(clubId: number, includeIncoming = true, includeOutgoing = true): Observable<ConnectionDto[]> {
    this._loadingState.set('loading');
    this._error.set(null);

    const params: Record<string, any> = {
      clubId,
      includeIncoming,
      includeOutgoing
    };

    return this.apiService.get<PaginatedResponse<ConnectionDto>>(`/connections/club/${clubId}`, params,
      { enabled: true, ttl: 180000 }).pipe( // 3 minutes cache
      map(response => response.data),
      tap(connections => {
        this._loadingState.set('success');
        // Update local state with these connections if not already present
        this.mergeConnections(connections);
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load club connections');
        this._loadingState.set('error');
        return of([]);
      })
    );
  }

  /// <summary>
  /// Searches connections based on various criteria.
  /// </summary>
  /// <param name="criteria">Search criteria for filtering connections</param>
  /// <returns>Observable of matching connections</returns>
  public searchConnections(criteria: ConnectionSearchCriteria): Observable<ConnectionDto[]> {
    this._searchCriteria.set(criteria);
    this._loadingState.set('loading');
    this._error.set(null);

    return this.apiService.post<ApiResponse<ConnectionDto[]>>('/connections/search', criteria).pipe(
      map(response => response.data),
      tap(connections => {
        this._connections.set(connections);
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to search connections');
        this._loadingState.set('error');
        return of([]);
      })
    );
  }

  /// <summary>
  /// Creates a new connection with validation and optimistic updates.
  /// </summary>
  /// <param name="connectionData">Data for creating the new connection</param>
  /// <returns>Observable of the created connection</returns>
  public createConnection(connectionData: CreateConnectionDto): Observable<ConnectionDto | null> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Validate connection before creating
    const validation = this.validateConnection(connectionData);
    if (!validation.isValid) {
      this._error.set(validation.errors.join(', '));
      this._loadingState.set('error');
      return of(null);
    }

    return this.apiService.post<ApiResponse<ConnectionDto>>('/connections', connectionData).pipe(
      map(response => response.data),
      tap(createdConnection => {
        if (createdConnection) {
          const currentConnections = this._connections();
          this._connections.set([...currentConnections, createdConnection]);
          this._totalCount.set(this._totalCount() + 1);
        }
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to create connection');
        this._loadingState.set('error');
        return of(null);
      })
    );
  }

  /// <summary>
  /// Updates an existing connection with validation and optimistic updates.
  /// </summary>
  /// <param name="id">ID of the connection to update</param>
  /// <param name="connectionData">Updated connection data</param>
  /// <returns>Observable of the updated connection</returns>
  public updateConnection(id: number, connectionData: UpdateConnectionDto): Observable<ConnectionDto | null> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Store original connection for potential rollback
    const originalConnection = this._connections().find(c => c.id === id);
    if (!originalConnection) {
      this._error.set('Connection not found');
      this._loadingState.set('error');
      return of(null);
    }

    return this.apiService.put<ApiResponse<ConnectionDto>>(`/connections/${id}`, connectionData).pipe(
      map(response => response.data),
      tap(connection => {
        if (connection) {
          this.updateConnectionInArray(connection);
          if (this._selectedConnection()?.id === id) {
            this._selectedConnection.set(connection);
          }
        }
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to update connection');
        this._loadingState.set('error');
        return of(null);
      })
    );
  }

  /// <summary>
  /// Deletes a connection with optimistic updates.
  /// </summary>
  /// <param name="id">ID of the connection to delete</param>
  /// <returns>Observable indicating success</returns>
  public deleteConnection(id: number): Observable<boolean> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Store original state for potential rollback
    const originalConnections = [...this._connections()];
    const connectionToDelete = originalConnections.find(c => c.id === id);

    if (!connectionToDelete) {
      this._error.set('Connection not found');
      this._loadingState.set('error');
      return of(false);
    }

    // Optimistic update - remove connection
    const updatedConnections = originalConnections.filter(c => c.id !== id);
    this._connections.set(updatedConnections);
    this._totalCount.set(this._totalCount() - 1);

    // Clear selected connection if it's the one being deleted
    if (this._selectedConnection()?.id === id) {
      this._selectedConnection.set(null);
    }

    return this.apiService.delete(`/connections/${id}`).pipe(
      map(() => true),
      tap(() => {
        this._loadingState.set('success');
      }),
      catchError(error => {
        // Revert optimistic update
        this._connections.set(originalConnections);
        this._totalCount.set(this._totalCount() + 1);
        this._error.set(error.message || 'Failed to delete connection');
        this._loadingState.set('error');
        return of(false);
      })
    );
  }

  /// <summary>
  /// Creates multiple connections in bulk.
  /// </summary>
  /// <param name="request">Bulk connection creation request</param>
  /// <returns>Observable of bulk operation response</returns>
  public createBulkConnections(request: BulkConnectionRequest): Observable<BulkConnectionResponse> {
    this._loadingState.set('loading');
    this._error.set(null);

    return this.apiService.post<BulkConnectionResponse>('/connections/bulk', request).pipe(
      tap(response => {
        if (response.success && response.created > 0) {
          // Refresh connections to get the latest data
          this.getAllConnections(1, 100, true).subscribe();
        }
        this._loadingState.set('success');
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to create bulk connections');
        this._loadingState.set('error');
        return of({
          success: false,
          created: 0,
          skipped: 0,
          errors: [],
          warnings: []
        } as BulkConnectionResponse);
      })
    );
  }

  /// <summary>
  /// Validates a connection before creation or update.
  /// </summary>
  /// <param name="connectionData">Connection data to validate</param>
  /// <returns>Validation result with errors and warnings</returns>
  public validateConnection(connectionData: CreateConnectionDto | UpdateConnectionDto): ConnectionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const fullData = connectionData as CreateConnectionDto;

    // Validate required fields for creation
    if (fullData.sourceClubId !== undefined && fullData.targetClubId !== undefined) {
      // Check for self-connection
      if (fullData.sourceClubId === fullData.targetClubId) {
        errors.push('A club cannot be connected to itself');
      }

      // Check for duplicate connections
      const existingConnection = this._connections().find(conn =>
        (conn.sourceClub.id === fullData.sourceClubId && conn.targetClub.id === fullData.targetClubId) ||
        (conn.sourceClub.id === fullData.targetClubId && conn.targetClub.id === fullData.sourceClubId &&
         this.getConnectionTypeConfig(fullData.type)?.allowsBidirectional)
      );

      if (existingConnection) {
        errors.push('A connection between these clubs already exists');
      }
    }

    // Validate dates
    if (fullData.startDate && fullData.endDate) {
      if (fullData.startDate >= fullData.endDate) {
        errors.push('Start date must be before end date');
      }
    }

    // Validate connection type requirements
    const typeConfig = this.getConnectionTypeConfig(fullData.type);
    if (typeConfig) {
      if (typeConfig.requiresEndDate && !fullData.endDate) {
        warnings.push(`${typeConfig.label} connections typically require an end date`);
      }

      // Validate weight range
      if (fullData.weight !== undefined) {
        if (fullData.weight < typeConfig.weightRange.min || fullData.weight > typeConfig.weightRange.max) {
          warnings.push(`Weight should be between ${typeConfig.weightRange.min} and ${typeConfig.weightRange.max} for ${typeConfig.label} connections`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /// <summary>
  /// Gets connection statistics and aggregated data.
  /// </summary>
  /// <returns>Observable of connection statistics</returns>
  public getConnectionStatistics(): Observable<ConnectionStatistics> {
    return this.apiService.get<ApiResponse<ConnectionStatistics>>('/connections/statistics',
      {}, { enabled: true, ttl: 600000 }).pipe( // 10 minutes cache
      map(response => response.data),
      tap(stats => {
        this._statistics.set(stats);
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load connection statistics');
        return of({
          totalConnections: 0,
          activeConnections: 0,
          connectionsByType: {} as Record<ConnectionType, number>,
          connectionsByStrength: {} as Record<ConnectionStrength, number>,
          averageWeight: 0,
          mostConnectedClubs: [],
          connectionsByLeague: {},
          temporaryConnections: 0,
          permanentConnections: 0
        } as ConnectionStatistics);
      })
    );
  }

  /// <summary>
  /// Gets available connection type configurations.
  /// </summary>
  /// <returns>Array of connection type configurations</returns>
  public getConnectionTypeConfigs(): ConnectionTypeConfig[] {
    return [...this.connectionTypeConfigs];
  }

  /// <summary>
  /// Gets configuration for a specific connection type.
  /// </summary>
  /// <param name="type">Connection type to get configuration for</param>
  /// <returns>Connection type configuration or undefined</returns>
  public getConnectionTypeConfig(type: ConnectionType): ConnectionTypeConfig | undefined {
    return this.connectionTypeConfigs.find(config => config.type === type);
  }

  /// <summary>
  /// Sets the selected connection in the state.
  /// </summary>
  /// <param name="connection">Connection to select or null to clear selection</param>
  public setSelectedConnection(connection: ConnectionDto | null): void {
    this._selectedConnection.set(connection);
  }

  /// <summary>
  /// Clears the current search criteria.
  /// </summary>
  public clearSearchCriteria(): void {
    this._searchCriteria.set({});
  }

  /// <summary>
  /// Clears any error state.
  /// </summary>
  public clearError(): void {
    this._error.set(null);
  }

  /// <summary>
  /// Refreshes the connection data by clearing cache and reloading.
  /// </summary>
  /// <returns>Observable of the refreshed data</returns>
  public refresh(): Observable<PaginatedResponse<ConnectionDto>> {
    this.apiService.clearCache();
    return this.getAllConnections(1, 100, true);
  }

  // Private helper methods

  /// <summary>
  /// Converts a connection DTO to a graph edge for visualization.
  /// </summary>
  /// <param name="connection">Connection to convert</param>
  /// <returns>Graph edge representation</returns>
  private connectionToGraphEdge(connection: ConnectionDto): GraphEdge {
    const typeConfig = this.getConnectionTypeConfig(connection.type);

    return {
      id: `connection-${connection.id}`,
      source: connection.sourceClub.id,
      target: connection.targetClub.id,
      type: connection.type,
      strength: connection.strength,
      weight: connection.weight,
      label: connection.displayLabel,
      color: typeConfig?.color || '#666666',
      style: connection.isActive ? 'solid' : 'dashed',
      arrow: !typeConfig?.allowsBidirectional,
      isActive: connection.isActive,
      metadata: {
        description: connection.description,
        startDate: connection.startDate,
        endDate: connection.endDate,
        duration: connection.duration
      }
    };
  }

  /// <summary>
  /// Updates a connection in the local connections array.
  /// </summary>
  /// <param name="updatedConnection">The updated connection object</param>
  private updateConnectionInArray(updatedConnection: ConnectionDto): void {
    const currentConnections = this._connections();
    const index = currentConnections.findIndex(c => c.id === updatedConnection.id);

    if (index !== -1) {
      const newConnections = [...currentConnections];
      newConnections[index] = updatedConnection;
      this._connections.set(newConnections);
    }
  }

  /// <summary>
  /// Merges new connections with existing ones, avoiding duplicates.
  /// </summary>
  /// <param name="newConnections">Array of new connections to merge</param>
  private mergeConnections(newConnections: ConnectionDto[]): void {
    const currentConnections = this._connections();
    const existingIds = new Set(currentConnections.map(c => c.id));

    const connectionsToAdd = newConnections.filter(conn => !existingIds.has(conn.id));

    if (connectionsToAdd.length > 0) {
      this._connections.set([...currentConnections, ...connectionsToAdd]);
    }
  }
}
