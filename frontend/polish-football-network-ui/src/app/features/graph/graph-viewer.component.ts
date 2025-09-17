import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  computed,
  signal,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';

import cytoscape, { Core, ElementDefinition, NodeSingular, EdgeSingular } from 'cytoscape';

import { GraphService } from '../../core/services/graph.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  GraphData,
  GraphNode,
  GraphConfig,
  GraphLayoutType,
  GraphExportOptions,
  GraphEvents
} from '../../shared/models/graph.model';
import { GraphEdge } from '../../shared/models/connection.model';

/// <summary>
/// Advanced graph visualization component using Cytoscape.js for displaying football club networks.
/// Provides interactive graph visualization with layout algorithms, filtering, export capabilities,
/// and comprehensive event handling for exploring club connections.
/// </summary>
@Component({
  selector: 'app-graph-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatCardModule,
    MatMenuModule,
    FormsModule
  ],
  template: `
    <div class="graph-viewer-container">
      <!-- Toolbar -->
      <mat-toolbar class="graph-toolbar" color="primary">
        <span class="toolbar-title">
          <mat-icon>account_tree</mat-icon>
          Polish Football Network Graph
        </span>

        <div class="toolbar-spacer"></div>

        <!-- Layout Selection -->
        <mat-select
          [(value)]="selectedLayout"
          (selectionChange)="onLayoutChange($event.value)"
          class="layout-select"
          placeholder="Layout">
          <mat-option *ngFor="let layout of availableLayouts" [value]="layout">
            {{ layout | titlecase }}
          </mat-option>
        </mat-select>

        <!-- Export Menu -->
        <button mat-icon-button [matMenuTriggerFor]="exportMenu" matTooltip="Export Graph">
          <mat-icon>download</mat-icon>
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="exportGraph('png')">
            <mat-icon>image</mat-icon>
            Export as PNG
          </button>
          <button mat-menu-item (click)="exportGraph('svg')">
            <mat-icon>vector_icon</mat-icon>
            Export as SVG
          </button>
          <button mat-menu-item (click)="exportGraph('json')">
            <mat-icon>data_object</mat-icon>
            Export as JSON
          </button>
        </mat-menu>

        <!-- Refresh Button -->
        <button
          mat-icon-button
          (click)="refreshGraph()"
          [disabled]="isLoading()"
          matTooltip="Refresh Graph">
          <mat-icon>refresh</mat-icon>
        </button>
      </mat-toolbar>

      <!-- Loading Bar -->
      <mat-progress-bar
        mode="indeterminate"
        *ngIf="isLoading()"
        class="loading-bar">
      </mat-progress-bar>

      <!-- Error Message -->
      <div *ngIf="hasError()" class="error-container">
        <mat-card class="error-card">
          <mat-card-content>
            <div class="error-content">
              <mat-icon color="warn">error</mat-icon>
              <div class="error-text">
                <h3>Failed to load graph</h3>
                <p>{{ error() }}</p>
              </div>
            </div>
            <div class="error-actions">
              <button mat-raised-button color="primary" (click)="refreshGraph()">
                <mat-icon>refresh</mat-icon>
                Retry
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Graph Controls Panel -->
      <div class="controls-panel" [class.collapsed]="controlsCollapsed">
        <div class="controls-header" (click)="toggleControls()">
          <span>Controls</span>
          <mat-icon>{{ controlsCollapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
        </div>

        <div class="controls-content" *ngIf="!controlsCollapsed">
          <!-- Zoom Controls -->
          <div class="control-group">
            <h4>Zoom</h4>
            <div class="zoom-controls">
              <button mat-icon-button (click)="zoomIn()" [disabled]="!hasGraphData()">
                <mat-icon>zoom_in</mat-icon>
              </button>
              <span class="zoom-level">{{ (+(currentZoom()) * 100) | number:'1.0-0' }}%</span>
              <button mat-icon-button (click)="zoomOut()" [disabled]="!hasGraphData()">
                <mat-icon>zoom_out</mat-icon>
              </button>
            </div>
            <button mat-button (click)="fitGraph()" [disabled]="!hasGraphData()">
              <mat-icon>fit_screen</mat-icon>
              Fit to Screen
            </button>
          </div>

          <!-- Node Sizing -->
          <div class="control-group">
            <h4>Node Size</h4>
            <mat-slider
              class="size-slider"
              min="10"
              max="100"
              step="5"
              [disabled]="!hasGraphData()">
              <input matSliderThumb [value]="nodeSize" (valueChange)="onNodeSizeChange($event)">
            </mat-slider>
            <span class="slider-value">{{ nodeSize }}</span>
          </div>

          <!-- Edge Width -->
          <div class="control-group">
            <h4>Edge Width</h4>
            <mat-slider
              class="size-slider"
              min="1"
              max="10"
              step="0.5"
              [disabled]="!hasGraphData()">
              <input matSliderThumb [value]="edgeWidth" (valueChange)="onEdgeWidthChange($event)">
            </mat-slider>
            <span class="slider-value">{{ edgeWidth }}</span>
          </div>

          <!-- Display Options -->
          <div class="control-group">
            <h4>Display</h4>
            <mat-checkbox
              [checked]="showLabels"
              (change)="onShowLabelsChange($event.checked)"
              [disabled]="!hasGraphData()">
              Show Labels
            </mat-checkbox>
            <mat-checkbox
              [checked]="showEdgeLabels"
              (change)="onShowEdgeLabelsChange($event.checked)"
              [disabled]="!hasGraphData()">
              Show Edge Labels
            </mat-checkbox>
            <mat-checkbox
              [checked]="animationsEnabled"
              (change)="onAnimationsChange($event.checked)"
              [disabled]="!hasGraphData()">
              Enable Animations
            </mat-checkbox>
          </div>
        </div>
      </div>

      <!-- Graph Container -->
      <div
        #graphContainer
        class="graph-container"
        [class.loading]="isLoading()"
        [class.has-error]="hasError()">

        <!-- Loading Placeholder -->
        <div *ngIf="isLoading()" class="loading-placeholder">
          <div class="loading-content">
            <mat-icon class="loading-icon">hourglass_empty</mat-icon>
            <h3>Loading Graph Data</h3>
            <p>Please wait while we load the football club network...</p>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && !hasError() && !hasGraphData()" class="empty-state">
          <div class="empty-content">
            <mat-icon class="empty-icon">account_tree</mat-icon>
            <h3>No Graph Data</h3>
            <p>Click refresh to load the football club network.</p>
            <button mat-raised-button color="primary" (click)="refreshGraph()">
              <mat-icon>refresh</mat-icon>
              Load Graph
            </button>
          </div>
        </div>
      </div>

      <!-- Graph Statistics -->
      <div class="stats-panel" *ngIf="hasGraphData() && graphStats()">
        <mat-card class="stats-card">
          <mat-card-content>
            <div class="stats-content">
              <div class="stat-item">
                <mat-icon>group</mat-icon>
                <span class="stat-label">Clubs</span>
                <span class="stat-value">{{ graphStats()?.nodeCount || 0 }}</span>
              </div>
              <div class="stat-item">
                <mat-icon>connection</mat-icon>
                <span class="stat-label">Connections</span>
                <span class="stat-value">{{ graphStats()?.edgeCount || 0 }}</span>
              </div>
              <div class="stat-item" *ngIf="selectedNodesCount() > 0">
                <mat-icon>select_all</mat-icon>
                <span class="stat-label">Selected</span>
                <span class="stat-value">{{ selectedNodesCount() }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Selection Info -->
      <div class="selection-panel" *ngIf="selectedNodeData()">
        <mat-card class="selection-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Selected Club
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="club-info">
              <img
                *ngIf="selectedNodeData()?.data?.logoUrl"
                [src]="selectedNodeData()?.data?.logoUrl"
                [alt]="selectedNodeData()?.data?.name + ' logo'"
                class="club-logo"
                (error)="onLogoError($event)">
              <div class="club-details">
                <h3>{{ selectedNodeData()?.data?.name }}</h3>
                <p><strong>City:</strong> {{ selectedNodeData()?.data?.city }}</p>
                <p><strong>League:</strong> {{ selectedNodeData()?.data?.league }}</p>
                <p><strong>Founded:</strong> {{ selectedNodeData()?.data?.foundedYear }}</p>
                <p *ngIf="selectedNodeData()?.data?.stadium">
                  <strong>Stadium:</strong> {{ selectedNodeData()?.data?.stadium }}
                </p>
              </div>
            </div>
            <div class="club-actions">
              <button mat-button (click)="highlightConnectedNodes()">
                <mat-icon>network_node</mat-icon>
                Highlight Connections
              </button>
              <button mat-button (click)="clearSelection()">
                <mat-icon>clear</mat-icon>
                Clear Selection
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./graph-viewer.component.scss']
})
export class GraphViewerComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef<HTMLDivElement>;

  @Input() graphEvents?: GraphEvents;
  @Output() nodeSelected = new EventEmitter<GraphNode>();
  @Output() edgeSelected = new EventEmitter<GraphEdge>();
  @Output() selectionCleared = new EventEmitter<void>();

  // Services
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);

  // Cytoscape instance
  private cytoscapeInstance: Core | null = null;

  // Component state
  private readonly _isInitialized = signal(false);
  private readonly _currentZoom = signal(1);
  private readonly _selectedNodeData = signal<GraphData['nodes'][0] | null>(null);

  // Control states
  public selectedLayout: GraphLayoutType = 'force-directed';
  public nodeSize = 30;
  public edgeWidth = 2;
  public showLabels = true;
  public showEdgeLabels = false;
  public animationsEnabled = true;
  public controlsCollapsed = false;

  // Service state access
  public readonly graphData = this.graphService.graphData;
  public readonly graphConfig = this.graphService.graphConfig;
  public readonly selectedNodes = this.graphService.selectedNodes;
  public readonly selectedEdges = this.graphService.selectedEdges;
  public readonly isLoading = this.graphService.isLoading;
  public readonly hasError = this.graphService.hasError;
  public readonly error = this.graphService.error;
  public readonly hasGraphData = this.graphService.hasGraphData;
  public readonly graphStats = this.graphService.graphStats;

  // Computed properties
  public readonly currentZoom = computed(() => this._currentZoom());
  public readonly selectedNodeData = computed(() => this._selectedNodeData());
  public readonly selectedNodesCount = computed(() => this.selectedNodes().length);
  public readonly availableLayouts: GraphLayoutType[] = this.graphService.availableLayouts;

  constructor() {
    // React to graph data changes
    effect(() => {
      const data = this.graphData();
      if (data && this._isInitialized()) {
        this.updateGraphVisualization(data);
      }
    });

    // React to configuration changes
    effect(() => {
      const config = this.graphConfig();
      if (config && this.cytoscapeInstance) {
        this.applyGraphConfiguration(config);
      }
    });

    // React to selection changes
    effect(() => {
      const selectedNodes = this.selectedNodes();
      if (selectedNodes.length > 0 && this.graphData()) {
        const nodeData = this.graphData()?.nodes.find(n => n.id === selectedNodes[0]);
        this._selectedNodeData.set(nodeData || null);
      } else {
        this._selectedNodeData.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.initializeGraph();
    this.loadGraphData();
  }

  ngOnDestroy(): void {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.destroy();
    }
  }

  /// <summary>
  /// Initializes the Cytoscape graph instance with basic configuration.
  /// </summary>
  private initializeGraph(): void {
    try {
      this.cytoscapeInstance = cytoscape({
        container: this.graphContainer.nativeElement,
        style: this.getDefaultStyle(),
        layout: {
          name: this.selectedLayout,
          ...this.getLayoutOptions(this.selectedLayout)
        },
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.1,
        motionBlur: this.animationsEnabled,
        textureOnViewport: true,
        hideEdgesOnViewport: false,
        hideLabelsOnViewport: false,
        pixelRatio: 'auto'
      });

      this.setupEventHandlers();
      this._isInitialized.set(true);

      this.notificationService.showSuccess('Graph visualization initialized');
    } catch (error) {
      console.error('Failed to initialize Cytoscape:', error);
      this.notificationService.showError('Failed to initialize graph visualization');
    }
  }

  /// <summary>
  /// Sets up event handlers for graph interactions.
  /// </summary>
  private setupEventHandlers(): void {
    if (!this.cytoscapeInstance) return;

    // Node events
    this.cytoscapeInstance.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();

      this.handleNodeSelection(nodeData);

      if (this.graphEvents?.onNodeClick) {
        this.graphEvents.onNodeClick(nodeData, event.originalEvent);
      }
    });

    this.cytoscapeInstance.on('mouseover', 'node', (event) => {
      const node = event.target;
      node.addClass('hovered');

      if (this.graphEvents?.onNodeHover) {
        this.graphEvents.onNodeHover(node.data(), event.originalEvent);
      }
    });

    this.cytoscapeInstance.on('mouseout', 'node', (event) => {
      const node = event.target;
      node.removeClass('hovered');
    });

    // Edge events
    this.cytoscapeInstance.on('tap', 'edge', (event) => {
      const edge = event.target;
      const edgeData = edge.data();

      if (this.graphEvents?.onEdgeClick) {
        this.graphEvents.onEdgeClick(edgeData, event.originalEvent);
      }
    });

    // Background events
    this.cytoscapeInstance.on('tap', (event) => {
      if (event.target === this.cytoscapeInstance) {
        this.clearSelection();

        if (this.graphEvents?.onBackgroundClick) {
          this.graphEvents.onBackgroundClick(event.originalEvent);
        }
      }
    });

    // Zoom and pan events
    this.cytoscapeInstance.on('zoom', () => {
      const zoom = this.cytoscapeInstance?.zoom() || 1;
      this._currentZoom.set(zoom);

      if (this.graphEvents?.onZoom) {
        this.graphEvents.onZoom(zoom);
      }
    });

    this.cytoscapeInstance.on('pan', () => {
      const pan = this.cytoscapeInstance?.pan() || { x: 0, y: 0 };

      if (this.graphEvents?.onPan) {
        this.graphEvents.onPan(pan);
      }
    });
  }

  /// <summary>
  /// Loads graph data from the service.
  /// </summary>
  public loadGraphData(): void {
    this.graphService.loadGraphData(true).subscribe({
      next: (data) => {
        console.log('Graph data loaded:', data);
      },
      error: (error) => {
        console.error('Failed to load graph data:', error);
      }
    });
  }

  /// <summary>
  /// Updates the graph visualization with new data.
  /// </summary>
  /// <param name="data">Graph data to visualize</param>
  private updateGraphVisualization(data: GraphData): void {
    if (!this.cytoscapeInstance || !data) return;

    try {
      // Convert data to Cytoscape format
      const elements = this.convertDataToCytoscapeFormat(data);

      // Update graph
      this.cytoscapeInstance.elements().remove();
      this.cytoscapeInstance.add(elements);

      // Apply layout
      this.applyLayout(this.selectedLayout);

      // Fit graph to container
      this.fitGraph();

      console.log(`Graph updated with ${data.nodes.length} nodes and ${data.edges.length} edges`);
    } catch (error) {
      console.error('Failed to update graph visualization:', error);
      this.notificationService.showError('Failed to update graph visualization');
    }
  }

  /// <summary>
  /// Converts graph data to Cytoscape element format.
  /// </summary>
  /// <param name="data">Graph data to convert</param>
  /// <returns>Array of Cytoscape elements</returns>
  private convertDataToCytoscapeFormat(data: GraphData): ElementDefinition[] {
    const elements: ElementDefinition[] = [];

    // Add nodes
    data.nodes.forEach(node => {
      const { id: nodeId, ...nodeDataWithoutId } = node.data;
      elements.push({
        group: 'nodes',
        data: {
          id: node.id.toString(),
          label: node.label,
          ...nodeDataWithoutId,
          clubId: nodeId, // Store original ID as clubId
          cyId: node.id.toString(), // Keep string ID for Cytoscape
          originalNode: node
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
          label: edge.label,
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
  /// Gets CSS classes for a node based on its properties.
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
      classes.push(`league-${node.data.league.toLowerCase().replace(/\s+/g, '-')}`);
    }

    return classes.join(' ');
  }

  /// <summary>
  /// Gets CSS classes for an edge based on its properties.
  /// </summary>
  /// <param name="edge">Graph edge</param>
  /// <returns>Space-separated CSS classes</returns>
  private getEdgeClasses(edge: GraphEdge): string {
    const classes = ['edge'];

    // Add type-based class
    classes.push(`type-${edge.type}`);

    // Add strength-based class
    classes.push(`strength-${edge.strength}`);

    if (!edge.isActive) classes.push('inactive');

    return classes.join(' ');
  }

  /// <summary>
  /// Gets the default Cytoscape style configuration.
  /// </summary>
  /// <returns>Cytoscape style array</returns>
  private getDefaultStyle(): cytoscape.StylesheetStyle[] {
    return [
      // Node styles
      {
        selector: 'node',
        style: {
          'width': this.nodeSize,
          'height': this.nodeSize,
          'background-color': '#2196F3',
          'border-width': 2,
          'border-color': '#1976D2',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-outline-width': 2,
          'text-outline-color': '#ffffff',
          'color': '#333333'
        } as any
      },
      // Node hover state
      {
        selector: 'node.hovered',
        style: {
          'border-width': 4,
          'border-color': '#FF5722',
          'background-color': '#FF9800'
        } as any
      },
      // Selected node
      {
        selector: 'node.selected',
        style: {
          'border-width': 4,
          'border-color': '#4CAF50',
          'background-color': '#8BC34A'
        } as any
      },
      // Edge styles
      {
        selector: 'edge',
        style: {
          'width': this.edgeWidth,
          'line-color': '#9E9E9E',
          'target-arrow-color': '#9E9E9E',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2
        } as any
      },
      // Edge hover state
      {
        selector: 'edge:hover',
        style: {
          'line-color': '#FF5722',
          'target-arrow-color': '#FF5722',
          'width': this.edgeWidth * 1.5
        } as any
      },
      // Connection type styles
      {
        selector: 'edge.type-rivalry',
        style: {
          'line-color': '#F44336',
          'target-arrow-color': '#F44336'
        } as any
      },
      {
        selector: 'edge.type-friendly',
        style: {
          'line-color': '#4CAF50',
          'target-arrow-color': '#4CAF50'
        } as any
      },
      {
        selector: 'edge.type-geographic',
        style: {
          'line-color': '#2196F3',
          'target-arrow-color': '#2196F3'
        } as any
      },
      {
        selector: 'edge.type-business',
        style: {
          'line-color': '#FF9800',
          'target-arrow-color': '#FF9800'
        } as any
      },
      // League-based node colors
      {
        selector: 'node.league-ekstraklasa',
        style: {
          'background-color': '#1976D2'
        } as any
      },
      {
        selector: 'node.league-i-liga',
        style: {
          'background-color': '#388E3C'
        } as any
      },
      {
        selector: 'node.league-ii-liga',
        style: {
          'background-color': '#F57C00'
        } as any
      }
    ];
  }

  /// <summary>
  /// Gets layout options for a specific layout type.
  /// </summary>
  /// <param name="layoutType">Type of layout</param>
  /// <returns>Layout options object</returns>
  private getLayoutOptions(layoutType: GraphLayoutType): Record<string, any> {
    const baseOptions = {
      animate: this.animationsEnabled,
      animationDuration: 1000,
      fit: true,
      padding: 50
    };

    switch (layoutType) {
      case 'force-directed':
        return {
          ...baseOptions,
          name: 'cose',
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 20,
          randomize: false,
          componentSpacing: 40,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        };
      case 'hierarchical':
        return {
          ...baseOptions,
          name: 'dagre',
          rankDir: 'TB',
          align: 'UL',
          ranker: 'network-simplex',
          nodeSep: 75,
          edgeSep: 25,
          rankSep: 75
        };
      case 'circular':
        return {
          ...baseOptions,
          name: 'circle',
          radius: 200,
          clockwise: true,
          startAngle: -Math.PI / 2
        };
      case 'grid':
        return {
          ...baseOptions,
          name: 'grid',
          rows: undefined,
          cols: undefined,
          position: () => ({ row: 0, col: 0 })
        };
      case 'concentric':
        return {
          ...baseOptions,
          name: 'concentric',
          concentric: (node: any) => node.degree(),
          levelWidth: () => 1,
          minNodeSpacing: 10
        };
      case 'breadthfirst':
        return {
          ...baseOptions,
          name: 'breadthfirst',
          directed: false,
          spacingFactor: 1.75,
          circle: false
        };
      default:
        return baseOptions;
    }
  }

  /// <summary>
  /// Applies a layout to the graph.
  /// </summary>
  /// <param name="layoutType">Type of layout to apply</param>
  public applyLayout(layoutType: GraphLayoutType): void {
    if (!this.cytoscapeInstance) return;

    try {
      const layout = this.cytoscapeInstance.layout({
        name: layoutType === 'force-directed' ? 'cose' : layoutType,
        ...this.getLayoutOptions(layoutType)
      });

      layout.run();

      if (this.graphEvents?.onLayoutComplete) {
        layout.on('layoutstop', () => {
          this.graphEvents!.onLayoutComplete!();
        });
      }
    } catch (error) {
      console.error('Failed to apply layout:', error);
      this.notificationService.showError(`Failed to apply ${layoutType} layout`);
    }
  }

  /// <summary>
  /// Applies graph configuration changes.
  /// </summary>
  /// <param name="config">Graph configuration</param>
  private applyGraphConfiguration(config: GraphConfig): void {
    if (!this.cytoscapeInstance) return;

    // Update node sizes
    this.nodeSize = config.nodes.defaultSize;

    // Update edge widths
    this.edgeWidth = config.edges.defaultWidth;

    // Update labels
    this.showLabels = config.nodes.showLabels;
    this.showEdgeLabels = config.edges.showLabels;

    // Update animations
    this.animationsEnabled = config.animation.enabled;

    // Apply style updates
    this.cytoscapeInstance.style(this.getDefaultStyle());
  }

  /// <summary>
  /// Handles node selection events.
  /// </summary>
  /// <param name="nodeData">Selected node data</param>
  private handleNodeSelection(nodeData: any): void {
    const graphNode: GraphNode = nodeData.originalNode;

    // Update service selection
    this.graphService.updateSelection([graphNode.id], []);

    // Emit selection event
    this.nodeSelected.emit(graphNode);

    // Highlight node in visualization
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.nodes().removeClass('selected');
      this.cytoscapeInstance.getElementById(nodeData.id).addClass('selected');
    }
  }

  // Public event handlers

  public onLayoutChange(layout: GraphLayoutType): void {
    this.selectedLayout = layout;
    this.applyLayout(layout);

    // Update graph config
    this.graphService.updateGraphConfig({
      layout: {
        type: layout,
        options: this.getLayoutOptions(layout)
      }
    });
  }

  public onNodeSizeChange(size: number): void {
    this.nodeSize = size;
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.style().selector('node').style('width', size).style('height', size).update();
    }
  }

  public onEdgeWidthChange(width: number): void {
    this.edgeWidth = width;
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.style().selector('edge').style('width', width).update();
    }
  }

  public onShowLabelsChange(show: boolean): void {
    this.showLabels = show;
    if (this.cytoscapeInstance) {
      const labelValue = show ? 'data(label)' : '';
      this.cytoscapeInstance.style().selector('node').style('label', labelValue).update();
    }
  }

  public onShowEdgeLabelsChange(show: boolean): void {
    this.showEdgeLabels = show;
    if (this.cytoscapeInstance) {
      const labelValue = show ? 'data(label)' : '';
      this.cytoscapeInstance.style().selector('edge').style('label', labelValue).update();
    }
  }

  public onAnimationsChange(enabled: boolean): void {
    this.animationsEnabled = enabled;
    // Note: Motion blur is not available in core Cytoscape.js
    // Animation settings are applied during layout operations
  }

  // Control methods

  public refreshGraph(): void {
    this.loadGraphData();
  }

  public zoomIn(): void {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.zoom(this.cytoscapeInstance.zoom() * 1.2);
    }
  }

  public zoomOut(): void {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.zoom(this.cytoscapeInstance.zoom() * 0.8);
    }
  }

  public fitGraph(): void {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.fit(undefined, 50);
    }
  }

  public clearSelection(): void {
    this.graphService.updateSelection([], []);
    this._selectedNodeData.set(null);

    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.elements().removeClass('selected highlighted');
    }

    this.selectionCleared.emit();
  }

  public highlightConnectedNodes(): void {
    const selectedNodeId = this.selectedNodes()[0];
    if (!selectedNodeId || !this.cytoscapeInstance) return;

    // Clear previous highlights
    this.cytoscapeInstance.elements().removeClass('highlighted');

    // Highlight connected nodes and edges
    const selectedNode = this.cytoscapeInstance.getElementById(selectedNodeId.toString());
    const connectedEdges = selectedNode.connectedEdges();
    const connectedNodes = connectedEdges.connectedNodes();

    selectedNode.addClass('highlighted');
    connectedEdges.addClass('highlighted');
    connectedNodes.addClass('highlighted');
  }

  public toggleControls(): void {
    this.controlsCollapsed = !this.controlsCollapsed;
  }

  /// <summary>
  /// Exports the graph in the specified format.
  /// </summary>
  /// <param name="format">Export format</param>
  public exportGraph(format: 'png' | 'svg' | 'json'): void {
    if (!this.cytoscapeInstance) {
      this.notificationService.showError('Graph not initialized');
      return;
    }

    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'png':
          data = this.cytoscapeInstance.png({
            output: 'base64uri',
            bg: '#ffffff',
            full: true,
            scale: 2
          });
          filename = `football-network-${Date.now()}.png`;
          mimeType = 'image/png';
          break;

        case 'svg':
          // SVG export is not available in core Cytoscape.js
          // Convert to PNG and provide as SVG alternative
          const pngBlob = this.cytoscapeInstance.png({
            output: 'blob',
            full: true,
            scale: 2
          });
          const url = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `football-network-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Graph exported as PNG (SVG not available in core Cytoscape)');
          return;

        case 'json':
          const graphData = this.graphData();
          data = 'data:application/json;charset=utf-8,' +
                 encodeURIComponent(JSON.stringify(graphData, null, 2));
          filename = `football-network-${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Create download link
      const link = document.createElement('a');
      link.href = data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notificationService.showSuccess(`Graph exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      this.notificationService.showError(`Failed to export graph as ${format.toUpperCase()}`);
    }
  }

  /// <summary>
  /// Handles logo loading errors.
  /// </summary>
  /// <param name="event">Error event</param>
  public onLogoError(event: ErrorEvent): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
