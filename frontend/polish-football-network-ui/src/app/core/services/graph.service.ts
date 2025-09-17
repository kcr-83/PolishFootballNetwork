import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, catchError, of, combineLatest, forkJoin } from 'rxjs';
import { ApiService } from './api.service';
import { ClubService } from './club.service';
import { ConnectionService } from './connection.service';
import {
  GraphData,
  GraphNode,
  GraphConfig,
  GraphAnalysis,
  GraphExportOptions,
  GraphFilterCriteria,
  GraphEvents,
  GraphState,
  GraphPath,
  ConnectionRecommendation,
  GraphCluster,
  GraphLayoutType
} from '../../shared/models/graph.model';
import { ClubDto } from '../../shared/models/club.model';
import { ConnectionDto, GraphEdge } from '../../shared/models/connection.model';
import { LoadingState } from '../../shared/models/common.model';

/// <summary>
/// Service for managing graph visualization and analysis with Cytoscape.js integration.
/// Provides graph data preparation, layout management, analysis tools, and export functionality.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class GraphService {
  // State signals
  private readonly _graphData = signal<GraphData | null>(null);
  private readonly _graphConfig = signal<GraphConfig>(this.getDefaultConfig());
  private readonly _selectedNodes = signal<number[]>([]);
  private readonly _selectedEdges = signal<string[]>([]);
  private readonly _loadingState = signal<LoadingState>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _analysis = signal<GraphAnalysis | null>(null);
  private readonly _filterCriteria = signal<GraphFilterCriteria>({});
  private readonly _graphStates = signal<GraphState[]>([]);
  private readonly _currentStateIndex = signal<number>(-1);

  // Public computed signals
  public readonly graphData = computed(() => this._graphData());
  public readonly graphConfig = computed(() => this._graphConfig());
  public readonly selectedNodes = computed(() => this._selectedNodes());
  public readonly selectedEdges = computed(() => this._selectedEdges());
  public readonly loadingState = computed(() => this._loadingState());
  public readonly error = computed(() => this._error());
  public readonly analysis = computed(() => this._analysis());
  public readonly filterCriteria = computed(() => this._filterCriteria());
  public readonly isLoading = computed(() => this._loadingState() === 'loading');
  public readonly hasError = computed(() => this._error() !== null);
  public readonly hasGraphData = computed(() => this._graphData() !== null);

  // Filtered graph data based on current criteria
  public readonly filteredGraphData = computed(() => {
    const data = this._graphData();
    const criteria = this._filterCriteria();

    if (!data || Object.keys(criteria).length === 0) {
      return data;
    }

    return this.applyFilters(data, criteria);
  });

  // Graph statistics
  public readonly graphStats = computed(() => {
    const data = this.filteredGraphData();
    if (!data) {
      return null;
    }

    return {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      density: data.metadata?.density || 0,
      connectedComponents: data.metadata?.connectedComponents || 0,
      averageDegree: data.metadata?.averageDegree || 0,
      selectedNodesCount: this._selectedNodes().length,
      selectedEdgesCount: this._selectedEdges().length
    };
  });

  // Available layout types
  public readonly availableLayouts: GraphLayoutType[] = [
    'force-directed',
    'hierarchical',
    'circular',
    'grid',
    'concentric',
    'breadthfirst',
    'cola',
    'dagre'
  ];

  constructor(
    private apiService: ApiService,
    private clubService: ClubService,
    private connectionService: ConnectionService
  ) {}

  /// <summary>
  /// Loads complete graph data by combining clubs and connections.
  /// Updates the local graph state with the combined data.
  /// </summary>
  /// <param name="forceRefresh">Force refresh bypassing cache (optional)</param>
  /// <returns>Observable of complete graph data</returns>
  public loadGraphData(forceRefresh = false): Observable<GraphData> {
    this._loadingState.set('loading');
    this._error.set(null);

    // Load both clubs and connections in parallel
    const clubs$ = this.clubService.getAllClubs(1, 1000, forceRefresh);
    const connections$ = this.connectionService.getAllConnections(1, 1000, forceRefresh);

    return combineLatest([clubs$, connections$]).pipe(
      map(([clubsResponse, connectionsResponse]) => {
        const clubs = clubsResponse.data;
        const connections = connectionsResponse.data;

        return this.buildGraphData(clubs, connections);
      }),
      tap(graphData => {
        this._graphData.set(graphData);
        this._loadingState.set('success');
        this.saveCurrentState();
      }),
      catchError(error => {
        this._error.set(error.message || 'Failed to load graph data');
        this._loadingState.set('error');
        return of({
          nodes: [],
          edges: [],
          metadata: {
            totalNodes: 0,
            totalEdges: 0,
            density: 0,
            connectedComponents: 0,
            averageDegree: 0,
            maxDegree: 0,
            minDegree: 0,
            generatedAt: new Date()
          }
        } as GraphData);
      })
    );
  }

  /// <summary>
  /// Updates the graph configuration and applies changes.
  /// </summary>
  /// <param name="config">New graph configuration</param>
  public updateGraphConfig(config: Partial<GraphConfig>): void {
    const currentConfig = this._graphConfig();
    const newConfig = { ...currentConfig, ...config };
    this._graphConfig.set(newConfig);
    this.saveCurrentState();
  }

  /// <summary>
  /// Applies filters to the graph data.
  /// </summary>
  /// <param name="criteria">Filter criteria to apply</param>
  public applyFilters(data: GraphData, criteria: GraphFilterCriteria): GraphData {
    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];

    // Apply node filters
    if (criteria.nodeFilters) {
      const { leagues, cities, foundedYearRange, hasCoordinates, degreeRange } = criteria.nodeFilters;

      if (leagues && leagues.length > 0) {
        filteredNodes = filteredNodes.filter(node => leagues.includes(node.data.league));
      }

      if (cities && cities.length > 0) {
        filteredNodes = filteredNodes.filter(node => cities.includes(node.data.city));
      }

      if (foundedYearRange) {
        filteredNodes = filteredNodes.filter(node =>
          node.data.foundedYear >= foundedYearRange.min &&
          node.data.foundedYear <= foundedYearRange.max
        );
      }

      if (hasCoordinates !== undefined) {
        filteredNodes = filteredNodes.filter(node =>
          hasCoordinates ? (node.data.latitude && node.data.longitude) :
          !(node.data.latitude && node.data.longitude)
        );
      }

      if (degreeRange) {
        const degrees = this.calculateNodeDegrees(data);
        filteredNodes = filteredNodes.filter(node => {
          const degree = degrees[node.id] || 0;
          return degree >= degreeRange.min && degree <= degreeRange.max;
        });
      }
    }

    // Apply edge filters
    if (criteria.edgeFilters) {
      const { connectionTypes, strengthLevels, weightRange, isActive, hasEndDate } = criteria.edgeFilters;

      if (connectionTypes && connectionTypes.length > 0) {
        filteredEdges = filteredEdges.filter(edge => connectionTypes.includes(edge.type));
      }

      if (strengthLevels && strengthLevels.length > 0) {
        filteredEdges = filteredEdges.filter(edge => strengthLevels.includes(edge.strength));
      }

      if (weightRange) {
        filteredEdges = filteredEdges.filter(edge =>
          edge.weight >= weightRange.min && edge.weight <= weightRange.max
        );
      }

      if (isActive !== undefined) {
        filteredEdges = filteredEdges.filter(edge => edge.isActive === isActive);
      }

      if (hasEndDate !== undefined) {
        filteredEdges = filteredEdges.filter(edge =>
          hasEndDate ? edge.metadata?.['endDate'] : !edge.metadata?.['endDate']
        );
      }
    }

    // Filter nodes that are not connected to any remaining edges
    if (criteria.layoutFilters?.hideIsolatedNodes) {
      const connectedNodeIds = new Set<number>();
      filteredEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
    }

    // Apply layout filters
    if (criteria.layoutFilters) {
      if (criteria.layoutFilters.hideWeakConnections) {
        const threshold = 30; // Configurable threshold
        filteredEdges = filteredEdges.filter(edge => edge.weight >= threshold);
      }

      if (criteria.layoutFilters.showOnlyLargestComponent) {
        const components = this.findConnectedComponents(filteredNodes, filteredEdges);
        if (components.length > 0) {
          const largestComponent = components.reduce((max, component) =>
            component.length > max.length ? component : max
          );
          const largestComponentIds = new Set(largestComponent);
          filteredNodes = filteredNodes.filter(node => largestComponentIds.has(node.id));
          filteredEdges = filteredEdges.filter(edge =>
            largestComponentIds.has(edge.source) && largestComponentIds.has(edge.target)
          );
        }
      }
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: {
        totalNodes: filteredNodes.length,
        totalEdges: filteredEdges.length,
        density: this.calculateDensity(filteredNodes.length, filteredEdges.length),
        connectedComponents: data.metadata?.connectedComponents || 0,
        averageDegree: data.metadata?.averageDegree || 0,
        maxDegree: data.metadata?.maxDegree || 0,
        minDegree: data.metadata?.minDegree || 0,
        generatedAt: data.metadata?.generatedAt || new Date()
      }
    };
  }

  /// <summary>
  /// Sets filter criteria and updates the graph display.
  /// </summary>
  /// <param name="criteria">Filter criteria to apply</param>
  public setFilterCriteria(criteria: GraphFilterCriteria): void {
    this._filterCriteria.set(criteria);
    this.saveCurrentState();
  }

  /// <summary>
  /// Selects nodes in the graph.
  /// </summary>
  /// <param name="nodeIds">Array of node IDs to select</param>
  /// <param name="addToSelection">Add to existing selection instead of replacing</param>
  public selectNodes(nodeIds: number[], addToSelection = false): void {
    if (addToSelection) {
      const currentSelection = this._selectedNodes();
      const newSelection = [...new Set([...currentSelection, ...nodeIds])];
      this._selectedNodes.set(newSelection);
    } else {
      this._selectedNodes.set(nodeIds);
    }
    this.saveCurrentState();
  }

  /// <summary>
  /// Selects edges in the graph.
  /// </summary>
  /// <param name="edgeIds">Array of edge IDs to select</param>
  /// <param name="addToSelection">Add to existing selection instead of replacing</param>
  public selectEdges(edgeIds: string[], addToSelection = false): void {
    if (addToSelection) {
      const currentSelection = this._selectedEdges();
      const newSelection = [...new Set([...currentSelection, ...edgeIds])];
      this._selectedEdges.set(newSelection);
    } else {
      this._selectedEdges.set(edgeIds);
    }
    this.saveCurrentState();
  }

  /// <summary>
  /// Clears all selections.
  /// </summary>
  public clearSelection(): void {
    this._selectedNodes.set([]);
    this._selectedEdges.set([]);
    this.saveCurrentState();
  }

  /// <summary>
  /// Performs graph analysis and calculates various metrics.
  /// </summary>
  /// <returns>Observable of graph analysis results</returns>
  public analyzeGraph(): Observable<GraphAnalysis> {
    const data = this.filteredGraphData();
    if (!data) {
      return of({} as GraphAnalysis);
    }

    this._loadingState.set('loading');

    // Calculate analysis locally for now (could be moved to backend for large graphs)
    const analysis = this.calculateGraphAnalysis(data);

    this._analysis.set(analysis);
    this._loadingState.set('success');

    return of(analysis);
  }

  /// <summary>
  /// Finds the shortest path between two nodes.
  /// </summary>
  /// <param name="sourceId">Source node ID</param>
  /// <param name="targetId">Target node ID</param>
  /// <returns>Observable of path finding result</returns>
  public findShortestPath(sourceId: number, targetId: number): Observable<GraphPath> {
    const data = this.filteredGraphData();
    if (!data) {
      return of({
        source: sourceId,
        target: targetId,
        path: [],
        length: 0,
        weight: 0,
        connectionTypes: [],
        exists: false
      });
    }

    // Use Dijkstra's algorithm for weighted shortest path
    const path = this.dijkstraShortestPath(data, sourceId, targetId);
    return of(path);
  }

  /// <summary>
  /// Gets connection recommendations for a specific club.
  /// </summary>
  /// <param name="clubId">Club ID to get recommendations for</param>
  /// <param name="maxRecommendations">Maximum number of recommendations</param>
  /// <returns>Observable of connection recommendations</returns>
  public getConnectionRecommendations(clubId: number, maxRecommendations = 10): Observable<ConnectionRecommendation[]> {
    const data = this.filteredGraphData();
    if (!data) {
      return of([]);
    }

    const recommendations = this.calculateConnectionRecommendations(data, clubId, maxRecommendations);
    return of(recommendations);
  }

  /// <summary>
  /// Exports graph data in the specified format.
  /// </summary>
  /// <param name="options">Export options including format and styling</param>
  /// <returns>Observable of export result (URL or data)</returns>
  public exportGraph(options: GraphExportOptions): Observable<string | Blob> {
    const data = this.filteredGraphData();
    if (!data) {
      throw new Error('No graph data available for export');
    }

    switch (options.format) {
      case 'json':
        return of(this.exportAsJson(data, options));
      case 'csv':
        return of(this.exportAsCsv(data, options));
      case 'gexf':
        return of(this.exportAsGexf(data, options));
      case 'graphml':
        return of(this.exportAsGraphML(data, options));
      default:
        // For image formats, this would integrate with the visualization component
        throw new Error(`Export format ${options.format} not yet implemented`);
    }
  }

  /// <summary>
  /// Saves the current graph state for undo/redo functionality.
  /// </summary>
  public saveCurrentState(): void {
    const state: GraphState = {
      id: `state-${Date.now()}`,
      timestamp: new Date(),
      config: this._graphConfig(),
      selectedNodes: this._selectedNodes(),
      selectedEdges: this._selectedEdges(),
      zoomLevel: 1, // Would be provided by visualization component
      panPosition: { x: 0, y: 0 }, // Would be provided by visualization component
      filterCriteria: this._filterCriteria(),
      layout: this._graphConfig().layout.type
    };

    const states = this._graphStates();
    const currentIndex = this._currentStateIndex();

    // Remove any states after current index (for redo)
    const newStates = states.slice(0, currentIndex + 1);
    newStates.push(state);

    // Limit history to last 50 states
    if (newStates.length > 50) {
      newStates.shift();
    }

    this._graphStates.set(newStates);
    this._currentStateIndex.set(newStates.length - 1);
  }

  /// <summary>
  /// Undoes the last graph state change.
  /// </summary>
  public undo(): boolean {
    const currentIndex = this._currentStateIndex();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      this.restoreState(newIndex);
      return true;
    }
    return false;
  }

  /// <summary>
  /// Redoes the next graph state change.
  /// </summary>
  public redo(): boolean {
    const currentIndex = this._currentStateIndex();
    const states = this._graphStates();
    if (currentIndex < states.length - 1) {
      const newIndex = currentIndex + 1;
      this.restoreState(newIndex);
      return true;
    }
    return false;
  }

  /// <summary>
  /// Clears any error state.
  /// </summary>
  public clearError(): void {
    this._error.set(null);
  }

  /// <summary>
  /// Refreshes the graph data by clearing cache and reloading.
  /// </summary>
  /// <returns>Observable of the refreshed graph data</returns>
  public refresh(): Observable<GraphData> {
    return this.loadGraphData(true);
  }

  // Private helper methods

  /// <summary>
  /// Builds graph data from clubs and connections.
  /// </summary>
  private buildGraphData(clubs: ClubDto[], connections: ConnectionDto[]): GraphData {
    const nodes: GraphNode[] = clubs.map(club => ({
      id: club.id,
      label: club.name,
      data: club,
      size: 10, // Default size, can be calculated based on degree
      color: this.getNodeColorByLeague(club.league),
      shape: 'circle',
      position: club.latitude && club.longitude ?
        { x: club.longitude * 1000, y: club.latitude * 1000 } : undefined
    }));

    const edges: GraphEdge[] = connections.map(conn => ({
      id: `connection-${conn.id}`,
      source: conn.sourceClub.id,
      target: conn.targetClub.id,
      type: conn.type,
      strength: conn.strength,
      weight: conn.weight,
      label: conn.displayLabel,
      isActive: conn.isActive,
      metadata: {
        description: conn.description,
        startDate: conn.startDate,
        endDate: conn.endDate
      }
    }));

    const metadata = this.calculateGraphMetadata(nodes, edges);

    return { nodes, edges, metadata };
  }

  /// <summary>
  /// Calculates graph metadata and statistics.
  /// </summary>
  private calculateGraphMetadata(nodes: GraphNode[], edges: GraphEdge[]) {
    const degrees = this.calculateNodeDegrees({ nodes, edges });
    const degreeValues = Object.values(degrees);

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      density: this.calculateDensity(nodes.length, edges.length),
      connectedComponents: this.findConnectedComponents(nodes, edges).length,
      averageDegree: degreeValues.reduce((sum, deg) => sum + deg, 0) / degreeValues.length || 0,
      maxDegree: Math.max(...degreeValues, 0),
      minDegree: Math.min(...degreeValues, 0),
      generatedAt: new Date()
    };
  }

  /// <summary>
  /// Calculates node degrees (number of connections).
  /// </summary>
  private calculateNodeDegrees(data: { nodes: GraphNode[], edges: GraphEdge[] }): Record<number, number> {
    const degrees: Record<number, number> = {};

    // Initialize all nodes with degree 0
    data.nodes.forEach(node => {
      degrees[node.id] = 0;
    });

    // Count edges for each node
    data.edges.forEach(edge => {
      degrees[edge.source] = (degrees[edge.source] || 0) + 1;
      degrees[edge.target] = (degrees[edge.target] || 0) + 1;
    });

    return degrees;
  }

  /// <summary>
  /// Calculates graph density (actual edges / possible edges).
  /// </summary>
  private calculateDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount < 2) return 0;
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2; // For undirected graph
    return edgeCount / maxEdges;
  }

  /// <summary>
  /// Finds connected components in the graph.
  /// </summary>
  private findConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): number[][] {
    const visited = new Set<number>();
    const components: number[][] = [];

    // Build adjacency list
    const adjacency: Record<number, number[]> = {};
    nodes.forEach(node => {
      adjacency[node.id] = [];
    });

    edges.forEach(edge => {
      adjacency[edge.source].push(edge.target);
      adjacency[edge.target].push(edge.source);
    });

    // DFS to find components
    const dfs = (nodeId: number, component: number[]) => {
      visited.add(nodeId);
      component.push(nodeId);

      adjacency[nodeId].forEach(neighborId => {
        if (!visited.has(neighborId)) {
          dfs(neighborId, component);
        }
      });
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component: number[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    });

    return components;
  }

  /// <summary>
  /// Calculates comprehensive graph analysis.
  /// </summary>
  private calculateGraphAnalysis(data: GraphData): GraphAnalysis {
    const degrees = this.calculateNodeDegrees(data);
    const components = this.findConnectedComponents(data.nodes, data.edges);

    // Simplified centrality calculations (full implementation would be more complex)
    const betweenness: Record<number, number> = {};
    const closeness: Record<number, number> = {};
    const eigenvector: Record<number, number> = {};

    // Initialize with basic values
    data.nodes.forEach(node => {
      betweenness[node.id] = 0;
      closeness[node.id] = degrees[node.id] || 0;
      eigenvector[node.id] = degrees[node.id] || 0;
    });

    return {
      networkMetrics: {
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
        density: data.metadata?.density || 0,
        diameter: 0, // Would need full shortest path calculation
        averagePathLength: 0, // Would need full shortest path calculation
        clusteringCoefficient: 0, // Would need triangle counting
        connectedComponents: components.length,
        isolatedNodes: components.filter(comp => comp.length === 1).length
      },
      centralityMeasures: {
        degree: degrees,
        betweenness,
        closeness,
        eigenvector
      },
      communities: {
        algorithm: 'louvain',
        communities: components.map((comp, idx) => ({
          id: idx,
          nodes: comp,
          size: comp.length,
          modularity: 0
        })),
        totalCommunities: components.length,
        averageCommunitySize: components.reduce((sum, comp) => sum + comp.length, 0) / components.length || 0,
        modularity: 0
      },
      topNodes: {
        mostConnected: Object.entries(degrees)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([clubId, degree]) => ({ clubId: parseInt(clubId), degree })),
        mostCentral: Object.entries(betweenness)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([clubId, betweenness]) => ({ clubId: parseInt(clubId), betweenness })),
        bridges: Object.entries(closeness)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([clubId, closeness]) => ({ clubId: parseInt(clubId), closeness })),
        hubs: Object.entries(eigenvector)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([clubId, eigenvector]) => ({ clubId: parseInt(clubId), eigenvector }))
      }
    };
  }

  /// <summary>
  /// Implements Dijkstra's algorithm for shortest path finding.
  /// </summary>
  private dijkstraShortestPath(data: GraphData, sourceId: number, targetId: number): GraphPath {
    // Simplified implementation
    const distances: Record<number, number> = {};
    const previous: Record<number, number | null> = {};
    const unvisited = new Set<number>();

    // Initialize
    data.nodes.forEach(node => {
      distances[node.id] = node.id === sourceId ? 0 : Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    });

    // Build adjacency with weights
    const adjacency: Record<number, Array<{ node: number, weight: number, type: string }>> = {};
    data.nodes.forEach(node => {
      adjacency[node.id] = [];
    });

    data.edges.forEach(edge => {
      const weight = 100 - edge.weight; // Invert weight (higher connection weight = lower path cost)
      adjacency[edge.source].push({ node: edge.target, weight, type: edge.type });
      adjacency[edge.target].push({ node: edge.source, weight, type: edge.type });
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current = -1;
      let minDistance = Infinity;
      for (const nodeId of unvisited) {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          current = nodeId;
        }
      }

      if (current === -1 || distances[current] === Infinity) break;
      if (current === targetId) break;

      unvisited.delete(current);

      // Update distances to neighbors
      adjacency[current].forEach(({ node: neighbor, weight }) => {
        if (unvisited.has(neighbor)) {
          const newDistance = distances[current] + weight;
          if (newDistance < distances[neighbor]) {
            distances[neighbor] = newDistance;
            previous[neighbor] = current;
          }
        }
      });
    }

    // Reconstruct path
    const path: number[] = [];
    let current = targetId;
    while (current !== null && previous[current] !== undefined) {
      path.unshift(current);
      current = previous[current]!;
    }
    if (current === sourceId) {
      path.unshift(sourceId);
    }

    const exists = path.length > 0 && path[0] === sourceId && path[path.length - 1] === targetId;

    return {
      source: sourceId,
      target: targetId,
      path: exists ? path : [],
      length: exists ? path.length - 1 : 0,
      weight: exists ? distances[targetId] : 0,
      connectionTypes: [], // Would need to trace path through edges
      exists
    };
  }

  /// <summary>
  /// Calculates connection recommendations based on graph structure.
  /// </summary>
  private calculateConnectionRecommendations(
    data: GraphData,
    clubId: number,
    maxRecommendations: number
  ): ConnectionRecommendation[] {
    const recommendations: ConnectionRecommendation[] = [];
    const club = data.nodes.find(n => n.id === clubId);
    if (!club) return recommendations;

    // Find existing connections
    const existingConnections = new Set<number>();
    data.edges.forEach(edge => {
      if (edge.source === clubId) existingConnections.add(edge.target);
      if (edge.target === clubId) existingConnections.add(edge.source);
    });

    // Score potential connections
    data.nodes.forEach(targetNode => {
      if (targetNode.id === clubId || existingConnections.has(targetNode.id)) return;

      const recommendation = this.calculateSingleRecommendation(data, club, targetNode, clubId);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations);
  }

  /// <summary>
  /// Calculates a single connection recommendation between two clubs.
  /// </summary>
  private calculateSingleRecommendation(
    data: GraphData,
    club: GraphNode,
    targetNode: GraphNode,
    clubId: number
  ): ConnectionRecommendation | null {
    let score = 0;
    const reasons: string[] = [];

    // Same league bonus
    if (club.data.league === targetNode.data.league) {
      score += 30;
      reasons.push('Same league');
    }

    // Same city bonus
    if (club.data.city === targetNode.data.city) {
      score += 25;
      reasons.push('Same city');
    }

    // Geographic proximity (if coordinates available)
    if (club.data.latitude && club.data.longitude &&
        targetNode.data.latitude && targetNode.data.longitude) {
      const distance = this.calculateDistance(
        club.data.latitude, club.data.longitude,
        targetNode.data.latitude, targetNode.data.longitude
      );
      if (distance < 50) { // Within 50km
        score += 20;
        reasons.push('Geographic proximity');
      }
    }

    // Common neighbors
    const clubNeighbors = this.getNeighbors(data, clubId);
    const targetNeighbors = this.getNeighbors(data, targetNode.id);
    const commonNeighbors = clubNeighbors.filter(n => targetNeighbors.includes(n));
    score += commonNeighbors.length * 5;
    if (commonNeighbors.length > 0) {
      reasons.push(`${commonNeighbors.length} mutual connections`);
    }

    if (score <= 0) return null;

    let suggestedStrength: string;
    if (score > 50) {
      suggestedStrength = 'strong';
    } else if (score > 25) {
      suggestedStrength = 'moderate';
    } else {
      suggestedStrength = 'weak';
    }

    return {
      sourceClubId: clubId,
      targetClubId: targetNode.id,
      score,
      reasons,
      suggestedType: this.suggestConnectionType(club.data, targetNode.data),
      suggestedStrength,
      commonNeighbors,
      mutualConnections: commonNeighbors.length,
      geographicDistance: club.data.latitude && targetNode.data.latitude ?
        this.calculateDistance(
          club.data.latitude, club.data.longitude!,
          targetNode.data.latitude, targetNode.data.longitude!
        ) : undefined,
      leagueMatch: club.data.league === targetNode.data.league,
      cityMatch: club.data.city === targetNode.data.city
    };
  }

  /// <summary>
  /// Gets neighbors of a node in the graph.
  /// </summary>
  private getNeighbors(data: GraphData, nodeId: number): number[] {
    const neighbors: number[] = [];
    data.edges.forEach(edge => {
      if (edge.source === nodeId) neighbors.push(edge.target);
      if (edge.target === nodeId) neighbors.push(edge.source);
    });
    return neighbors;
  }

  /// <summary>
  /// Calculates distance between two coordinates in kilometers.
  /// </summary>
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /// <summary>
  /// Suggests connection type based on club properties.
  /// </summary>
  private suggestConnectionType(club1: ClubDto, club2: ClubDto): string {
    if (club1.city === club2.city) return 'geographic';
    if (club1.league === club2.league) return 'friendly';
    return 'partnership';
  }

  /// <summary>
  /// Gets node color based on league.
  /// </summary>
  private getNodeColorByLeague(league: string): string {
    const colors: Record<string, string> = {
      'Ekstraklasa': '#e53e3e',
      'I Liga': '#3182ce',
      'II Liga': '#38a169',
      'III Liga': '#d69e2e',
      'IV Liga': '#805ad5'
    };
    return colors[league] || '#718096';
  }

  /// <summary>
  /// Restores a specific graph state.
  /// </summary>
  private restoreState(stateIndex: number): void {
    const states = this._graphStates();
    if (stateIndex >= 0 && stateIndex < states.length) {
      const state = states[stateIndex];
      this._graphConfig.set(state.config);
      this._selectedNodes.set(state.selectedNodes);
      this._selectedEdges.set(state.selectedEdges);
      this._filterCriteria.set(state.filterCriteria);
      this._currentStateIndex.set(stateIndex);
    }
  }

  /// <summary>
  /// Gets default graph configuration.
  /// </summary>
  private getDefaultConfig(): GraphConfig {
    return {
      layout: {
        type: 'force-directed',
        options: {}
      },
      nodes: {
        defaultSize: 10,
        minSize: 5,
        maxSize: 50,
        sizeAttribute: 'degree',
        colorScheme: 'league',
        showLabels: true,
        labelSize: 12
      },
      edges: {
        defaultWidth: 2,
        minWidth: 1,
        maxWidth: 10,
        widthAttribute: 'weight',
        showArrows: true,
        curvedEdges: false,
        showLabels: false
      },
      interaction: {
        zoomEnabled: true,
        panEnabled: true,
        selectEnabled: true,
        multiSelectEnabled: true,
        hoverEnabled: true,
        dragEnabled: true
      },
      filters: {
        minConnectionWeight: 0,
        maxConnectionWeight: 100,
        connectionTypes: [],
        leagues: [],
        cities: [],
        showInactiveConnections: true
      },
      animation: {
        enabled: true,
        duration: 1000,
        easing: 'ease-out'
      }
    };
  }

  /// <summary>
  /// Exports graph data as JSON.
  /// </summary>
  private exportAsJson(data: GraphData, options: GraphExportOptions): string {
    const exportData = {
      nodes: data.nodes.map(node => ({
        id: node.id,
        label: node.label,
        ...options.includePositions && node.position ? { position: node.position } : {},
        ...options.includeData ? { data: node.data } : {},
        ...options.includeStyles ? {
          size: node.size,
          color: node.color,
          shape: node.shape
        } : {}
      })),
      edges: data.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight,
        ...options.includeData ? { metadata: edge.metadata } : {},
        ...options.includeStyles ? {
          color: edge.color,
          style: edge.style
        } : {}
      })),
      ...options.includeData ? { metadata: data.metadata } : {}
    };

    return JSON.stringify(exportData, null, 2);
  }

  /// <summary>
  /// Exports graph data as CSV.
  /// </summary>
  private exportAsCsv(data: GraphData, options: GraphExportOptions): string {
    let csv = '';

    // Nodes CSV
    csv += 'NODES\n';
    csv += 'id,label,league,city,foundedYear\n';
    data.nodes.forEach(node => {
      csv += `${node.id},"${node.label}","${node.data.league}","${node.data.city}",${node.data.foundedYear}\n`;
    });

    csv += '\nEDGES\n';
    csv += 'id,source,target,type,weight,strength\n';
    data.edges.forEach(edge => {
      csv += `"${edge.id}",${edge.source},${edge.target},"${edge.type}",${edge.weight},"${edge.strength}"\n`;
    });

    return csv;
  }

  /// <summary>
  /// Exports graph data as GEXF format.
  /// </summary>
  private exportAsGexf(data: GraphData, options: GraphExportOptions): string {
    // Simplified GEXF export
    let gexf = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gexf += '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\n';
    gexf += '  <graph mode="static" defaultedgetype="undirected">\n';

    // Nodes
    gexf += '    <nodes>\n';
    data.nodes.forEach(node => {
      gexf += `      <node id="${node.id}" label="${node.label}"/>\n`;
    });
    gexf += '    </nodes>\n';

    // Edges
    gexf += '    <edges>\n';
    data.edges.forEach((edge, index) => {
      gexf += `      <edge id="${index}" source="${edge.source}" target="${edge.target}" weight="${edge.weight}"/>\n`;
    });
    gexf += '    </edges>\n';

    gexf += '  </graph>\n';
    gexf += '</gexf>';

    return gexf;
  }

  /// <summary>
  /// Exports graph data as GraphML format.
  /// </summary>
  private exportAsGraphML(data: GraphData, options: GraphExportOptions): string {
    // Simplified GraphML export
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '  <graph id="PolishFootballNetwork" edgedefault="undirected">\n';

    // Nodes
    data.nodes.forEach(node => {
      graphml += `    <node id="${node.id}"/>\n`;
    });

    // Edges
    data.edges.forEach((edge, index) => {
      graphml += `    <edge id="${index}" source="${edge.source}" target="${edge.target}"/>\n`;
    });

    graphml += '  </graph>\n';
    graphml += '</graphml>';

    return graphml;
  }
}
