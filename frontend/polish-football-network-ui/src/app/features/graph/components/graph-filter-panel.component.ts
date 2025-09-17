import { Component, EventEmitter, Output, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GraphFilterCriteria } from '../../../shared/models/graph.model';
import { GraphService } from '../../../core/services/graph.service';
import { NotificationService } from '../../../core/services/notification.service';

/// <summary>
/// Filter option interface for league and connection type filters.
/// </summary>
interface FilterOption {
  id: string;
  label: string;
  color: string;
  icon: string;
  count?: number;
  selected: boolean;
}

/// <summary>
/// Filter panel component for graph visualization.
/// Provides league filters, connection type filters, and display options.
/// </summary>
@Component({
  selector: 'app-graph-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatChipsModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="filter-panel">
      <div class="filter-header">
        <h3>
          <mat-icon>filter_list</mat-icon>
          Filters
        </h3>
        <button
          mat-icon-button
          (click)="onResetFilters()"
          matTooltip="Reset all filters"
          [disabled]="!hasActiveFilters()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Quick stats -->
      <div class="filter-stats" *ngIf="filterStats()">
        <div class="stats-item">
          <span class="stats-value">{{ filterStats()?.visibleNodes }}</span>
          <span class="stats-label">Clubs</span>
        </div>
        <div class="stats-divider">•</div>
        <div class="stats-item">
          <span class="stats-value">{{ filterStats()?.visibleEdges }}</span>
          <span class="stats-label">Connections</span>
        </div>
      </div>

      <!-- League filters -->
      <mat-expansion-panel [expanded]="true" class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>sports_soccer</mat-icon>
            Leagues
          </mat-panel-title>
          <mat-panel-description>
            {{ getSelectedCount(leagueFilters()) }} selected
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="filter-content">
          <div class="filter-options">
            <div
              *ngFor="let option of leagueFilters()"
              class="filter-option"
              [class.selected]="option.selected">
              <mat-checkbox
                [(ngModel)]="option.selected"
                (change)="onLeagueFilterChange()"
                [color]="'primary'">
                <div class="option-content">
                  <mat-icon [style.color]="option.color">{{ option.icon }}</mat-icon>
                  <span class="option-label">{{ option.label }}</span>
                  <span class="option-count" *ngIf="option.count !== undefined">
                    ({{ option.count }})
                  </span>
                </div>
              </mat-checkbox>
            </div>
          </div>

          <div class="filter-actions">
            <button mat-button (click)="onSelectAllLeagues()">Select All</button>
            <button mat-button (click)="onDeselectAllLeagues()">Deselect All</button>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Connection type filters -->
      <mat-expansion-panel [expanded]="true" class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>hub</mat-icon>
            Connection Types
          </mat-panel-title>
          <mat-panel-description>
            {{ getSelectedCount(connectionFilters()) }} selected
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="filter-content">
          <div class="filter-options">
            <div
              *ngFor="let option of connectionFilters()"
              class="filter-option"
              [class.selected]="option.selected">
              <mat-checkbox
                [(ngModel)]="option.selected"
                (change)="onConnectionFilterChange()"
                [color]="'primary'">
                <div class="option-content">
                  <mat-icon [style.color]="option.color">{{ option.icon }}</mat-icon>
                  <span class="option-label">{{ option.label }}</span>
                  <span class="option-count" *ngIf="option.count !== undefined">
                    ({{ option.count }})
                  </span>
                </div>
              </mat-checkbox>
            </div>
          </div>

          <div class="filter-actions">
            <button mat-button (click)="onSelectAllConnections()">Select All</button>
            <button mat-button (click)="onDeselectAllConnections()">Deselect All</button>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Display options -->
      <mat-expansion-panel [expanded]="false" class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>visibility</mat-icon>
            Display Options
          </mat-panel-title>
        </mat-expansion-panel-header>

        <div class="filter-content">
          <!-- Hide isolated nodes -->
          <div class="toggle-option">
            <mat-slide-toggle
              [(ngModel)]="hideIsolatedNodes"
              (change)="onDisplayOptionChange()"
              color="primary">
              Hide isolated clubs
            </mat-slide-toggle>
            <mat-icon
              matTooltip="Hide clubs with no connections"
              class="help-icon">
              help_outline
            </mat-icon>
          </div>

          <!-- Hide weak connections -->
          <div class="toggle-option">
            <mat-slide-toggle
              [(ngModel)]="hideWeakConnections"
              (change)="onDisplayOptionChange()"
              color="primary">
              Hide weak connections
            </mat-slide-toggle>
            <mat-icon
              matTooltip="Hide connections with low strength"
              class="help-icon">
              help_outline
            </mat-icon>
          </div>

          <!-- Show only largest component -->
          <div class="toggle-option">
            <mat-slide-toggle
              [(ngModel)]="showOnlyLargestComponent"
              (change)="onDisplayOptionChange()"
              color="primary">
              Show main network only
            </mat-slide-toggle>
            <mat-icon
              matTooltip="Show only the largest connected component"
              class="help-icon">
              help_outline
            </mat-icon>
          </div>

          <!-- Connection strength slider -->
          <div class="slider-option">
            <label class="slider-label">
              Minimum connection strength
              <span class="slider-value">{{ minConnectionStrength }}</span>
            </label>
            <mat-slider
              [min]="0"
              [max]="100"
              [step]="10"
              [value]="minConnectionStrength"
              (valueChange)="onConnectionStrengthChange($event)"
              color="primary">
            </mat-slider>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Filter summary and actions -->
      <div class="filter-footer">
        <div class="active-filters" *ngIf="hasActiveFilters()">
          <span class="active-filters-label">Active filters:</span>
          <mat-chip-set class="filter-chips">
            <mat-chip
              *ngFor="let filter of getActiveFilterNames()"
              (removed)="onRemoveFilter(filter)"
              removable="true">
              {{ filter }}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
          </mat-chip-set>
        </div>

        <div class="filter-actions-footer">
          <button
            mat-stroked-button
            (click)="onApplyFilters()"
            [disabled]="!hasChanges()"
            color="primary">
            <mat-icon>check</mat-icon>
            Apply Filters
          </button>

          <button
            mat-button
            (click)="onResetFilters()"
            [disabled]="!hasActiveFilters()">
            <mat-icon>clear</mat-icon>
            Reset
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
      max-width: 320px;
      min-width: 280px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-bottom: 1px solid #dee2e6;
    }

    .filter-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .filter-stats {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      gap: 8px;
    }

    .stats-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .stats-value {
      font-size: 18px;
      font-weight: 600;
      color: #1976d2;
    }

    .stats-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stats-divider {
      color: #ccc;
      margin: 0 4px;
    }

    .filter-section {
      margin: 0;
      box-shadow: none;
      border-bottom: 1px solid #e9ecef;
    }

    .filter-section:last-of-type {
      border-bottom: none;
    }

    .filter-content {
      padding: 16px;
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .filter-option {
      transition: background-color 0.2s ease;
      border-radius: 4px;
      padding: 4px;
    }

    .filter-option:hover {
      background: #f8f9fa;
    }

    .filter-option.selected {
      background: #e3f2fd;
    }

    .option-content {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .option-label {
      flex: 1;
      font-size: 14px;
      color: #333;
    }

    .option-count {
      font-size: 12px;
      color: #666;
      margin-left: auto;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }

    .filter-actions button {
      flex: 1;
      font-size: 12px;
    }

    .toggle-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 4px 0;
    }

    .help-icon {
      font-size: 16px;
      color: #999;
      cursor: help;
    }

    .slider-option {
      margin-bottom: 16px;
    }

    .slider-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
    }

    .slider-value {
      font-weight: 600;
      color: #1976d2;
    }

    .filter-footer {
      padding: 16px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .active-filters {
      margin-bottom: 16px;
    }

    .active-filters-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      display: block;
    }

    .filter-chips {
      margin-top: 8px;
    }

    .filter-chips mat-chip {
      font-size: 11px;
      margin: 2px;
    }

    .filter-actions-footer {
      display: flex;
      gap: 8px;
    }

    .filter-actions-footer button {
      flex: 1;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .filter-panel {
        max-width: 100%;
        min-width: 250px;
      }

      .filter-content {
        padding: 12px;
      }

      .filter-header {
        padding: 12px;
      }

      .filter-footer {
        padding: 12px;
      }
    }

    /* Expansion panel customization */
    ::ng-deep .filter-section .mat-expansion-panel-header {
      padding: 0 16px;
      height: 48px;
    }

    ::ng-deep .filter-section .mat-expansion-panel-body {
      padding: 0;
    }

    /* Animation transitions */
    .filter-option, .toggle-option {
      transition: all 0.2s ease;
    }
  `]
})
export class GraphFilterPanelComponent {
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);

  // Output events
  @Output() filtersChanged = new EventEmitter<GraphFilterCriteria>();
  @Output() filtersApplied = new EventEmitter<GraphFilterCriteria>();
  @Output() filtersReset = new EventEmitter<void>();

  // Local state
  public readonly leagueFilters = signal<FilterOption[]>([
    { id: 'ekstraklasa', label: 'Ekstraklasa', color: '#dc2626', icon: 'stars', selected: true },
    { id: 'fortuna1liga', label: 'Fortuna 1 Liga', color: '#2563eb', icon: 'sports_soccer', selected: true },
    { id: 'european', label: 'European Clubs', color: '#059669', icon: 'public', selected: true }
  ]);

  public readonly connectionFilters = signal<FilterOption[]>([
    { id: 'transfer', label: 'Transfers', color: '#059669', icon: 'swap_horiz', selected: true },
    { id: 'loan', label: 'Loans', color: '#7c3aed', icon: 'schedule', selected: true },
    { id: 'partnership', label: 'Partnerships', color: '#dc2626', icon: 'handshake', selected: true },
    { id: 'youth_development', label: 'Youth Development', color: '#2563eb', icon: 'school', selected: true },
    { id: 'management', label: 'Management', color: '#ea580c', icon: 'business_center', selected: true }
  ]);

  // Display options
  public hideIsolatedNodes = signal<boolean>(false);
  public hideWeakConnections = signal<boolean>(false);
  public showOnlyLargestComponent = signal<boolean>(false);
  public minConnectionStrength = signal<number>(0);

  // Computed properties
  public readonly filterStats = computed(() => {
    const graphData = this.graphService.graphData();
    if (!graphData) return null;

    // Calculate visible nodes and edges based on current filters
    const criteria = this.getCurrentFilterCriteria();

    // For now, return total counts (actual filtering would be done in graph service)
    return {
      visibleNodes: graphData.nodes.length,
      visibleEdges: graphData.edges.length
    };
  });

  public readonly hasActiveFilters = computed(() => {
    const leagues = this.leagueFilters();
    const connections = this.connectionFilters();

    const allLeaguesSelected = leagues.every(l => l.selected);
    const allConnectionsSelected = connections.every(c => c.selected);

    return !allLeaguesSelected ||
           !allConnectionsSelected ||
           this.hideIsolatedNodes() ||
           this.hideWeakConnections() ||
           this.showOnlyLargestComponent() ||
           this.minConnectionStrength() > 0;
  });

  public readonly hasChanges = computed(() => {
    // For simplicity, assume there are always changes when filters are active
    return this.hasActiveFilters();
  });

  /// <summary>
  /// Get count of selected filters.
  /// </summary>
  public getSelectedCount(filters: FilterOption[]): number {
    return filters.filter(f => f.selected).length;
  }

  /// <summary>
  /// Handle league filter change.
  /// </summary>
  public onLeagueFilterChange(): void {
    this.filtersChanged.emit(this.getCurrentFilterCriteria());
  }

  /// <summary>
  /// Handle connection filter change.
  /// </summary>
  public onConnectionFilterChange(): void {
    this.filtersChanged.emit(this.getCurrentFilterCriteria());
  }

  /// <summary>
  /// Handle display option change.
  /// </summary>
  public onDisplayOptionChange(): void {
    this.filtersChanged.emit(this.getCurrentFilterCriteria());
  }

  /// <summary>
  /// Handle connection strength change.
  /// </summary>
  public onConnectionStrengthChange(value: number): void {
    this.minConnectionStrength.set(value);
    this.filtersChanged.emit(this.getCurrentFilterCriteria());
  }

  /// <summary>
  /// Select all leagues.
  /// </summary>
  public onSelectAllLeagues(): void {
    const leagues = this.leagueFilters();
    leagues.forEach(league => league.selected = true);
    this.leagueFilters.set([...leagues]);
    this.onLeagueFilterChange();
  }

  /// <summary>
  /// Deselect all leagues.
  /// </summary>
  public onDeselectAllLeagues(): void {
    const leagues = this.leagueFilters();
    leagues.forEach(league => league.selected = false);
    this.leagueFilters.set([...leagues]);
    this.onLeagueFilterChange();
  }

  /// <summary>
  /// Select all connection types.
  /// </summary>
  public onSelectAllConnections(): void {
    const connections = this.connectionFilters();
    connections.forEach(connection => connection.selected = true);
    this.connectionFilters.set([...connections]);
    this.onConnectionFilterChange();
  }

  /// <summary>
  /// Deselect all connection types.
  /// </summary>
  public onDeselectAllConnections(): void {
    const connections = this.connectionFilters();
    connections.forEach(connection => connection.selected = false);
    this.connectionFilters.set([...connections]);
    this.onConnectionFilterChange();
  }

  /// <summary>
  /// Apply current filters.
  /// </summary>
  public onApplyFilters(): void {
    const criteria = this.getCurrentFilterCriteria();
    this.filtersApplied.emit(criteria);
    this.notificationService.showSuccess('Filters applied successfully');
  }

  /// <summary>
  /// Reset all filters to defaults.
  /// </summary>
  public onResetFilters(): void {
    // Reset league filters
    const leagues = this.leagueFilters();
    leagues.forEach(league => league.selected = true);
    this.leagueFilters.set([...leagues]);

    // Reset connection filters
    const connections = this.connectionFilters();
    connections.forEach(connection => connection.selected = true);
    this.connectionFilters.set([...connections]);

    // Reset display options
    this.hideIsolatedNodes.set(false);
    this.hideWeakConnections.set(false);
    this.showOnlyLargestComponent.set(false);
    this.minConnectionStrength.set(0);

    this.filtersReset.emit();
    this.notificationService.showInfo('All filters reset');
  }

  /// <summary>
  /// Get active filter names for display.
  /// </summary>
  public getActiveFilterNames(): string[] {
    const names: string[] = [];

    // League filters
    const leagues = this.leagueFilters();
    const selectedLeagues = leagues.filter(l => l.selected);
    if (selectedLeagues.length < leagues.length) {
      names.push(`${selectedLeagues.length} leagues`);
    }

    // Connection filters
    const connections = this.connectionFilters();
    const selectedConnections = connections.filter(c => c.selected);
    if (selectedConnections.length < connections.length) {
      names.push(`${selectedConnections.length} connection types`);
    }

    // Display options
    if (this.hideIsolatedNodes()) names.push('Hide isolated');
    if (this.hideWeakConnections()) names.push('Hide weak connections');
    if (this.showOnlyLargestComponent()) names.push('Main network only');
    if (this.minConnectionStrength() > 0) names.push(`Min strength: ${this.minConnectionStrength()}%`);

    return names;
  }

  /// <summary>
  /// Remove specific filter.
  /// </summary>
  public onRemoveFilter(filterName: string): void {
    // Implementation would depend on filter name format
    // For now, just reset all filters
    this.onResetFilters();
  }

  /// <summary>
  /// Get current filter criteria.
  /// </summary>
  private getCurrentFilterCriteria(): GraphFilterCriteria {
    const selectedLeagues = this.leagueFilters()
      .filter(l => l.selected)
      .map(l => l.id);

    const selectedConnections = this.connectionFilters()
      .filter(c => c.selected)
      .map(c => c.id);

    return {
      nodeFilters: {
        leagues: selectedLeagues
      },
      edgeFilters: {
        connectionTypes: selectedConnections,
        weightRange: {
          min: this.minConnectionStrength(),
          max: 100
        }
      },
      layoutFilters: {
        hideIsolatedNodes: this.hideIsolatedNodes(),
        hideWeakConnections: this.hideWeakConnections(),
        showOnlyLargestComponent: this.showOnlyLargestComponent()
      }
    };
  }
}
