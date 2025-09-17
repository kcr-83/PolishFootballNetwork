import { Component, EventEmitter, Output, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/// <summary>
/// Legend item interface for connection types and leagues.
/// </summary>
interface LegendItem {
  id: string;
  label: string;
  color: string;
  icon: string;
  description: string;
  count?: number;
  visible: boolean;
}

/// <summary>
/// Legend category interface for organizing legend items.
/// </summary>
interface LegendCategory {
  id: string;
  title: string;
  icon: string;
  items: LegendItem[];
  expanded: boolean;
}

/// <summary>
/// Legend component for graph visualization.
/// Provides connection type indicators, league classifications, and help information.
/// </summary>
@Component({
  selector: 'app-graph-legend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="legend-panel" [class.collapsed]="isCollapsed()">
      <!-- Legend header -->
      <div class="legend-header">
        <div class="header-title">
          <mat-icon>legend_toggle</mat-icon>
          <h3>Legend</h3>
        </div>

        <div class="header-actions">
          <button
            mat-icon-button
            (click)="onToggleCollapse()"
            [matTooltip]="isCollapsed() ? 'Expand legend' : 'Collapse legend'"
            class="collapse-button">
            <mat-icon>{{ isCollapsed() ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>

          <button
            mat-icon-button
            (click)="onToggleLegend()"
            matTooltip="Hide legend"
            class="hide-button">
            <mat-icon>visibility_off</mat-icon>
          </button>
        </div>
      </div>

      <!-- Legend content -->
      <div class="legend-content" *ngIf="!isCollapsed()">
        <!-- Legend categories -->
        <div class="legend-categories">
          <mat-expansion-panel
            *ngFor="let category of legendCategories()"
            [expanded]="category.expanded"
            (expandedChange)="onCategoryToggle(category, $event)"
            class="legend-category">

            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>{{ category.icon }}</mat-icon>
                {{ category.title }}
              </mat-panel-title>
              <mat-panel-description>
                {{ getVisibleItemsCount(category) }} of {{ category.items.length }} visible
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="category-content">
              <!-- Category items -->
              <div class="legend-items">
                <div
                  *ngFor="let item of category.items"
                  class="legend-item"
                  [class.hidden]="!item.visible">

                  <div class="item-indicator">
                    <mat-icon
                      [style.color]="item.color"
                      [matTooltip]="item.description">
                      {{ item.icon }}
                    </mat-icon>
                  </div>

                  <div class="item-content">
                    <div class="item-header">
                      <span class="item-label">{{ item.label }}</span>
                      <span class="item-count" *ngIf="item.count !== undefined">
                        ({{ item.count }})
                      </span>
                    </div>
                    <p class="item-description">{{ item.description }}</p>
                  </div>

                  <div class="item-actions">
                    <mat-slide-toggle
                      [(ngModel)]="item.visible"
                      (change)="onItemVisibilityChange(item)"
                      color="primary"
                      [matTooltip]="'Toggle ' + item.label"
                      class="visibility-toggle">
                    </mat-slide-toggle>
                  </div>
                </div>
              </div>

              <!-- Category actions -->
              <div class="category-actions">
                <button
                  mat-button
                  (click)="onShowAllItems(category)"
                  class="action-button">
                  <mat-icon>visibility</mat-icon>
                  Show All
                </button>

                <button
                  mat-button
                  (click)="onHideAllItems(category)"
                  class="action-button">
                  <mat-icon>visibility_off</mat-icon>
                  Hide All
                </button>
              </div>
            </div>
          </mat-expansion-panel>
        </div>

        <!-- Graph statistics -->
        <div class="legend-stats">
          <h4>
            <mat-icon>analytics</mat-icon>
            Graph Statistics
          </h4>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Total Nodes</span>
              <span class="stat-value">{{ graphStats().totalNodes }}</span>
            </div>

            <div class="stat-item">
              <span class="stat-label">Total Edges</span>
              <span class="stat-value">{{ graphStats().totalEdges }}</span>
            </div>

            <div class="stat-item">
              <span class="stat-label">Avg Degree</span>
              <span class="stat-value">{{ graphStats().averageDegree }}</span>
            </div>

            <div class="stat-item">
              <span class="stat-label">Components</span>
              <span class="stat-value">{{ graphStats().components }}</span>
            </div>
          </div>
        </div>

        <!-- Help section -->
        <div class="legend-help">
          <mat-expansion-panel class="help-section">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>help</mat-icon>
                Help & Tips
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="help-content">
              <div class="help-item">
                <mat-icon>mouse</mat-icon>
                <div class="help-text">
                  <strong>Click</strong> a club to select and view details
                </div>
              </div>

              <div class="help-item">
                <mat-icon>pan_tool</mat-icon>
                <div class="help-text">
                  <strong>Drag</strong> to pan around the graph
                </div>
              </div>

              <div class="help-item">
                <mat-icon>zoom_in</mat-icon>
                <div class="help-text">
                  <strong>Scroll</strong> to zoom in and out
                </div>
              </div>

              <div class="help-item">
                <mat-icon>search</mat-icon>
                <div class="help-text">
                  <strong>Search</strong> for clubs using the search bar
                </div>
              </div>

              <div class="help-item">
                <mat-icon>filter_list</mat-icon>
                <div class="help-text">
                  <strong>Filter</strong> clubs and connections using the filter panel
                </div>
              </div>
            </div>
          </mat-expansion-panel>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legend-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
      max-width: 300px;
      min-width: 250px;
      transition: all 0.3s ease;
    }

    .legend-panel.collapsed {
      max-height: 60px;
    }

    .legend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-bottom: 1px solid #dee2e6;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .collapse-button,
    .hide-button {
      width: 32px;
      height: 32px;
      line-height: 32px;
    }

    .legend-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 8px 0;
    }

    .legend-categories {
      margin-bottom: 16px;
    }

    .legend-category {
      margin: 0;
      box-shadow: none;
      border-bottom: 1px solid #e9ecef;
    }

    .legend-category:last-of-type {
      border-bottom: none;
    }

    .category-content {
      padding: 16px;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .legend-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .legend-item:hover {
      background: #f8f9fa;
    }

    .legend-item.hidden {
      opacity: 0.5;
    }

    .item-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
    }

    .item-content {
      flex: 1;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .item-label {
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .item-count {
      font-size: 12px;
      color: #666;
    }

    .item-description {
      margin: 0;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    .item-actions {
      display: flex;
      align-items: center;
    }

    .visibility-toggle {
      transform: scale(0.8);
    }

    .category-actions {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid #e9ecef;
    }

    .action-button {
      flex: 1;
      font-size: 12px;
    }

    .legend-stats {
      padding: 16px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      border-bottom: 1px solid #e9ecef;
    }

    .legend-stats h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      text-align: center;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #1976d2;
    }

    .legend-help {
      margin: 0;
    }

    .help-section {
      box-shadow: none;
      border: none;
    }

    .help-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .help-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .help-item mat-icon {
      color: #1976d2;
      margin-top: 2px;
    }

    .help-text {
      flex: 1;
      font-size: 13px;
      line-height: 1.4;
      color: #555;
    }

    .help-text strong {
      color: #333;
      font-weight: 600;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .legend-panel {
        max-width: 100%;
        min-width: 200px;
      }

      .legend-header {
        padding: 12px;
      }

      .category-content {
        padding: 12px;
      }

      .legend-stats {
        padding: 12px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 6px;
      }
    }

    /* Scrollbar styling */
    .legend-content::-webkit-scrollbar {
      width: 4px;
    }

    .legend-content::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .legend-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 2px;
    }

    .legend-content::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }

    /* Expansion panel customization */
    ::ng-deep .legend-category .mat-expansion-panel-header {
      padding: 0 16px;
      height: 48px;
    }

    ::ng-deep .legend-category .mat-expansion-panel-body {
      padding: 0;
    }

    ::ng-deep .help-section .mat-expansion-panel-header {
      padding: 0 16px;
      height: 48px;
    }

    ::ng-deep .help-section .mat-expansion-panel-body {
      padding: 0;
    }

    /* Animation transitions */
    .legend-item, .stat-item, .help-item {
      transition: all 0.2s ease;
    }
  `]
})
export class GraphLegendComponent {
  // Output events
  @Output() itemVisibilityChanged = new EventEmitter<{ itemId: string; visible: boolean }>();
  @Output() categoryToggled = new EventEmitter<{ categoryId: string; expanded: boolean }>();
  @Output() legendToggled = new EventEmitter<void>();

  // Input properties
  @Input() graphStats = signal({
    totalNodes: 0,
    totalEdges: 0,
    averageDegree: 0,
    components: 0
  });

  // Local state
  public readonly isCollapsed = signal<boolean>(false);

  // Legend data
  public readonly legendCategories = signal<LegendCategory[]>([
    {
      id: 'connection-types',
      title: 'Connection Types',
      icon: 'hub',
      expanded: true,
      items: [
        {
          id: 'transfer',
          label: 'Transfers',
          color: '#059669',
          icon: 'swap_horiz',
          description: 'Player transfers between clubs',
          count: 45,
          visible: true
        },
        {
          id: 'loan',
          label: 'Loans',
          color: '#7c3aed',
          icon: 'schedule',
          description: 'Temporary player loans',
          count: 28,
          visible: true
        },
        {
          id: 'partnership',
          label: 'Partnerships',
          color: '#dc2626',
          icon: 'handshake',
          description: 'Strategic partnerships and collaborations',
          count: 12,
          visible: true
        },
        {
          id: 'youth_development',
          label: 'Youth Development',
          color: '#2563eb',
          icon: 'school',
          description: 'Youth academy and development programs',
          count: 18,
          visible: true
        },
        {
          id: 'management',
          label: 'Management',
          color: '#ea580c',
          icon: 'business_center',
          description: 'Coaching and management staff connections',
          count: 22,
          visible: true
        }
      ]
    },
    {
      id: 'leagues',
      title: 'League Classifications',
      icon: 'sports_soccer',
      expanded: true,
      items: [
        {
          id: 'ekstraklasa',
          label: 'Ekstraklasa',
          color: '#dc2626',
          icon: 'stars',
          description: 'Top tier Polish football league',
          count: 18,
          visible: true
        },
        {
          id: 'fortuna1liga',
          label: 'Fortuna 1 Liga',
          color: '#2563eb',
          icon: 'sports_soccer',
          description: 'Second tier Polish football league',
          count: 18,
          visible: true
        },
        {
          id: 'european',
          label: 'European Clubs',
          color: '#059669',
          icon: 'public',
          description: 'European clubs with connections to Polish football',
          count: 24,
          visible: true
        }
      ]
    },
    {
      id: 'node-sizes',
      title: 'Node Sizes',
      icon: 'circle',
      expanded: false,
      items: [
        {
          id: 'large-node',
          label: 'Large',
          color: '#1976d2',
          icon: 'radio_button_checked',
          description: 'Clubs with many connections (>10)',
          visible: true
        },
        {
          id: 'medium-node',
          label: 'Medium',
          color: '#1976d2',
          icon: 'radio_button_checked',
          description: 'Clubs with moderate connections (5-10)',
          visible: true
        },
        {
          id: 'small-node',
          label: 'Small',
          color: '#1976d2',
          icon: 'radio_button_checked',
          description: 'Clubs with few connections (<5)',
          visible: true
        }
      ]
    }
  ]);

  /// <summary>
  /// Get count of visible items in category.
  /// </summary>
  public getVisibleItemsCount(category: LegendCategory): number {
    return category.items.filter(item => item.visible).length;
  }

  /// <summary>
  /// Handle category toggle.
  /// </summary>
  public onCategoryToggle(category: LegendCategory, expanded: boolean): void {
    category.expanded = expanded;
    this.categoryToggled.emit({ categoryId: category.id, expanded });
  }

  /// <summary>
  /// Handle item visibility change.
  /// </summary>
  public onItemVisibilityChange(item: LegendItem): void {
    this.itemVisibilityChanged.emit({ itemId: item.id, visible: item.visible });
  }

  /// <summary>
  /// Show all items in category.
  /// </summary>
  public onShowAllItems(category: LegendCategory): void {
    category.items.forEach(item => {
      if (!item.visible) {
        item.visible = true;
        this.itemVisibilityChanged.emit({ itemId: item.id, visible: true });
      }
    });
  }

  /// <summary>
  /// Hide all items in category.
  /// </summary>
  public onHideAllItems(category: LegendCategory): void {
    category.items.forEach(item => {
      if (item.visible) {
        item.visible = false;
        this.itemVisibilityChanged.emit({ itemId: item.id, visible: false });
      }
    });
  }

  /// <summary>
  /// Toggle legend collapse state.
  /// </summary>
  public onToggleCollapse(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

  /// <summary>
  /// Toggle legend visibility.
  /// </summary>
  public onToggleLegend(): void {
    this.legendToggled.emit();
  }
}
