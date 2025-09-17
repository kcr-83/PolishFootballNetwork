import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, catchError, of, combineLatest } from 'rxjs';
import cytoscape, { Core, ElementDefinition, NodeSingular, EdgeSingular } from 'cytoscape';
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
  GraphLayoutType
} from '../../shared/models/graph.model';
import { ClubDto, Club } from '../../shared/models/club.model';
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

  // Cytoscape instance management
  private cytoscapeInstance: Core | null = null;
  private readonly cytoscapeCallbacks: Map<string, Function> = new Map();

  // Performance optimization signals
  private readonly _performanceMode = signal<'standard' | 'high-performance' | 'ultra'>('standard');
  private readonly _viewportCulling = signal<boolean>(false);
  private readonly _lazyLoading = signal<boolean>(false);
  private readonly _maxVisibleNodes = signal<number>(500);
  private readonly _renderBatchSize = signal<number>(100);
  private readonly _visibleElements = signal<Set<string>>(new Set());
  private readonly _performanceMetrics = signal<{
    frameRate: number;
    nodeCount: number;
    edgeCount: number;
    visibleNodeCount: number;
    visibleEdgeCount: number;
    renderTime: number;
    memoryUsage: number;
    lastUpdate: Date;
  } | null>(null);

  // Viewport culling state
  private viewportBounds: { x1: number; y1: number; x2: number; y2: number; } | null = null;
  private cullingThreshold = 1000; // Enable culling when node count exceeds this
  private lastCullingUpdate = 0;
  private cullingUpdateInterval = 16; // ~60fps

  // Lazy loading state
  private loadedChunks: Set<string> = new Set();
  private pendingChunks: string[] = [];
  private isLoadingChunk = false;

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

  // Performance optimization public signals
  public readonly performanceMode = computed(() => this._performanceMode());
  public readonly viewportCulling = computed(() => this._viewportCulling());
  public readonly lazyLoading = computed(() => this._lazyLoading());
  public readonly maxVisibleNodes = computed(() => this._maxVisibleNodes());
  public readonly performanceMetrics = computed(() => this._performanceMetrics());
  public readonly visibleElementCount = computed(() => this._visibleElements().size);

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
    private readonly apiService: ApiService,
    private readonly clubService: ClubService,
    private readonly connectionService: ConnectionService
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

        // Convert clubs to DTOs
        const clubDtos = clubs.map(club => this.convertClubToDto(club));

        return this.buildGraphData(clubDtos, connections);
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
  /// Updates the current selection of nodes and edges.
  /// </summary>
  /// <param name="nodeIds">Array of selected node IDs</param>
  /// <param name="edgeIds">Array of selected edge IDs</param>
  public updateSelection(nodeIds: number[], edgeIds: string[]): void {
    this._selectedNodes.set(nodeIds);
    this._selectedEdges.set(edgeIds);
    this.saveCurrentState();
  }

  // Cytoscape Integration Methods

  /// <summary>
  /// Initializes a Cytoscape graph instance with the provided container and configuration.
  /// </summary>
  /// <param name="container">HTML container element for the graph</param>
  /// <param name="config">Optional graph configuration overrides</param>
  /// <returns>Promise resolving to the initialized Cytoscape instance</returns>
  public async initializeGraph(container: HTMLElement, config?: Partial<GraphConfig>): Promise<Core> {
    try {
      // Destroy existing instance if it exists
      if (this.cytoscapeInstance) {
        this.cytoscapeInstance.destroy();
      }

      // Merge configuration
      const currentConfig = this._graphConfig();
      const finalConfig = config ? { ...currentConfig, ...config } : currentConfig;

      // Create Cytoscape instance with performance optimizations
      const performanceConfig = this.getPerformanceConfig();
      this.cytoscapeInstance = cytoscape({
        container: container,
        style: this.getCytoscapeStyles(finalConfig),
        layout: {
          name: finalConfig.layout.type === 'force-directed' ? 'cose' : finalConfig.layout.type,
          ...finalConfig.layout.options
        },
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.1,
        textureOnViewport: performanceConfig.textureOnViewport,
        hideEdgesOnViewport: performanceConfig.hideEdgesOnViewport,
        hideLabelsOnViewport: performanceConfig.hideLabelsOnViewport,
        pixelRatio: performanceConfig.pixelRatio as any,
        autoungrabify: !finalConfig.interaction.dragEnabled,
        userZoomingEnabled: finalConfig.interaction.zoomEnabled,
        userPanningEnabled: finalConfig.interaction.panEnabled,
        boxSelectionEnabled: finalConfig.interaction.multiSelectEnabled
      });

      // Setup event handlers
      this.setupCytoscapeEventHandlers();

      // Load current graph data if available
      const graphData = this._graphData();
      if (graphData) {
        await this.updateGraph(graphData);
      }

      return this.cytoscapeInstance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during graph initialization';
      this._error.set(`Failed to initialize graph: ${errorMessage}`);
      throw error;
    }
  }

  /// <summary>
  /// Updates the Cytoscape graph with new data while preserving layout and selection.
  /// </summary>
  /// <param name="data">New graph data to display</param>
  /// <param name="preservePositions">Whether to preserve existing node positions</param>
  /// <returns>Promise resolving when the update is complete</returns>
  public async updateGraph(data: GraphData, preservePositions = true): Promise<void> {
    if (!this.cytoscapeInstance) {
      throw new Error('Graph not initialized. Call initializeGraph() first.');
    }

    try {
      // Store current positions if preserving layout
      const currentPositions = preservePositions ? this.getCurrentNodePositions() : new Map();

      // Convert data to Cytoscape format
      const elements = this.convertToCytoscapeElements(data);

      // Update graph elements
      this.cytoscapeInstance.elements().remove();
      this.cytoscapeInstance.add(elements);

      // Restore positions if preserving layout
      if (preservePositions && currentPositions.size > 0) {
        this.restoreNodePositions(currentPositions);
      } else {
        // Apply layout algorithm
        const config = this._graphConfig();
        const layout = this.cytoscapeInstance.layout({
          name: config.layout.type === 'force-directed' ? 'cose' : config.layout.type,
          ...config.layout.options
        });
        layout.run();
      }

      // Update selection state
      this.applyCytoscapeSelection();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during graph update';
      this._error.set(`Failed to update graph: ${errorMessage}`);
      throw error;
    }
  }

  /// <summary>
  /// Highlights a specific node and optionally its connected nodes/edges.
  /// </summary>
  /// <param name="nodeId">ID of the node to highlight</param>
  /// <param name="includeConnected">Whether to highlight connected nodes and edges</param>
  /// <param name="highlightClass">CSS class to apply for highlighting</param>
  public highlightNode(nodeId: number, includeConnected = true, highlightClass = 'highlighted'): void {
    if (!this.cytoscapeInstance) {
      console.warn('Graph not initialized. Cannot highlight node.');
      return;
    }

    try {
      // Clear existing highlights
      this.clearHighlights();

      const targetNode = this.cytoscapeInstance.getElementById(nodeId.toString());
      if (!targetNode || targetNode.length === 0) {
        console.warn(`Node with ID ${nodeId} not found in graph.`);
        return;
      }

      // Highlight the target node
      targetNode.addClass(highlightClass);

      if (includeConnected) {
        // Highlight connected edges and nodes
        const connectedEdges = targetNode.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes().difference(targetNode);

        connectedEdges.addClass(highlightClass);
        connectedNodes.addClass(highlightClass);
      }

      // Update visual state
      this.cytoscapeInstance.fit(targetNode, 50);

    } catch (error) {
      console.error('Error highlighting node:', error);
    }
  }

  /// <summary>
  /// Highlights the shortest path between two nodes.
  /// </summary>
  /// <param name="sourceId">ID of the source node</param>
  /// <param name="targetId">ID of the target node</param>
  /// <param name="pathClass">CSS class to apply to path elements</param>
  /// <returns>Array of node IDs in the path, empty if no path exists</returns>
  public highlightPath(sourceId: number, targetId: number, pathClass = 'path-highlighted'): number[] {
    if (!this.cytoscapeInstance) {
      console.warn('Graph not initialized. Cannot highlight path.');
      return [];
    }

    try {
      // Clear existing highlights
      this.clearHighlights();

      const sourceNode = this.cytoscapeInstance.getElementById(sourceId.toString());
      const targetNode = this.cytoscapeInstance.getElementById(targetId.toString());

      if (!sourceNode.length || !targetNode.length) {
        console.warn('Source or target node not found in graph.');
        return [];
      }

      // Find shortest path using Dijkstra algorithm
      const dijkstra = this.cytoscapeInstance.elements().dijkstra({
        root: sourceNode
      });
      const pathToTarget = dijkstra.pathTo(targetNode);

      if (pathToTarget.length === 0) {
        console.warn('No path found between nodes.');
        return [];
      }

      // Highlight path elements
      pathToTarget.addClass(pathClass);

      // Extract node IDs from path
      const pathNodeIds: number[] = [];
      pathToTarget.nodes().forEach(node => {
        const nodeId = parseInt(node.id());
        if (!isNaN(nodeId)) {
          pathNodeIds.push(nodeId);
        }
      });

      // Fit graph to show the path
      this.cytoscapeInstance.fit(pathToTarget, 50);

      return pathNodeIds;

    } catch (error) {
      console.error('Error highlighting path:', error);
      return [];
    }
  }

  /// <summary>
  /// Registers event handlers for Cytoscape graph interactions.
  /// </summary>
  /// <param name="events">Graph event configuration object</param>
  public registerGraphEvents(events: GraphEvents): void {
    if (!this.cytoscapeInstance) {
      console.warn('Graph not initialized. Cannot register events.');
      return;
    }

    try {
      // Clear existing event handlers
      this.clearCytoscapeEventHandlers();

      // Register node events
      if (events.onNodeClick) {
        const clickHandler = (evt: cytoscape.EventObject) => {
          const node = evt.target;
          const nodeData = this.convertCytoscapeNodeToGraphNode(node);
          events.onNodeClick!(nodeData, evt.originalEvent);
        };
        this.cytoscapeInstance.on('tap', 'node', clickHandler);
        this.cytoscapeCallbacks.set('nodeClick', clickHandler);
      }

      if (events.onNodeDoubleClick) {
        const doubleClickHandler = (evt: cytoscape.EventObject) => {
          const node = evt.target;
          const nodeData = this.convertCytoscapeNodeToGraphNode(node);
          events.onNodeDoubleClick!(nodeData, evt.originalEvent);
        };
        this.cytoscapeInstance.on('dbltap', 'node', doubleClickHandler);
        this.cytoscapeCallbacks.set('nodeDoubleClick', doubleClickHandler);
      }

      if (events.onNodeHover) {
        const hoverHandler = (evt: cytoscape.EventObject) => {
          const node = evt.target;
          const nodeData = this.convertCytoscapeNodeToGraphNode(node);
          events.onNodeHover!(nodeData, evt.originalEvent);
        };
        this.cytoscapeInstance.on('mouseover', 'node', hoverHandler);
        this.cytoscapeCallbacks.set('nodeHover', hoverHandler);
      }

      // Register edge events
      if (events.onEdgeClick) {
        const edgeClickHandler = (evt: cytoscape.EventObject) => {
          const edge = evt.target;
          const edgeData = this.convertCytoscapeEdgeToGraphEdge(edge);
          events.onEdgeClick!(edgeData, evt.originalEvent);
        };
        this.cytoscapeInstance.on('tap', 'edge', edgeClickHandler);
        this.cytoscapeCallbacks.set('edgeClick', edgeClickHandler);
      }

      if (events.onEdgeHover) {
        const edgeHoverHandler = (evt: cytoscape.EventObject) => {
          const edge = evt.target;
          const edgeData = this.convertCytoscapeEdgeToGraphEdge(edge);
          events.onEdgeHover!(edgeData, evt.originalEvent);
        };
        this.cytoscapeInstance.on('mouseover', 'edge', edgeHoverHandler);
        this.cytoscapeCallbacks.set('edgeHover', edgeHoverHandler);
      }

      // Register background events
      if (events.onBackgroundClick) {
        const backgroundClickHandler = (evt: cytoscape.EventObject) => {
          if (evt.target === this.cytoscapeInstance) {
            events.onBackgroundClick!(evt.originalEvent);
          }
        };
        this.cytoscapeInstance.on('tap', backgroundClickHandler);
        this.cytoscapeCallbacks.set('backgroundClick', backgroundClickHandler);
      }

      // Register zoom/pan events
      if (events.onZoom) {
        const zoomHandler = () => {
          const zoomLevel = this.cytoscapeInstance?.zoom() || 1;
          events.onZoom!(zoomLevel);
        };
        this.cytoscapeInstance.on('zoom', zoomHandler);
        this.cytoscapeCallbacks.set('zoom', zoomHandler);
      }

      if (events.onPan) {
        const panHandler = () => {
          const pan = this.cytoscapeInstance?.pan() || { x: 0, y: 0 };
          events.onPan!(pan);
        };
        this.cytoscapeInstance.on('pan', panHandler);
        this.cytoscapeCallbacks.set('pan', panHandler);
      }

      if (events.onLayoutComplete) {
        const layoutCompleteHandler = () => {
          events.onLayoutComplete!();
        };
        this.cytoscapeInstance.on('layoutstop', layoutCompleteHandler);
        this.cytoscapeCallbacks.set('layoutComplete', layoutCompleteHandler);
      }

    } catch (error) {
      console.error('Error registering graph events:', error);
    }
  }

  /// <summary>
  /// Gets the current Cytoscape instance.
  /// </summary>
  /// <returns>Current Cytoscape instance or null if not initialized</returns>
  public getCytoscapeInstance(): Core | null {
    return this.cytoscapeInstance;
  }

  /// <summary>
  /// Destroys the current Cytoscape instance and cleans up resources.
  /// </summary>
  public destroyGraph(): void {
    if (this.cytoscapeInstance) {
      this.clearCytoscapeEventHandlers();
      this.cytoscapeInstance.destroy();
      this.cytoscapeInstance = null;
    }
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
  /// Converts a Club entity to ClubDto with computed properties.
  /// </summary>
  /// <param name="club">Club entity to convert</param>
  /// <returns>ClubDto with computed properties</returns>
  private convertClubToDto(club: Club): ClubDto {
    const currentYear = new Date().getFullYear();

    return {
      id: club.id,
      name: club.name,
      city: club.city,
      league: club.league,
      foundedYear: club.foundedYear,
      stadium: club.stadium,
      website: club.website,
      logoUrl: club.logoUrl,
      description: club.description,
      isActive: club.isActive,
      latitude: club.latitude,
      longitude: club.longitude,
      contactEmail: club.contactEmail,
      contactPhone: club.contactPhone,
      age: currentYear - club.foundedYear,
      displayName: `${club.name} (${club.city})`,
      coordinates: club.latitude && club.longitude ? {
        latitude: club.latitude,
        longitude: club.longitude
      } : undefined,
      contact: club.contactEmail || club.contactPhone ? {
        email: club.contactEmail || '',
        phone: club.contactPhone || ''
      } : undefined
    };
  }

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
  /// Gets performance configuration based on current performance mode and graph size.
  /// </summary>
  private getPerformanceConfig() {
    const mode = this._performanceMode();
    const nodeCount = this._graphData()?.nodes.length || 0;

    // Auto-adjust performance mode based on node count
    let effectiveMode = mode;
    if (mode === 'standard' && nodeCount > 1000) {
      effectiveMode = 'high-performance';
    } else if (mode === 'high-performance' && nodeCount > 5000) {
      effectiveMode = 'ultra';
    }

    switch (effectiveMode) {
      case 'ultra':
        return {
          textureOnViewport: true,
          hideEdgesOnViewport: true,
          hideLabelsOnViewport: true,
          pixelRatio: 1,
          showFps: false,
          usePaths: false,
          usePolygons: false
        };
      case 'high-performance':
        return {
          textureOnViewport: true,
          hideEdgesOnViewport: nodeCount > 500,
          hideLabelsOnViewport: nodeCount > 300,
          pixelRatio: 1.5,
          showFps: false,
          usePaths: true,
          usePolygons: false
        };
      default: // 'standard'
        return {
          textureOnViewport: false,
          hideEdgesOnViewport: false,
          hideLabelsOnViewport: false,
          pixelRatio: 'auto',
          showFps: false,
          usePaths: true,
          usePolygons: true
        };
    }
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

  // Cytoscape Helper Methods

  /// <summary>
  /// Gets Cytoscape styles based on graph configuration.
  /// </summary>
  /// <summary>
  /// Get comprehensive Cytoscape styles for nodes and edges with league-specific styling and connection types
  /// </summary>
  /// <param name="config">Graph configuration</param>
  /// <returns>Cytoscape stylesheet array</returns>
  private getCytoscapeStyles(config: GraphConfig): any[] {
    return [
      // Base node style
      {
        selector: 'node',
        style: {
          'width': config.nodes.defaultSize || 60,
          'height': config.nodes.defaultSize || 60,
          'background-color': '#1976d2',
          'background-image': 'data(logoUrl)',
          'background-fit': 'cover',
          'background-clip': 'none',
          'border-width': 3,
          'border-color': '#ffffff',
          'border-opacity': 0.8,
          'label': config.nodes.showLabels ? 'data(name)' : '',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 8,
          'color': '#333333',
          'font-size': config.nodes.labelSize || '12px',
          'font-weight': 'bold',
          'text-outline-width': 2,
          'text-outline-color': '#ffffff',
          'text-outline-opacity': 0.8,
          'overlay-opacity': 0,
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': '0.3s'
        } as any
      },
      // Premier League nodes
      {
        selector: 'node[league = "Premier League"]',
        style: {
          'background-color': '#38003c',
          'border-color': '#00ff85'
        } as any
      },
      // Bundesliga nodes
      {
        selector: 'node[league = "Bundesliga"]',
        style: {
          'background-color': '#d20515',
          'border-color': '#ffcc02'
        } as any
      },
      // La Liga nodes
      {
        selector: 'node[league = "La Liga"]',
        style: {
          'background-color': '#ff6900',
          'border-color': '#ffffff'
        } as any
      },
      // Serie A nodes
      {
        selector: 'node[league = "Serie A"]',
        style: {
          'background-color': '#0066cc',
          'border-color': '#ffffff'
        } as any
      },
      // Ligue 1 nodes
      {
        selector: 'node[league = "Ligue 1"]',
        style: {
          'background-color': '#1e3a8a',
          'border-color': '#facc15'
        } as any
      },
      // Ekstraklasa nodes
      {
        selector: 'node[league = "Ekstraklasa"]',
        style: {
          'background-color': '#dc2626',
          'border-color': '#ffffff'
        } as any
      },
      // Championship nodes
      {
        selector: 'node[league = "Championship"]',
        style: {
          'background-color': '#0f172a',
          'border-color': '#94a3b8'
        } as any
      },
      // Selected node style
      {
        selector: 'node:selected',
        style: {
          'width': (config.nodes.defaultSize || 60) * 1.3,
          'height': (config.nodes.defaultSize || 60) * 1.3,
          'border-width': 5,
          'border-color': '#fbbf24',
          'background-color': '#f59e0b',
          'z-index': 999
        } as any
      },
      // Highlighted node style
      {
        selector: 'node.highlighted',
        style: {
          'width': (config.nodes.defaultSize || 60) * 1.25,
          'height': (config.nodes.defaultSize || 60) * 1.25,
          'border-width': 4,
          'border-color': '#ef4444',
          'background-color': '#dc2626',
          'z-index': 998
        } as any
      },
      // Hover state
      {
        selector: 'node:hover',
        style: {
          'width': (config.nodes.defaultSize || 60) * 1.1,
          'height': (config.nodes.defaultSize || 60) * 1.1,
          'border-width': 4,
          'border-color': '#6366f1',
          'z-index': 997
        } as any
      },
      // Faded node style
      {
        selector: 'node.faded',
        style: {
          'opacity': 0.3,
          'transition-property': 'opacity',
          'transition-duration': '0.3s'
        } as any
      },
      // Base edge style
      {
        selector: 'edge',
        style: {
          'width': 'mapData(strength, 0, 100, 2, 8)',
          'line-color': '#64748b',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': config.edges.showArrows ? 'triangle' : 'none',
          'target-arrow-size': 'mapData(strength, 0, 100, 8, 16)',
          'curve-style': config.edges.curvedEdges ? 'bezier' : 'straight',
          'control-point-step-size': 40,
          'opacity': 0.8,
          'overlay-opacity': 0,
          'label': config.edges.showLabels ? 'data(type)' : '',
          'text-rotation': 'autorotate',
          'font-size': '10px',
          'color': '#475569',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.8,
          'text-background-padding': '2px',
          'text-border-width': 1,
          'text-border-color': '#e2e8f0',
          'transition-property': 'line-color, width, opacity',
          'transition-duration': '0.3s'
        } as any
      },
      // Transfer connection edges
      {
        selector: 'edge[type = "transfer"]',
        style: {
          'line-color': '#059669',
          'target-arrow-color': '#059669',
          'line-style': 'solid'
        } as any
      },
      // Loan connection edges
      {
        selector: 'edge[type = "loan"]',
        style: {
          'line-color': '#7c3aed',
          'target-arrow-color': '#7c3aed',
          'line-style': 'dashed'
        } as any
      },
      // Partnership connection edges
      {
        selector: 'edge[type = "partnership"]',
        style: {
          'line-color': '#dc2626',
          'target-arrow-color': '#dc2626',
          'line-style': 'dotted'
        } as any
      },
      // Youth development connection edges
      {
        selector: 'edge[type = "youth_development"]',
        style: {
          'line-color': '#2563eb',
          'target-arrow-color': '#2563eb',
          'line-style': 'solid',
          'line-dash-pattern': [5, 5]
        } as any
      },
      // Management connection edges
      {
        selector: 'edge[type = "management"]',
        style: {
          'line-color': '#ea580c',
          'target-arrow-color': '#ea580c',
          'line-style': 'solid'
        } as any
      },
      // Rivalry edges (legacy support)
      {
        selector: 'edge[type = "rivalry"]',
        style: {
          'line-color': '#dc2626',
          'target-arrow-color': '#dc2626',
          'line-style': 'solid'
        } as any
      },
      // Friendly edges (legacy support)
      {
        selector: 'edge[type = "friendly"]',
        style: {
          'line-color': '#059669',
          'target-arrow-color': '#059669',
          'line-style': 'solid'
        } as any
      },
      // Geographic edges (legacy support)
      {
        selector: 'edge[type = "geographic"]',
        style: {
          'line-color': '#2563eb',
          'target-arrow-color': '#2563eb',
          'line-style': 'solid'
        } as any
      },
      // Business edges (legacy support)
      {
        selector: 'edge[type = "business"]',
        style: {
          'line-color': '#ea580c',
          'target-arrow-color': '#ea580c',
          'line-style': 'solid'
        } as any
      },
      // Player transfer edges (legacy support)
      {
        selector: 'edge[type = "player_transfer"]',
        style: {
          'line-color': '#7c3aed',
          'target-arrow-color': '#7c3aed',
          'line-style': 'dashed'
        } as any
      },
      // Historical edges (legacy support)
      {
        selector: 'edge[type = "historical"]',
        style: {
          'line-color': '#78716c',
          'target-arrow-color': '#78716c',
          'line-style': 'dotted'
        } as any
      },
      // Selected edge style
      {
        selector: 'edge:selected',
        style: {
          'width': 'mapData(strength, 0, 100, 4, 12)',
          'line-color': '#fbbf24',
          'target-arrow-color': '#fbbf24',
          'z-index': 999
        } as any
      },
      // Highlighted edge style
      {
        selector: 'edge.highlighted',
        style: {
          'width': 'mapData(strength, 0, 100, 3, 10)',
          'line-color': '#ef4444',
          'target-arrow-color': '#ef4444',
          'z-index': 998
        } as any
      },
      // Path edge style
      {
        selector: 'edge.path',
        style: {
          'width': 6,
          'line-color': '#10b981',
          'target-arrow-color': '#10b981',
          'z-index': 997,
          'opacity': 1
        } as any
      },
      // Hover edge style
      {
        selector: 'edge:hover',
        style: {
          'width': 'mapData(strength, 0, 100, 3, 9)',
          'line-color': '#6366f1',
          'target-arrow-color': '#6366f1',
          'z-index': 996
        } as any
      },
      // Faded edge style
      {
        selector: 'edge.faded',
        style: {
          'opacity': 0.2,
          'transition-property': 'opacity',
          'transition-duration': '0.3s'
        } as any
      },
      // Hidden node style (for viewport culling)
      {
        selector: 'node.hidden',
        style: {
          'display': 'none'
        } as any
      },
      // Hidden edge style (for viewport culling)
      {
        selector: 'edge.hidden',
        style: {
          'display': 'none'
        } as any
      }
    ];
  }

  /// <summary>
  /// Sets up default Cytoscape event handlers.
  /// </summary>
  private setupCytoscapeEventHandlers(): void {
    if (!this.cytoscapeInstance) return;

    // Basic selection handling
    this.cytoscapeInstance.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = parseInt(node.id());
      if (!isNaN(nodeId)) {
        this.updateSelection([nodeId], []);
      }
    });

    // Clear selection on background click
    this.cytoscapeInstance.on('tap', (evt) => {
      if (evt.target === this.cytoscapeInstance) {
        this.updateSelection([], []);
      }
    });

    // Add hover classes
    this.cytoscapeInstance.on('mouseover', 'node', (evt) => {
      evt.target.addClass('hovered');
    });

    this.cytoscapeInstance.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hovered');
    });

    this.cytoscapeInstance.on('mouseover', 'edge', (evt) => {
      evt.target.addClass('hovered');
    });

    this.cytoscapeInstance.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hovered');
    });

    // Performance optimization event handlers
    this.setupPerformanceEventHandlers();
  }

  /// <summary>
  /// Sets up performance optimization event handlers for viewport culling and memory management.
  /// </summary>
  private setupPerformanceEventHandlers(): void {
    if (!this.cytoscapeInstance) return;

    // Viewport change handlers for culling
    this.cytoscapeInstance.on('viewport', () => {
      if (this._viewportCulling() && this.shouldUpdateCulling()) {
        this.updateViewportCulling();
      }
    });

    // Zoom handlers for performance mode switching
    this.cytoscapeInstance.on('zoom', () => {
      this.updatePerformanceMetrics();
      if (this._viewportCulling()) {
        this.throttledUpdateViewportCulling();
      }
    });

    // Pan handlers for viewport culling
    this.cytoscapeInstance.on('pan', () => {
      if (this._viewportCulling()) {
        this.throttledUpdateViewportCulling();
      }
    });

    // Layout completion handler for performance optimization
    this.cytoscapeInstance.on('layoutstop', () => {
      this.updatePerformanceMetrics();
      if (this.shouldEnableViewportCulling()) {
        this.enableViewportCulling();
      }
    });

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /// <summary>
  /// Gets current node positions from Cytoscape instance.
  /// </summary>
  /// <returns>Map of node ID to position</returns>
  private getCurrentNodePositions(): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.nodes().forEach(node => {
        const position = node.position();
        positions.set(node.id(), { x: position.x, y: position.y });
      });
    }

    return positions;
  }

  /// <summary>
  /// Converts graph data to Cytoscape elements format.
  /// </summary>
  /// <param name="data">Graph data to convert</param>
  /// <returns>Array of Cytoscape elements</returns>
  private convertToCytoscapeElements(data: GraphData): ElementDefinition[] {
    const elements: ElementDefinition[] = [];

    // Add nodes
    data.nodes.forEach(node => {
      elements.push({
        group: 'nodes',
        data: {
          id: node.id.toString(),
          label: node.label,
          logoUrl: node.data.logoUrl || '',
          originalNode: node,
          name: node.data.name,
          city: node.data.city,
          league: node.data.league,
          foundedYear: node.data.foundedYear,
          stadium: node.data.stadium,
          website: node.data.website,
          description: node.data.description,
          isActive: node.data.isActive,
          latitude: node.data.latitude,
          longitude: node.data.longitude
        },
        position: node.position,
        classes: this.getNodeClasses(node)
      });
    });

    // Add edges
    data.edges.forEach(edge => {
      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source.toString(),
          target: edge.target.toString(),
          label: edge.label || `${edge.type} (${edge.strength})`,
          type: edge.type,
          strength: edge.strength,
          weight: edge.weight,
          originalEdge: edge
        },
        classes: this.getEdgeClasses(edge)
      });
    });

    return elements;
  }

  /// <summary>
  /// Restores node positions in Cytoscape instance.
  /// </summary>
  /// <param name="positions">Map of node ID to position</param>
  private restoreNodePositions(positions: Map<string, { x: number; y: number }>): void {
    if (!this.cytoscapeInstance) return;

    this.cytoscapeInstance.nodes().forEach(node => {
      const position = positions.get(node.id());
      if (position) {
        node.position(position);
      }
    });
  }

  /// <summary>
  /// Applies current selection state to Cytoscape elements.
  /// </summary>
  private applyCytoscapeSelection(): void {
    if (!this.cytoscapeInstance) return;

    // Clear existing selection classes
    this.cytoscapeInstance.elements().removeClass('selected');

    // Apply node selection
    const selectedNodes = this._selectedNodes();
    selectedNodes.forEach(nodeId => {
      const node = this.cytoscapeInstance!.getElementById(nodeId.toString());
      if (node.length > 0) {
        node.addClass('selected');
      }
    });

    // Apply edge selection
    const selectedEdges = this._selectedEdges();
    selectedEdges.forEach(edgeId => {
      const edge = this.cytoscapeInstance!.getElementById(edgeId);
      if (edge.length > 0) {
        edge.addClass('selected');
      }
    });
  }

  /// <summary>
  /// Clears all highlight classes from graph elements.
  /// </summary>
  private clearHighlights(): void {
    if (!this.cytoscapeInstance) return;

    this.cytoscapeInstance.elements().removeClass('highlighted path-highlighted');
  }

  /// <summary>
  /// Clears all registered Cytoscape event handlers.
  /// </summary>
  private clearCytoscapeEventHandlers(): void {
    if (!this.cytoscapeInstance) return;

    // Remove all custom event handlers
    this.cytoscapeCallbacks.forEach((callback, eventName) => {
      // Cytoscape doesn't provide a direct way to remove specific handlers
      // so we'll rely on the callback tracking
    });

    this.cytoscapeCallbacks.clear();

    // Remove all event handlers (this will remove built-in ones too, so be careful)
    // this.cytoscapeInstance.removeAllListeners();
  }

  /// <summary>
  /// Converts Cytoscape node to GraphNode format.
  /// </summary>
  /// <param name="cytoscapeNode">Cytoscape node element</param>
  /// <returns>GraphNode representation</returns>
  private convertCytoscapeNodeToGraphNode(cytoscapeNode: NodeSingular): GraphNode {
    const data = cytoscapeNode.data();
    const position = cytoscapeNode.position();

    return {
      id: parseInt(cytoscapeNode.id()),
      label: data.label || data.name || '',
      data: data.originalNode?.data || data,
      position: { x: position.x, y: position.y },
      isSelected: cytoscapeNode.hasClass('selected'),
      isHighlighted: cytoscapeNode.hasClass('highlighted'),
      isHidden: cytoscapeNode.hasClass('hidden')
    };
  }

  /// <summary>
  /// Converts Cytoscape edge to GraphEdge format.
  /// </summary>
  /// <param name="cytoscapeEdge">Cytoscape edge element</param>
  /// <returns>GraphEdge representation</returns>
  private convertCytoscapeEdgeToGraphEdge(cytoscapeEdge: EdgeSingular): GraphEdge {
    const data = cytoscapeEdge.data();

    return {
      id: cytoscapeEdge.id(),
      source: parseInt(data.source),
      target: parseInt(data.target),
      type: data.type,
      strength: data.strength,
      weight: data.weight || 1,
      label: data.label || '',
      isActive: data.isActive !== false
    };
  }

  /// <summary>
  /// Gets CSS classes for a graph node.
  /// </summary>
  /// <param name="node">Graph node</param>
  /// <returns>Space-separated CSS classes</returns>
  private getNodeClasses(node: GraphNode): string {
    const classes = ['node'];

    if (node.isSelected) classes.push('selected');
    if (node.isHighlighted) classes.push('highlighted');
    if (node.isHidden) classes.push('hidden');

    // Add league-based class
    if (node.data.league) {
      const leagueClass = node.data.league.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      classes.push(`league-${leagueClass}`);
    }

    return classes.join(' ');
  }

  /// <summary>
  /// Gets CSS classes for a graph edge.
  /// </summary>
  /// <param name="edge">Graph edge</param>
  /// <returns>Space-separated CSS classes</returns>
  private getEdgeClasses(edge: GraphEdge): string {
    const classes = ['edge'];

    // Add type-based class
    classes.push(`type-${edge.type.replace(/_/g, '-')}`);

    // Add strength-based class
    classes.push(`strength-${edge.strength.replace(/_/g, '-')}`);

    if (!edge.isActive) classes.push('inactive');

    return classes.join(' ');
  }

  /// <summary>
  /// Applies a specific layout to the current Cytoscape instance with optimized configurations.
  /// </summary>
  /// <param name="layoutType">The type of layout to apply</param>
  /// <param name="animate">Whether to animate the layout transition</param>
  /// <returns>Promise that resolves when layout is complete</returns>
  public applyLayout(layoutType: GraphLayoutType, animate: boolean = true): Promise<void> {
    if (!this.cytoscapeInstance) {
      return Promise.reject(new Error('Cytoscape instance not initialized'));
    }

    return new Promise((resolve, reject) => {
      try {
        let layoutConfig: any;

        switch (layoutType) {
          case 'circular':
            layoutConfig = {
              name: 'circle',
              animate: animate,
              animationDuration: 1000,
              animationEasing: 'ease-out',
              radius: 200,
              startAngle: Math.PI / 2,
              clockwise: true,
              spacing: 50
            };
            break;

          case 'grid':
            layoutConfig = {
              name: 'grid',
              animate: animate,
              animationDuration: 1000,
              animationEasing: 'ease-out',
              rows: undefined, // Auto-calculate
              cols: undefined, // Auto-calculate
              position: (node: any) => {
                // Position nodes based on league for better organization
                const league = node.data('league');
                return { row: this.getLeagueGridRow(league), col: undefined };
              },
              sort: (a: any, b: any) => {
                // Sort by league first, then by name
                const leagueA = a.data('league');
                const leagueB = b.data('league');
                if (leagueA !== leagueB) {
                  return leagueA.localeCompare(leagueB);
                }
                return a.data('name').localeCompare(b.data('name'));
              },
              condense: true,
              avoidOverlap: true,
              avoidOverlapPadding: 20
            };
            break;

          case 'force-directed':
            layoutConfig = {
              name: 'cose',
              animate: animate,
              animationDuration: 2000,
              animationEasing: 'ease-out',
              // Physics simulation parameters
              nodeRepulsion: 8000,
              nodeOverlap: 20,
              idealEdgeLength: 80,
              edgeElasticity: 200,
              nestingFactor: 0.1,
              gravity: 0.25,
              numIter: 1000,
              initialTemp: 200,
              coolingFactor: 0.95,
              minTemp: 1.0,
              // Quality vs speed trade-off
              randomize: false,
              componentSpacing: 40,
              refresh: 20,
              fit: true,
              padding: 50,
              // Use league information for better clustering
              nodeDimensionsIncludeLabels: true,
              // Enhanced separation based on connection strength
              edgeLength: (edge: any) => {
                const strength = edge.data('strength') || 50;
                return Math.max(50, 150 - strength);
              }
            };
            break;

          case 'hierarchical':
            layoutConfig = {
              name: 'breadthfirst',
              animate: animate,
              animationDuration: 1500,
              animationEasing: 'ease-out',
              directed: true,
              padding: 30,
              circle: false,
              grid: false,
              spacingFactor: 1.75,
              avoidOverlap: true,
              maximal: false
            };
            break;

          case 'dagre':
            layoutConfig = {
              name: 'dagre',
              animate: animate,
              animationDuration: 1500,
              animationEasing: 'ease-out',
              // Hierarchical layout parameters
              rankDir: 'TB', // Top to bottom
              align: 'UL', // Upper left alignment
              rankerAlgorithm: 'network-simplex', // Best quality ranking
              nodeSep: 50, // Separation between nodes on same level
              edgeSep: 10, // Separation between edges
              rankSep: 100, // Separation between levels
              fit: true,
              padding: 30
            };
            break;

          case 'concentric':
            layoutConfig = {
              name: 'concentric',
              animate: animate,
              animationDuration: 1500,
              animationEasing: 'ease-out',
              // Concentric layout parameters
              concentric: (node: any) => {
                // Group by league with higher prestige leagues in center
                const league = node.data('league');
                return this.getLeaguePrestige(league);
              },
              levelWidth: () => 1, // Uniform level widths
              minNodeSpacing: 50,
              padding: 50,
              startAngle: Math.PI / 2,
              clockwise: true,
              equidistant: false
            };
            break;

          case 'breadthfirst':
            layoutConfig = {
              name: 'breadthfirst',
              animate: animate,
              animationDuration: 1500,
              animationEasing: 'ease-out',
              directed: false,
              padding: 30,
              circle: true,
              grid: false,
              spacingFactor: 2,
              avoidOverlap: true,
              roots: undefined // Let Cytoscape choose
            };
            break;

          case 'cola':
            layoutConfig = {
              name: 'cola',
              animate: animate,
              animationDuration: 2000,
              animationEasing: 'ease-out',
              refresh: 1,
              maxSimulationTime: 4000,
              ungrabifyWhileSimulating: false,
              fit: true,
              padding: 30,
              boundingBox: undefined,
              edgeLength: 80,
              avoidOverlap: true,
              handleDisconnected: true,
              convergenceThreshold: 0.01,
              nodeSpacing: (node: any) => 20,
              flow: undefined,
              alignment: undefined,
              gapInequalities: undefined
            };
            break;

          default:
            layoutConfig = {
              name: 'random',
              animate: animate,
              animationDuration: 500,
              fit: true,
              padding: 50
            };
        }

        const layout = this.cytoscapeInstance!.layout(layoutConfig);

        layout.on('layoutstop', () => {
          resolve();
        });

        layout.run();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /// <summary>
  /// Gets the grid row for a league in grid layout.
  /// </summary>
  /// <param name="league">League name</param>
  /// <returns>Grid row number</returns>
  private getLeagueGridRow(league: string): number {
    const leagueOrder = [
      'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
      'Ekstraklasa', 'Championship', 'Other'
    ];
    const index = leagueOrder.indexOf(league);
    return index >= 0 ? index : leagueOrder.length - 1;
  }

  /// <summary>
  /// Gets the hierarchical rank for a league.
  /// </summary>
  /// <param name="league">League name</param>
  /// <returns>Rank value (higher = more important)</returns>
  private getLeagueRank(league: string): number {
    const ranks: { [key: string]: number } = {
      'Premier League': 10,
      'La Liga': 9,
      'Bundesliga': 8,
      'Serie A': 7,
      'Ligue 1': 6,
      'Ekstraklasa': 5,
      'Championship': 4
    };
    return ranks[league] || 1;
  }

  /// <summary>
  /// Gets the prestige level for a league for concentric layout.
  /// </summary>
  /// <param name="league">League name</param>
  /// <returns>Prestige value (higher = center position)</returns>
  private getLeaguePrestige(league: string): number {
    return this.getLeagueRank(league);
  }

  // =================== VISUAL FEATURES ===================

  /// <summary>
  /// Loads and caches club logos for use as node backgrounds.
  /// </summary>
  /// <param name="clubs">Array of clubs to load logos for</param>
  /// <returns>Promise that resolves when all logos are loaded</returns>
  public async loadClubLogos(clubs: GraphNode[]): Promise<void> {
    const logoPromises = clubs.map(async (club) => {
      if (club.data.logoUrl) {
        try {
          // Create a new image element to preload the logo
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Enable CORS for external images

          return new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Convert image to data URL for Cytoscape compatibility
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (ctx) {
                canvas.width = 64; // Standard logo size
                canvas.height = 64;

                // Draw image with circular clipping
                ctx.beginPath();
                ctx.arc(32, 32, 30, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.clip();

                // Fill background with league-based color
                ctx.fillStyle = this.getLeagueColor(club.data.league);
                ctx.fillRect(0, 0, 64, 64);

                // Draw the logo
                ctx.drawImage(img, 2, 2, 60, 60);

                // Update the club's logo data
                (club.data as any).logoDataUrl = canvas.toDataURL('image/png');
              }
              resolve();
            };

            img.onerror = () => {
              console.warn(`Failed to load logo for ${club.data.name}: ${club.data.logoUrl}`);
              // Create a fallback logo with club initials
              this.createFallbackLogo(club);
              resolve();
            };

            img.src = club.data.logoUrl!;
          });
        } catch (error) {
          console.warn(`Error processing logo for ${club.data.name}:`, error);
          this.createFallbackLogo(club);
        }
      } else {
        // Create fallback logo for clubs without logoUrl
        this.createFallbackLogo(club);
      }
    });

    await Promise.all(logoPromises);
  }

  /// <summary>
  /// Creates a fallback logo with club initials and colors.
  /// </summary>
  /// <param name="club">Club to create fallback logo for</param>
  private createFallbackLogo(club: GraphNode): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = 64;
      canvas.height = 64;

      // Background circle
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, 2 * Math.PI);
      ctx.fillStyle = this.getLeagueColor(club.data.league);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Club initials
      const initials = this.getClubInitials(club.data.name);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, 32, 32);

      (club.data as any).logoDataUrl = canvas.toDataURL('image/png');
    }
  }

  /// <summary>
  /// Gets club initials from club name.
  /// </summary>
  /// <param name="clubName">Full club name</param>
  /// <returns>Club initials (2-3 characters)</returns>
  private getClubInitials(clubName: string): string {
    const words = clubName.split(' ').filter(word => word.length > 2);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    }
    return clubName.substring(0, 2).toUpperCase();
  }

  /// <summary>
  /// Gets primary color for a league.
  /// </summary>
  /// <param name="league">League name</param>
  /// <returns>Hex color code</returns>
  private getLeagueColor(league: string): string {
    const colors: { [key: string]: string } = {
      'Premier League': '#38003c',
      'La Liga': '#ff6900',
      'Bundesliga': '#d20515',
      'Serie A': '#0066cc',
      'Ligue 1': '#1e3a8a',
      'Ekstraklasa': '#dc2626',
      'Championship': '#0f172a'
    };
    return colors[league] || '#1976d2';
  }

  /// <summary>
  /// Adds advanced hover effects with information tooltips.
  /// </summary>
  /// <param name="enable">Whether to enable hover effects</param>
  public enableHoverEffects(enable: boolean = true): void {
    if (!this.cytoscapeInstance || !enable) return;

    // Node hover effects
    this.cytoscapeInstance.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();

      // Highlight connected nodes and edges
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes().not(node);

      // Fade non-connected elements
      this.cytoscapeInstance!.elements().addClass('faded');
      node.removeClass('faded').addClass('highlighted');
      connectedNodes.removeClass('faded').addClass('connected');
      connectedEdges.removeClass('faded').addClass('highlighted');

      // Create and show tooltip
      this.showNodeTooltip(evt.originalEvent, nodeData);
    });

    this.cytoscapeInstance.on('mouseout', 'node', () => {
      // Remove all highlighting
      this.cytoscapeInstance!.elements().removeClass('faded highlighted connected');
      this.hideTooltip();
    });

    // Edge hover effects
    this.cytoscapeInstance.on('mouseover', 'edge', (evt) => {
      const edge = evt.target;
      const edgeData = edge.data();

      // Highlight connected nodes
      const sourceNode = edge.source();
      const targetNode = edge.target();

      this.cytoscapeInstance!.elements().addClass('faded');
      edge.removeClass('faded').addClass('highlighted');
      sourceNode.removeClass('faded').addClass('connected');
      targetNode.removeClass('faded').addClass('connected');

      // Show edge tooltip
      this.showEdgeTooltip(evt.originalEvent, edgeData);
    });

    this.cytoscapeInstance.on('mouseout', 'edge', () => {
      this.cytoscapeInstance!.elements().removeClass('faded highlighted connected');
      this.hideTooltip();
    });
  }

  /// <summary>
  /// Shows a tooltip with node information.
  /// </summary>
  /// <param name="event">Mouse event</param>
  /// <param name="nodeData">Node data</param>
  private showNodeTooltip(event: Event, nodeData: any): void {
    const tooltip = this.getOrCreateTooltip();
    const mouseEvent = event as MouseEvent;

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <img src="${nodeData.originalNode?.logoDataUrl || ''}" alt="${nodeData.name}" class="tooltip-logo">
        <h3>${nodeData.name}</h3>
      </div>
      <div class="tooltip-content">
        <p><strong>League:</strong> ${nodeData.league}</p>
        <p><strong>Country:</strong> ${nodeData.country}</p>
        <p><strong>Founded:</strong> ${nodeData.foundedYear || 'Unknown'}</p>
        <p><strong>Connections:</strong> ${nodeData.connectionCount || 0}</p>
        ${nodeData.stadium ? `<p><strong>Stadium:</strong> ${nodeData.stadium}</p>` : ''}
      </div>
    `;

    this.positionTooltip(tooltip, mouseEvent);
  }

  /// <summary>
  /// Shows a tooltip with edge information.
  /// </summary>
  /// <param name="event">Mouse event</param>
  /// <param name="edgeData">Edge data</param>
  private showEdgeTooltip(event: Event, edgeData: any): void {
    const tooltip = this.getOrCreateTooltip();
    const mouseEvent = event as MouseEvent;

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <h3>${edgeData.type.replace('_', ' ')}</h3>
      </div>
      <div class="tooltip-content">
        <p><strong>Strength:</strong> ${edgeData.strength}/100</p>
        <p><strong>Type:</strong> ${edgeData.type.replace('_', ' ')}</p>
        ${edgeData.description ? `<p><strong>Details:</strong> ${edgeData.description}</p>` : ''}
        ${edgeData.year ? `<p><strong>Year:</strong> ${edgeData.year}</p>` : ''}
      </div>
    `;

    this.positionTooltip(tooltip, mouseEvent);
  }

  /// <summary>
  /// Gets or creates the tooltip element.
  /// </summary>
  /// <returns>Tooltip DOM element</returns>
  private getOrCreateTooltip(): HTMLElement {
    let tooltip = document.getElementById('graph-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'graph-tooltip';
      tooltip.className = 'graph-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(tooltip);

      // Add CSS for tooltip content
      const style = document.createElement('style');
      style.textContent = `
        .graph-tooltip .tooltip-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .graph-tooltip .tooltip-logo {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          border-radius: 12px;
        }
        .graph-tooltip h3 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .graph-tooltip .tooltip-content p {
          margin: 4px 0;
          font-size: 13px;
        }
      `;
      document.head.appendChild(style);
    }
    return tooltip;
  }

  /// <summary>
  /// Positions the tooltip near the mouse cursor.
  /// </summary>
  /// <param name="tooltip">Tooltip element</param>
  /// <param name="event">Mouse event</param>
  private positionTooltip(tooltip: HTMLElement, event: MouseEvent): void {
    tooltip.style.opacity = '1';
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY - 10}px`;

    // Adjust position if tooltip goes off screen
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${event.clientX - rect.width - 15}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${event.clientY - rect.height + 10}px`;
    }
  }

  /// <summary>
  /// Hides the tooltip.
  /// </summary>
  private hideTooltip(): void {
    const tooltip = document.getElementById('graph-tooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  }

  /// <summary>
  /// Enables smooth animations for graph interactions.
  /// </summary>
  /// <param name="enable">Whether to enable animations</param>
  public enableAnimations(enable: boolean = true): void {
    if (!this.cytoscapeInstance) return;

    if (enable) {
      // Add smooth transitions for node movements
      this.cytoscapeInstance.style()
        .selector('node')
        .style({
          'transition-property': 'background-color, border-color, width, height, opacity',
          'transition-duration': 300,
          'transition-timing-function': 'ease-out'
        } as any)
        .selector('edge')
        .style({
          'transition-property': 'line-color, width, opacity',
          'transition-duration': 300,
          'transition-timing-function': 'ease-out'
        } as any)
        .update();
    } else {
      // Remove transitions
      this.cytoscapeInstance.style()
        .selector('node, edge')
        .style({
          'transition-property': 'none'
        })
        .update();
    }
  }

  /// <summary>
  /// Configures enhanced zoom and pan controls with boundaries.
  /// </summary>
  /// <param name="options">Zoom and pan configuration options</param>
  public configureZoomPan(options: {
    minZoom?: number;
    maxZoom?: number;
    zoomSensitivity?: number;
    wheelSensitivity?: number;
    panningEnabled?: boolean;
    userPanningEnabled?: boolean;
    boxSelectionEnabled?: boolean;
    autoungrabifyNodes?: boolean;
  } = {}): void {
    if (!this.cytoscapeInstance) return;

    const config = {
      minZoom: options.minZoom || 0.1,
      maxZoom: options.maxZoom || 3.0,
      zoomSensitivity: options.zoomSensitivity || 0.1,
      wheelSensitivity: options.wheelSensitivity || 1,
      panningEnabled: options.panningEnabled ?? true,
      userPanningEnabled: options.userPanningEnabled ?? true,
      boxSelectionEnabled: options.boxSelectionEnabled ?? true,
      autoungrabifyNodes: options.autoungrabifyNodes ?? false
    };

    // Apply zoom and pan settings
    this.cytoscapeInstance.minZoom(config.minZoom);
    this.cytoscapeInstance.maxZoom(config.maxZoom);
    this.cytoscapeInstance.userPanningEnabled(config.userPanningEnabled);
    this.cytoscapeInstance.boxSelectionEnabled(config.boxSelectionEnabled);
    this.cytoscapeInstance.autoungrabify(config.autoungrabifyNodes);

    // Add smooth zoom animation
    this.cytoscapeInstance.on('zoom', () => {
      const zoom = this.cytoscapeInstance!.zoom();

      // Adjust node sizes based on zoom level
      const baseSize = this._graphConfig().nodes.defaultSize || 60;
      const adjustedSize = Math.max(baseSize * (0.5 + zoom * 0.5), 20);

      this.cytoscapeInstance!.style()
        .selector('node')
        .style({
          'width': adjustedSize,
          'height': adjustedSize,
          'font-size': Math.max(12 * zoom, 8)
        })
        .update();
    });

    // Add pan boundary checking
    this.cytoscapeInstance.on('pan', () => {
      const pan = this.cytoscapeInstance!.pan();
      const zoom = this.cytoscapeInstance!.zoom();
      const extent = this.cytoscapeInstance!.extent();

      // Calculate boundaries
      const maxPanX = extent.w * zoom * 0.1;
      const maxPanY = extent.h * zoom * 0.1;

      let adjustedPan = { ...pan };
      let needsAdjustment = false;

      if (Math.abs(pan.x) > maxPanX) {
        adjustedPan.x = Math.sign(pan.x) * maxPanX;
        needsAdjustment = true;
      }

      if (Math.abs(pan.y) > maxPanY) {
        adjustedPan.y = Math.sign(pan.y) * maxPanY;
        needsAdjustment = true;
      }

      if (needsAdjustment) {
        this.cytoscapeInstance!.pan(adjustedPan);
      }
    });
  }

  // =================== EXPORT FUNCTIONALITY ===================

  /// <summary>
  /// Exports the graph in the specified format with custom options.
  /// </summary>
  /// <param name="options">Export configuration options</param>
  /// <returns>Promise that resolves with export data or downloads file</returns>
  public async exportGraph(options: GraphExportOptions): Promise<string | Blob | void> {
    if (!this.cytoscapeInstance) {
      throw new Error('Graph not initialized');
    }

    try {
      switch (options.format) {
        case 'png':
          return await this.exportAsPNG(options);
        case 'svg':
          return await this.exportAsSVG(options);
        case 'json':
          return await this.exportAsJSON(options);
        case 'pdf':
          return await this.exportAsPDF(options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /// <summary>
  /// Exports graph as PNG image.
  /// </summary>
  /// <param name="options">Export options</param>
  /// <returns>Promise that resolves with PNG blob or downloads file</returns>
  private async exportAsPNG(options: GraphExportOptions): Promise<Blob | void> {
    const exportOptions = {
      output: 'blob' as const,
      bg: options.backgroundColor || '#ffffff',
      full: true,
      scale: 2,
      maxWidth: options.width || 4096,
      maxHeight: options.height || 4096
    };

    const blob = this.cytoscapeInstance!.png(exportOptions);

    const filename = `graph.png`;
    this.downloadFile(blob, filename, 'image/png');
  }

  /// <summary>
  /// Exports graph as SVG vector image.
  /// </summary>
  /// <param name="options">Export options</param>
  /// <returns>Promise that resolves with SVG string or downloads file</returns>
  private async exportAsSVG(options: GraphExportOptions): Promise<string | void> {
    // SVG export is not directly available in Cytoscape.js core
    // For now, we'll export as PNG and convert or use a different approach
    console.warn('SVG export not directly supported. Using PNG instead.');
    await this.exportAsPNG(options);
  }

  /// <summary>
  /// Exports graph data as JSON.
  /// </summary>
  /// <param name="options">Export options</param>
  /// <returns>Promise that resolves with JSON string or downloads file</returns>
  private async exportAsJSON(options: GraphExportOptions): Promise<string | void> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportOptions: options,
        graphConfig: this._graphConfig(),
        nodeCount: this.cytoscapeInstance!.nodes().length,
        edgeCount: this.cytoscapeInstance!.edges().length
      },
      elements: options.includePositions ? this.cytoscapeInstance!.json().elements : undefined,
      style: options.includeStyles ? (this.cytoscapeInstance!.json() as any)['style'] : undefined,
      layout: {
        name: 'preset',
        positions: this.getNodePositions()
      },
      graphData: options.includeData ? this._graphData() : undefined
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    this.downloadFile(blob, 'graph.json', 'application/json');
  }

  /// <summary>
  /// Exports graph as PDF (requires additional canvas processing).
  /// </summary>
  /// <param name="options">Export options</param>
  /// <returns>Promise that resolves with PDF blob or downloads file</returns>
  private async exportAsPDF(options: GraphExportOptions): Promise<Blob | void> {
    // First export as PNG with high quality
    const pngBlob = await this.exportAsPNG({
      ...options,
      format: 'png'
    }) as Blob;

    // For now, just download the PNG with PDF extension
    // In production, you would use a PDF library like jsPDF
    this.downloadFile(pngBlob, 'graph.pdf', 'application/pdf');
  }

  /// <summary>
  /// Gets current node positions for layout preservation.
  /// </summary>
  /// <returns>Map of node ID to position</returns>
  private getNodePositions(): { [nodeId: string]: { x: number; y: number } } {
    const positions: { [nodeId: string]: { x: number; y: number } } = {};

    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.nodes().forEach(node => {
        const position = node.position();
        positions[node.id()] = { x: position.x, y: position.y };
      });
    }

    return positions;
  }

  /// <summary>
  /// Downloads a file using the browser's download mechanism.
  /// </summary>
  /// <param name="blob">File blob to download</param>
  /// <param name="filename">Suggested filename</param>
  /// <param name="mimeType">MIME type of the file</param>
  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /// <summary>
  /// Exports graph with custom styling and branding.
  /// </summary>
  /// <param name="options">Export options with branding</param>
  /// <returns>Promise that resolves when export is complete</returns>
  public async exportWithBranding(options: GraphExportOptions & {
    title?: string;
    subtitle?: string;
    watermark?: string;
    brandingColor?: string;
  }): Promise<void> {
    if (!this.cytoscapeInstance) return;

    try {
      // Add title overlay if specified
      if (options.title || options.subtitle) {
        this.addBrandingOverlay(options);
      }

      // Export with branding
      await this.exportGraph(options);

    } finally {
      // Restore original styling
      this.removeBrandingOverlay();
    }
  }

  /// <summary>
  /// Adds temporary branding overlay to the graph.
  /// </summary>
  /// <param name="options">Branding options</param>
  private addBrandingOverlay(options: { title?: string; subtitle?: string; brandingColor?: string }): void {
    // Implementation would add temporary DOM elements for branding
    // This is a placeholder for the branding functionality
    console.log('Adding branding overlay:', options);
  }

  /// <summary>
  /// Removes temporary branding overlay.
  /// </summary>
  private removeBrandingOverlay(): void {
    // Remove temporary branding elements
    console.log('Removing branding overlay');
  }

  // ===============================
  // PERFORMANCE OPTIMIZATION METHODS
  // ===============================

  /// <summary>
  /// Sets the performance mode for the graph visualization.
  /// </summary>
  public setPerformanceMode(mode: 'standard' | 'high-performance' | 'ultra'): void {
    this._performanceMode.set(mode);
    this.updatePerformanceSettings();
  }

  /// <summary>
  /// Enables or disables viewport culling.
  /// </summary>
  public setViewportCulling(enabled: boolean): void {
    this._viewportCulling.set(enabled);
    if (enabled && this.shouldEnableViewportCulling()) {
      this.enableViewportCulling();
    } else {
      this.disableViewportCulling();
    }
  }

  /// <summary>
  /// Enables or disables lazy loading.
  /// </summary>
  public setLazyLoading(enabled: boolean): void {
    this._lazyLoading.set(enabled);
    if (enabled) {
      this.initializeLazyLoading();
    }
  }

  /// <summary>
  /// Sets the maximum number of visible nodes.
  /// </summary>
  public setMaxVisibleNodes(maxNodes: number): void {
    this._maxVisibleNodes.set(maxNodes);
    if (this._viewportCulling()) {
      this.updateViewportCulling();
    }
  }

  /// <summary>
  /// Determines if viewport culling should be enabled based on current graph size.
  /// </summary>
  private shouldEnableViewportCulling(): boolean {
    const nodeCount = this._graphData()?.nodes.length || 0;
    return nodeCount > this.cullingThreshold;
  }

  /// <summary>
  /// Determines if viewport culling should be updated based on timing.
  /// </summary>
  private shouldUpdateCulling(): boolean {
    const now = Date.now();
    if (now - this.lastCullingUpdate < this.cullingUpdateInterval) {
      return false;
    }
    this.lastCullingUpdate = now;
    return true;
  }

  /// <summary>
  /// Enables viewport culling for large graphs.
  /// </summary>
  private enableViewportCulling(): void {
    if (!this.cytoscapeInstance || !this._viewportCulling()) return;

    this.updateViewportBounds();
    this.updateViewportCulling();
  }

  /// <summary>
  /// Disables viewport culling.
  /// </summary>
  private disableViewportCulling(): void {
    if (!this.cytoscapeInstance) return;

    // Show all elements by removing hidden class
    this.cytoscapeInstance.elements().removeClass('hidden');
    this._visibleElements.set(new Set());
  }

  /// <summary>
  /// Updates viewport bounds for culling calculations.
  /// </summary>
  private updateViewportBounds(): void {
    if (!this.cytoscapeInstance) return;

    const extent = this.cytoscapeInstance.extent();
    this.viewportBounds = {
      x1: extent.x1,
      y1: extent.y1,
      x2: extent.x2,
      y2: extent.y2
    };
  }

  /// <summary>
  /// Performs viewport culling to hide non-visible elements.
  /// </summary>
  private updateViewportCulling(): void {
    if (!this.cytoscapeInstance || !this.viewportBounds) return;

    const visibleElements = new Set<string>();
    const maxVisible = this._maxVisibleNodes();

    // Get visible nodes within viewport bounds
    const nodes = this.cytoscapeInstance.nodes();
    let visibleNodeCount = 0;

    nodes.forEach(node => {
      if (visibleNodeCount >= maxVisible) {
        node.addClass('hidden');
        return;
      }

      const position = node.position();
      const isVisible = this.isNodeInViewport(position, this.viewportBounds!);

      if (isVisible) {
        node.removeClass('hidden');
        visibleElements.add(node.id());
        visibleNodeCount++;
      } else {
        node.addClass('hidden');
      }
    });

    // Show edges between visible nodes
    const edges = this.cytoscapeInstance.edges();
    edges.forEach(edge => {
      const sourceId = edge.source().id();
      const targetId = edge.target().id();

      if (visibleElements.has(sourceId) && visibleElements.has(targetId)) {
        edge.removeClass('hidden');
        visibleElements.add(edge.id());
      } else {
        edge.addClass('hidden');
      }
    });

    this._visibleElements.set(visibleElements);
  }

  /// <summary>
  /// Throttled version of viewport culling update.
  /// </summary>
  private throttledUpdateViewportCulling = this.throttle(() => {
    this.updateViewportBounds();
    this.updateViewportCulling();
  }, this.cullingUpdateInterval);

  /// <summary>
  /// Checks if a node position is within the viewport bounds.
  /// </summary>
  private isNodeInViewport(
    position: { x: number; y: number },
    bounds: { x1: number; y1: number; x2: number; y2: number }
  ): boolean {
    return position.x >= bounds.x1 && position.x <= bounds.x2 &&
           position.y >= bounds.y1 && position.y <= bounds.y2;
  }

  /// <summary>
  /// Updates performance settings based on current mode and graph size.
  /// </summary>
  private updatePerformanceSettings(): void {
    if (!this.cytoscapeInstance) return;

    const config = this.getPerformanceConfig();

    // Note: These settings are applied during initialization
    // Dynamic updates would require recreating the instance
    console.log('Performance settings updated:', config);
  }

  /// <summary>
  /// Initializes lazy loading for large datasets.
  /// </summary>
  private initializeLazyLoading(): void {
    const graphData = this._graphData();
    if (!graphData || !this._lazyLoading()) return;

    // Chunk the data for progressive loading
    const chunkSize = this._renderBatchSize();
    this.loadedChunks.clear();
    this.pendingChunks = [];

    for (let i = 0; i < graphData.nodes.length; i += chunkSize) {
      this.pendingChunks.push(`nodes_${i}_${Math.min(i + chunkSize, graphData.nodes.length)}`);
    }

    for (let i = 0; i < graphData.edges.length; i += chunkSize) {
      this.pendingChunks.push(`edges_${i}_${Math.min(i + chunkSize, graphData.edges.length)}`);
    }
  }

  /// <summary>
  /// Loads the next chunk of data in lazy loading mode.
  /// </summary>
  private async loadNextChunk(): Promise<void> {
    if (this.isLoadingChunk || this.pendingChunks.length === 0) return;

    this.isLoadingChunk = true;
    const chunkId = this.pendingChunks.shift()!;

    try {
      // Simulate chunk loading delay
      await new Promise(resolve => setTimeout(resolve, 10));

      this.loadedChunks.add(chunkId);
      // Actual chunk loading implementation would go here

    } finally {
      this.isLoadingChunk = false;
    }
  }

  /// <summary>
  /// Starts performance monitoring.
  /// </summary>
  private startPerformanceMonitoring(): void {
    // Update metrics every second
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  /// <summary>
  /// Updates performance metrics.
  /// </summary>
  private updatePerformanceMetrics(): void {
    if (!this.cytoscapeInstance) return;

    const nodes = this.cytoscapeInstance.nodes();
    const edges = this.cytoscapeInstance.edges();
    const visibleNodes = nodes.filter(node => node.visible());
    const visibleEdges = edges.filter(edge => edge.visible());

    const metrics = {
      frameRate: this.calculateFrameRate(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      visibleNodeCount: visibleNodes.length,
      visibleEdgeCount: visibleEdges.length,
      renderTime: this.calculateRenderTime(),
      memoryUsage: this.estimateMemoryUsage(),
      lastUpdate: new Date()
    };

    this._performanceMetrics.set(metrics);
  }

  /// <summary>
  /// Calculates the current frame rate.
  /// </summary>
  private calculateFrameRate(): number {
    // Simplified frame rate calculation
    // In a real implementation, this would measure actual frame times
    return 60; // Placeholder
  }

  /// <summary>
  /// Calculates the current render time.
  /// </summary>
  private calculateRenderTime(): number {
    // Simplified render time calculation
    // In a real implementation, this would measure actual render performance
    return Date.now() % 100; // Placeholder
  }

  /// <summary>
  /// Estimates memory usage.
  /// </summary>
  private estimateMemoryUsage(): number {
    if (!this.cytoscapeInstance) return 0;

    const nodeCount = this.cytoscapeInstance.nodes().length;
    const edgeCount = this.cytoscapeInstance.edges().length;

    // Rough estimation: 1KB per node, 0.5KB per edge
    return (nodeCount * 1024) + (edgeCount * 512);
  }

  /// <summary>
  /// Throttle utility function.
  /// </summary>
  private throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastExecTime = 0;

    return ((...args: Parameters<T>) => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    }) as T;
  }
}
