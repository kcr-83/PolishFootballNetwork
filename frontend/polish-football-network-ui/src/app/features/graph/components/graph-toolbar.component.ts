import { Component, EventEmitter, Output, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { GraphLayoutType, GraphExportOptions } from '../../../shared/models/graph.model';
import { GraphService } from '../../../core/services/graph.service';
import { NotificationService } from '../../../core/services/notification.service';

/// <summary>
/// Toolbar component for graph visualization controls.
/// Provides zoom controls, view options, export functionality, and layout selection.
/// </summary>
@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    FormsModule
  ],
  template: `
    <mat-toolbar color="primary" class="graph-toolbar">
      <!-- Left side - Main controls -->
      <div class="toolbar-section">
        <!-- Zoom controls -->
        <div class="control-group">
          <button
            mat-icon-button
            matTooltip="Zoom In"
            (click)="onZoomIn()"
            [disabled]="!canZoomIn()">
            <mat-icon>zoom_in</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Zoom Out"
            (click)="onZoomOut()"
            [disabled]="!canZoomOut()">
            <mat-icon>zoom_out</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Fit to View"
            (click)="onFitToView()">
            <mat-icon>fit_screen</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Reset View"
            (click)="onResetView()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <mat-divider vertical></mat-divider>

        <!-- Layout controls -->
        <div class="control-group">
          <mat-select
            [(value)]="selectedLayout"
            (selectionChange)="onLayoutChange($event.value)"
            placeholder="Layout"
            class="layout-select">
            <mat-option value="force-directed">Force Directed</mat-option>
            <mat-option value="grid">Grid</mat-option>
            <mat-option value="circular">Circular</mat-option>
            <mat-option value="concentric">Concentric</mat-option>
            <mat-option value="breadthfirst">Breadth First</mat-option>
            <mat-option value="hierarchical">Hierarchical</mat-option>
          </mat-select>
        </div>

        <mat-divider vertical></mat-divider>

        <!-- View options -->
        <div class="control-group">
          <button
            mat-icon-button
            matTooltip="Toggle Node Labels"
            (click)="onToggleLabels()"
            [color]="showLabels() ? 'accent' : ''">
            <mat-icon>label</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Toggle Edge Labels"
            (click)="onToggleEdgeLabels()"
            [color]="showEdgeLabels() ? 'accent' : ''">
            <mat-icon>linear_scale</mat-icon>
          </button>

          <button
            mat-icon-button
            matTooltip="Toggle Animation"
            (click)="onToggleAnimation()"
            [color]="animationEnabled() ? 'accent' : ''">
            <mat-icon>animation</mat-icon>
          </button>
        </div>
      </div>

      <!-- Center - Status information -->
      <div class="toolbar-center">
        <span class="graph-stats" *ngIf="graphStats()">
          {{ graphStats()?.nodes }} clubs • {{ graphStats()?.edges }} connections
          <span *ngIf="zoomLevel()" class="zoom-indicator">
            • {{ (zoomLevel()! * 100).toFixed(0) }}%
          </span>
        </span>
      </div>

      <!-- Right side - Export and actions -->
      <div class="toolbar-section">
        <!-- Export menu -->
        <button
          mat-icon-button
          [matMenuTriggerFor]="exportMenu"
          matTooltip="Export Graph">
          <mat-icon>download</mat-icon>
        </button>

        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="onExport('png')">
            <mat-icon>image</mat-icon>
            <span>Export as PNG</span>
          </button>
          <button mat-menu-item (click)="onExport('svg')">
            <mat-icon>code</mat-icon>
            <span>Export as SVG</span>
          </button>
          <button mat-menu-item (click)="onExport('json')">
            <mat-icon>data_object</mat-icon>
            <span>Export Data</span>
          </button>
        </mat-menu>

        <mat-divider vertical></mat-divider>

        <!-- Additional actions -->
        <button
          mat-icon-button
          matTooltip="Fullscreen"
          (click)="onToggleFullscreen()">
          <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
        </button>

        <button
          mat-icon-button
          matTooltip="Help"
          (click)="onShowHelp()">
          <mat-icon>help_outline</mat-icon>
        </button>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .graph-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 16px;
      min-height: 64px;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .toolbar-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-center {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
    }

    .layout-select {
      min-width: 120px;
      color: white;
    }

    .layout-select ::ng-deep .mat-mdc-select-value {
      color: white;
    }

    .layout-select ::ng-deep .mat-mdc-select-arrow {
      color: white;
    }

    .graph-stats {
      color: white;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }

    .zoom-indicator {
      opacity: 0.8;
    }

    mat-divider {
      height: 24px;
      margin: 0 8px;
      border-color: rgba(255, 255, 255, 0.3);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .graph-toolbar {
        padding: 0 8px;
        min-height: 56px;
      }

      .toolbar-center {
        display: none;
      }

      .control-group {
        gap: 2px;
        padding: 0 4px;
      }

      .layout-select {
        min-width: 80px;
        font-size: 12px;
      }
    }

    /* Animation transitions */
    button {
      transition: all 0.2s ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }
  `]
})
export class GraphToolbarComponent {
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);

  // Input properties
  @Input() showLabels = signal(true);
  @Input() showEdgeLabels = signal(false);
  @Input() animationEnabled = signal(true);

  // Output events
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() fitToView = new EventEmitter<void>();
  @Output() resetView = new EventEmitter<void>();
  @Output() layoutChange = new EventEmitter<GraphLayoutType>();
  @Output() exportGraph = new EventEmitter<GraphExportOptions>();
  @Output() toggleLabels = new EventEmitter<void>();
  @Output() toggleEdgeLabels = new EventEmitter<void>();
  @Output() toggleAnimation = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() showHelp = new EventEmitter<void>();

  // Local state
  public selectedLayout = signal<GraphLayoutType>('force-directed');
  public zoomLevel = signal<number | null>(null);
  public isFullscreen = signal<boolean>(false);

  // Computed properties
  public readonly graphStats = computed(() => {
    const data = this.graphService.graphData();
    if (!data) return null;

    return {
      nodes: data.nodes.length,
      edges: data.edges.length
    };
  });

  public readonly canZoomIn = computed(() => {
    const zoom = this.zoomLevel();
    return zoom ? zoom < 3 : true;
  });

  public readonly canZoomOut = computed(() => {
    const zoom = this.zoomLevel();
    return zoom ? zoom > 0.1 : true;
  });

  /// <summary>
  /// Handle zoom in action.
  /// </summary>
  public onZoomIn(): void {
    this.zoomIn.emit();
    this.notificationService.showInfo('Zoomed in');
  }

  /// <summary>
  /// Handle zoom out action.
  /// </summary>
  public onZoomOut(): void {
    this.zoomOut.emit();
    this.notificationService.showInfo('Zoomed out');
  }

  /// <summary>
  /// Handle fit to view action.
  /// </summary>
  public onFitToView(): void {
    this.fitToView.emit();
    this.notificationService.showInfo('Fitted to view');
  }

  /// <summary>
  /// Handle reset view action.
  /// </summary>
  public onResetView(): void {
    this.resetView.emit();
    this.notificationService.showInfo('View reset');
  }

  /// <summary>
  /// Handle layout change.
  /// </summary>
  public onLayoutChange(layout: GraphLayoutType): void {
    this.selectedLayout.set(layout);
    this.layoutChange.emit(layout);
    this.notificationService.showInfo(`Layout changed to ${layout}`);
  }

  /// <summary>
  /// Handle graph export.
  /// </summary>
  public onExport(format: 'png' | 'svg' | 'json'): void {
    const options: GraphExportOptions = {
      format,
      quality: format === 'png' ? 1.0 : undefined,
      backgroundColor: format !== 'svg' ? '#ffffff' : undefined,
      transparent: format === 'svg'
    };

    this.exportGraph.emit(options);
    this.notificationService.showSuccess(`Exporting graph as ${format.toUpperCase()}`);
  }

  /// <summary>
  /// Handle label toggle.
  /// </summary>
  public onToggleLabels(): void {
    this.toggleLabels.emit();
  }

  /// <summary>
  /// Handle edge label toggle.
  /// </summary>
  public onToggleEdgeLabels(): void {
    this.toggleEdgeLabels.emit();
  }

  /// <summary>
  /// Handle animation toggle.
  /// </summary>
  public onToggleAnimation(): void {
    this.toggleAnimation.emit();
  }

  /// <summary>
  /// Handle fullscreen toggle.
  /// </summary>
  public onToggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    } else {
      document.documentElement.requestFullscreen();
      this.isFullscreen.set(true);
    }
    this.toggleFullscreen.emit();
  }

  /// <summary>
  /// Handle help display.
  /// </summary>
  public onShowHelp(): void {
    this.showHelp.emit();
    // Could open a dialog or navigate to help page
    this.notificationService.showInfo('Help: Use toolbar controls to navigate and customize the graph view');
  }

  /// <summary>
  /// Update zoom level from external source.
  /// </summary>
  public updateZoomLevel(zoom: number): void {
    this.zoomLevel.set(zoom);
  }
}
