import { ClubDto } from './club.model';
import { ConnectionDto, GraphEdge } from './connection.model';

/// <summary>
/// Graph layout algorithms supported by the graph visualization.
/// </summary>
export type GraphLayoutType =
  | 'force-directed'
  | 'hierarchical'
  | 'circular'
  | 'grid'
  | 'concentric'
  | 'breadthfirst'
  | 'cola'
  | 'dagre';

/// <summary>
/// Graph node representing a club in the network visualization.
/// </summary>
export interface GraphNode {
  id: number; // Club ID
  label: string;
  data: ClubDto;
  position?: {
    x: number;
    y: number;
  };
  size?: number;
  color?: string;
  shape?: 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon';
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isHidden?: boolean;
  metadata?: Record<string, any>;
}

/// <summary>
/// Complete graph data structure containing nodes and edges.
/// </summary>
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    totalNodes: number;
    totalEdges: number;
    density: number; // Number of edges / maximum possible edges
    connectedComponents: number;
    averageDegree: number;
    maxDegree: number;
    minDegree: number;
    generatedAt: Date;
  };
}

/// <summary>
/// Graph visualization configuration and styling options.
/// </summary>
export interface GraphConfig {
  layout: {
    type: GraphLayoutType;
    options?: Record<string, any>;
  };
  nodes: {
    defaultSize: number;
    minSize: number;
    maxSize: number;
    sizeAttribute?: 'degree' | 'betweenness' | 'closeness' | 'custom';
    colorScheme: 'league' | 'city' | 'degree' | 'custom';
    showLabels: boolean;
    labelSize: number;
  };
  edges: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    widthAttribute?: 'weight' | 'betweenness' | 'custom';
    showArrows: boolean;
    curvedEdges: boolean;
    showLabels: boolean;
  };
  interaction: {
    zoomEnabled: boolean;
    panEnabled: boolean;
    selectEnabled: boolean;
    multiSelectEnabled: boolean;
    hoverEnabled: boolean;
    dragEnabled: boolean;
  };
  filters: {
    minConnectionWeight: number;
    maxConnectionWeight: number;
    connectionTypes: string[];
    leagues: string[];
    cities: string[];
    showInactiveConnections: boolean;
  };
  animation: {
    enabled: boolean;
    duration: number;
    easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}

/// <summary>
/// Graph analysis metrics and statistics.
/// </summary>
export interface GraphAnalysis {
  networkMetrics: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    diameter: number;
    averagePathLength: number;
    clusteringCoefficient: number;
    connectedComponents: number;
    isolatedNodes: number;
  };
  centralityMeasures: {
    degree: Record<number, number>; // clubId -> degree centrality
    betweenness: Record<number, number>; // clubId -> betweenness centrality
    closeness: Record<number, number>; // clubId -> closeness centrality
    eigenvector: Record<number, number>; // clubId -> eigenvector centrality
  };
  communities: {
    algorithm: 'louvain' | 'leiden' | 'label-propagation';
    communities: Array<{
      id: number;
      nodes: number[]; // club IDs
      size: number;
      modularity: number;
    }>;
    totalCommunities: number;
    averageCommunitySize: number;
    modularity: number;
  };
  topNodes: {
    mostConnected: Array<{ clubId: number; degree: number; }>;
    mostCentral: Array<{ clubId: number; betweenness: number; }>;
    bridges: Array<{ clubId: number; closeness: number; }>;
    hubs: Array<{ clubId: number; eigenvector: number; }>;
  };
}

/// <summary>
/// Graph export formats and options.
/// </summary>
export interface GraphExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'json' | 'gexf' | 'graphml' | 'csv';
  width?: number;
  height?: number;
  quality?: number; // For image formats
  includeData?: boolean; // For data formats
  includePositions?: boolean;
  includeStyles?: boolean;
  backgroundColor?: string;
  transparent?: boolean;
}

/// <summary>
/// Graph search and filter criteria.
/// </summary>
export interface GraphFilterCriteria {
  nodeFilters?: {
    leagues?: string[];
    cities?: string[];
    foundedYearRange?: { min: number; max: number; };
    hasCoordinates?: boolean;
    degreeRange?: { min: number; max: number; };
  };
  edgeFilters?: {
    connectionTypes?: string[];
    strengthLevels?: string[];
    weightRange?: { min: number; max: number; };
    isActive?: boolean;
    hasEndDate?: boolean;
  };
  layoutFilters?: {
    hideIsolatedNodes?: boolean;
    hideWeakConnections?: boolean;
    showOnlyLargestComponent?: boolean;
  };
}

/// <summary>
/// Graph interaction events and handlers.
/// </summary>
export interface GraphEvents {
  onNodeClick?: (node: GraphNode, event: Event) => void;
  onNodeDoubleClick?: (node: GraphNode, event: Event) => void;
  onNodeHover?: (node: GraphNode, event: Event) => void;
  onNodeSelect?: (nodes: GraphNode[]) => void;
  onEdgeClick?: (edge: GraphEdge, event: Event) => void;
  onEdgeHover?: (edge: GraphEdge, event: Event) => void;
  onBackgroundClick?: (event: Event) => void;
  onZoom?: (level: number) => void;
  onPan?: (position: { x: number; y: number; }) => void;
  onLayoutComplete?: () => void;
}

/// <summary>
/// Graph state management for undo/redo operations.
/// </summary>
export interface GraphState {
  id: string;
  timestamp: Date;
  config: GraphConfig;
  selectedNodes: number[];
  selectedEdges: string[];
  zoomLevel: number;
  panPosition: { x: number; y: number; };
  filterCriteria: GraphFilterCriteria;
  layout: GraphLayoutType;
  description?: string;
}

/// <summary>
/// Graph path finding results.
/// </summary>
export interface GraphPath {
  source: number; // Club ID
  target: number; // Club ID
  path: number[]; // Array of club IDs in path
  length: number; // Number of hops
  weight: number; // Total weight of path
  connectionTypes: string[]; // Types of connections in path
  exists: boolean;
}

/// <summary>
/// Graph recommendation for new connections.
/// </summary>
export interface ConnectionRecommendation {
  sourceClubId: number;
  targetClubId: number;
  score: number; // Recommendation score (0-100)
  reasons: string[];
  suggestedType: string;
  suggestedStrength: string;
  commonNeighbors: number[];
  mutualConnections: number;
  geographicDistance?: number;
  leagueMatch: boolean;
  cityMatch: boolean;
}

/// <summary>
/// Graph clustering result.
/// </summary>
export interface GraphCluster {
  id: number;
  nodes: number[]; // Club IDs
  edges: string[]; // Connection IDs
  centerNode?: number; // Most central node in cluster
  size: number;
  density: number;
  averageWeight: number;
  dominantConnectionType: string;
  dominantLeague?: string;
  dominantCity?: string;
  isIsolated: boolean;
}
