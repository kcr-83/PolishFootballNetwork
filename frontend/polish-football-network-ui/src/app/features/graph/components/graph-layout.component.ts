import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';

// Import our interactive components
import { GraphToolbarComponent } from './graph-toolbar.component';
import { GraphSearchComponent } from './graph-search.component';
import { GraphFilterPanelComponent } from './graph-filter-panel.component';
import { GraphClubInfoPanelComponent } from './graph-club-info-panel.component';
import { GraphLegendComponent } from './graph-legend.component';

// Import services and models
import { GraphService } from '../../../core/services/graph.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ClubDto } from '../../../shared/models/club.model';
import { ConnectionDto } from '../../../shared/models/connection.model';
import { GraphFilterCriteria, GraphLayoutType, GraphExportOptions } from '../../../shared/models/graph.model';

/// <summary>
/// Main graph layout component that integrates all interactive controls.
/// Provides comprehensive graph visualization with toolbar, search, filters, info panel, and legend.
/// </summary>
@Component({
  selector: 'app-graph-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSidenavModule,
    MatToolbarModule,
    GraphToolbarComponent,
    GraphSearchComponent,
    GraphFilterPanelComponent,
    GraphClubInfoPanelComponent,
    GraphLegendComponent
  ],
  template: `
    <div class="graph-layout" [class.mobile]="isMobile()">
      <!-- Main toolbar -->
      <div class="main-toolbar">
        <app-graph-toolbar
          (zoomIn)="onZoomIn()"
          (zoomOut)="onZoomOut()"
          (zoomFit)="onZoomFit()"
          (zoomReset)="onZoomReset()"
          (layoutChanged)="onLayoutChange($event)"
          (exportGraph)="onExportGraph($event)"
          (toggleLabels)="onToggleLabels($event)"
          (toggleAnimation)="onToggleAnimation($event)"
          (toggleFullscreen)="onToggleFullscreen()"
          class="toolbar-component">
        </app-graph-toolbar>

        <!-- Mobile menu button -->
        <button
          mat-icon-button
          *ngIf="isMobile()"
          (click)="toggleMobileMenu()"
          class="mobile-menu-button"
          matTooltip="Toggle menu">
          <mat-icon>{{ isMobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
        </button>
      </div>

      <!-- Content area with sidenav -->
      <mat-sidenav-container class="graph-container" [hasBackdrop]="isMobile()">
        <!-- Left sidebar for search and filters -->
        <mat-sidenav
          #leftSidenav
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="!isMobile() || isMobileMenuOpen()"
          [disableClose]="!isMobile()"
          class="left-sidebar"
          position="start">

          <div class="sidebar-content">
            <!-- Search component -->
            <div class="search-section">
              <app-graph-search
                (clubSelected)="onClubSelected($event)"
                (clubHighlighted)="onClubHighlighted($event)"
                (searchCleared)="onSearchCleared()"
                class="search-component">
              </app-graph-search>
            </div>

            <!-- Filter panel -->
            <div class="filter-section">
              <app-graph-filter-panel
                (filtersChanged)="onFiltersChanged($event)"
                (filtersApplied)="onFiltersApplied($event)"
                (filtersReset)="onFiltersReset()"
                class="filter-component">
              </app-graph-filter-panel>
            </div>
          </div>
        </mat-sidenav>

        <!-- Main graph content -->
        <mat-sidenav-content class="graph-content">
          <!-- Graph visualization container -->
          <div
            #graphContainer
            class="graph-visualization"
            [class.fullscreen]="isFullscreen()">

            <!-- Graph will be rendered here by Cytoscape -->
            <div class="cytoscape-container" #cytoscapeContainer></div>

            <!-- Loading overlay -->
            <div class="loading-overlay" *ngIf="isLoading()">
              <div class="loading-content">
                <mat-icon class="loading-spinner">refresh</mat-icon>
                <p>Loading graph...</p>
              </div>
            </div>

            <!-- Empty state -->
            <div class="empty-state" *ngIf="!isLoading() && isEmpty()">
              <div class="empty-content">
                <mat-icon>sports_soccer</mat-icon>
                <h3>No Data Available</h3>
                <p>There are no clubs or connections to display in the graph.</p>
                <button mat-raised-button color="primary" (click)="onRefreshData()">
                  <mat-icon>refresh</mat-icon>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          <!-- Floating legend -->
          <div class="legend-container" [class.hidden]="!showLegend()">
            <app-graph-legend
              [graphStats]="graphStats()"
              (itemVisibilityChanged)="onLegendItemVisibilityChanged($event)"
              (categoryToggled)="onLegendCategoryToggled($event)"
              (legendToggled)="onToggleLegend()"
              class="legend-component">
            </app-graph-legend>
          </div>
        </mat-sidenav-content>

        <!-- Right sidebar for club info -->
        <mat-sidenav
          #rightSidenav
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="isClubInfoVisible() && !isMobile()"
          [disableClose]="false"
          class="right-sidebar"
          position="end">

          <!-- Club info panel (rendered as overlay on mobile) -->
          <app-graph-club-info-panel
            [selectedClub]="selectedClub"
            [connections]="clubConnections"
            [isVisible]="isClubInfoVisible"
            (closePanel)="onCloseClubInfo()"
            (editClub)="onEditClub($event)"
            (manageConnections)="onManageConnections($event)"
            (highlightConnection)="onHighlightConnection($event)"
            (selectConnection)="onSelectConnection($event)"
            class="club-info-component">
          </app-graph-club-info-panel>
        </mat-sidenav>
      </mat-sidenav-container>

      <!-- Floating action buttons for mobile -->
      <div class="floating-actions" *ngIf="isMobile()">
        <button
          mat-fab
          color="primary"
          (click)="onToggleSearch()"
          class="fab search-fab"
          matTooltip="Search clubs">
          <mat-icon>search</mat-icon>
        </button>

        <button
          mat-fab
          color="accent"
          (click)="onToggleFilters()"
          class="fab filter-fab"
          matTooltip="Filter graph">
          <mat-icon>filter_list</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .graph-layout {
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f5f5f5;
    }

    .main-toolbar {
      height: 64px;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 1001;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .toolbar-component {
      flex: 1;
    }

    .mobile-menu-button {
      margin-left: 16px;
    }

    .graph-container {
      flex: 1;
      height: calc(100vh - 64px);
    }

    .left-sidebar {
      width: 320px;
      min-width: 280px;
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }

    .right-sidebar {
      width: 400px;
      min-width: 350px;
      background: white;
      border-left: 1px solid #e0e0e0;
    }

    .sidebar-content {
      height: 100%;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .search-section {
      flex-shrink: 0;
    }

    .filter-section {
      flex: 1;
      overflow-y: auto;
    }

    .graph-content {
      position: relative;
      background: white;
    }

    .graph-visualization {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    .graph-visualization.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2000;
      background: white;
    }

    .cytoscape-container {
      width: 100%;
      height: 100%;
      background: #fafafa;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-content {
      text-align: center;
      color: #666;
    }

    .loading-spinner {
      font-size: 48px;
      width: 48px;
      height: 48px;
      animation: spin 2s linear infinite;
      color: #1976d2;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
      max-width: 300px;
    }

    .empty-content mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .empty-content h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .empty-content p {
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .legend-container {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 10;
      transition: all 0.3s ease;
    }

    .legend-container.hidden {
      transform: translateX(-100%);
      opacity: 0;
      pointer-events: none;
    }

    .floating-actions {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 1000;
    }

    .fab {
      width: 56px;
      height: 56px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .search-fab {
      background-color: #1976d2;
    }

    .filter-fab {
      background-color: #f57c00;
    }

    /* Mobile responsive */
    .graph-layout.mobile .left-sidebar {
      width: 100vw;
    }

    .graph-layout.mobile .right-sidebar {
      width: 100vw;
    }

    .graph-layout.mobile .legend-container {
      bottom: 100px;
      left: 10px;
      right: 10px;
      max-width: calc(100vw - 20px);
    }

    .graph-layout.mobile .sidebar-content {
      padding: 12px;
    }

    /* Animations */
    .search-component,
    .filter-component,
    .club-info-component,
    .legend-component {
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Scrollbar styling */
    .sidebar-content::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar-content::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .sidebar-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .sidebar-content::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }

    /* Component integration styles */
    .toolbar-component,
    .search-component,
    .filter-component,
    .club-info-component,
    .legend-component {
      width: 100%;
    }

    /* State transitions */
    .graph-visualization,
    .legend-container,
    .floating-actions {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `]
})
export class GraphLayoutComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // ViewChild references
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;
  @ViewChild('cytoscapeContainer', { static: true }) cytoscapeContainer!: ElementRef;
  @ViewChild('leftSidenav') leftSidenav!: any;
  @ViewChild('rightSidenav') rightSidenav!: any;

  // Reactive state
  public readonly isMobile = signal<boolean>(false);
  public readonly isMobileMenuOpen = signal<boolean>(false);
  public readonly isFullscreen = signal<boolean>(false);
  public readonly isLoading = signal<boolean>(true);
  public readonly showLegend = signal<boolean>(true);
  public readonly selectedClub = signal<ClubDto | null>(null);
  public readonly isClubInfoVisible = signal<boolean>(false);

  // Graph data
  public readonly graphStats = computed(() => {
    const data = this.graphService.graphData();
    if (!data) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        averageDegree: 0,
        components: 0
      };
    }

    const totalNodes = data.nodes.length;
    const totalEdges = data.edges.length;
    const averageDegree = totalNodes > 0 ? Math.round((totalEdges * 2) / totalNodes * 10) / 10 : 0;

    return {
      totalNodes,
      totalEdges,
      averageDegree,
      components: 1 // Simplified for demo
    };
  });

  public readonly clubConnections = computed(() => {
    const club = this.selectedClub();
    const allConnections = this.graphService.graphData()?.edges || [];

    if (!club) return [];

    return allConnections.filter(conn =>
      conn.sourceClub.id === club.id || conn.targetClub.id === club.id
    );
  });

  public readonly isEmpty = computed(() => {
    const data = this.graphService.graphData();
    return !data || (data.nodes.length === 0 && data.edges.length === 0);
  });

  ngOnInit(): void {
    this.setupBreakpointObserver();
    this.initializeGraph();
    this.loadGraphData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Setup responsive breakpoint observer.
  /// </summary>
  private setupBreakpointObserver(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile.set(result.matches);
        if (!result.matches) {
          this.isMobileMenuOpen.set(false);
        }
      });
  }

  /// <summary>
  /// Initialize graph visualization.
  /// </summary>
  private initializeGraph(): void {
    // Initialize Cytoscape graph
    this.graphService.initializeGraph(this.cytoscapeContainer.nativeElement);
  }

  /// <summary>
  /// Load graph data.
  /// </summary>
  private async loadGraphData(): Promise<void> {
    try {
      this.isLoading.set(true);
      await this.graphService.loadGraphData();
      this.notificationService.showSuccess('Graph data loaded successfully');
    } catch (error) {
      this.notificationService.showError('Failed to load graph data');
      console.error('Graph loading error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Toolbar event handlers
  public onZoomIn(): void {
    this.graphService.zoomIn();
  }

  public onZoomOut(): void {
    this.graphService.zoomOut();
  }

  public onZoomFit(): void {
    this.graphService.zoomToFit();
  }

  public onZoomReset(): void {
    this.graphService.resetZoom();
  }

  public onLayoutChange(layoutType: GraphLayoutType): void {
    this.graphService.changeLayout(layoutType);
    this.notificationService.showInfo(`Layout changed to ${layoutType}`);
  }

  public onExportGraph(options: GraphExportOptions): void {
    this.graphService.exportGraph(options);
    this.notificationService.showSuccess(`Graph exported as ${options.format.toUpperCase()}`);
  }

  public onToggleLabels(showLabels: boolean): void {
    this.graphService.toggleLabels(showLabels);
  }

  public onToggleAnimation(enableAnimation: boolean): void {
    this.graphService.toggleAnimation(enableAnimation);
  }

  public onToggleFullscreen(): void {
    this.isFullscreen.set(!this.isFullscreen());
    if (this.isFullscreen()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Search event handlers
  public onClubSelected(club: ClubDto): void {
    this.selectedClub.set(club);
    this.isClubInfoVisible.set(true);
    this.graphService.selectClub(club.id.toString());

    if (this.isMobile()) {
      this.rightSidenav?.open();
    }
  }

  public onClubHighlighted(clubId: string): void {
    this.graphService.highlightClub(clubId);
  }

  public onSearchCleared(): void {
    this.graphService.clearHighlights();
  }

  // Filter event handlers
  public onFiltersChanged(criteria: GraphFilterCriteria): void {
    // Apply filters immediately for real-time feedback
    this.graphService.applyFilters(criteria);
  }

  public onFiltersApplied(criteria: GraphFilterCriteria): void {
    this.graphService.applyFilters(criteria);
    this.notificationService.showSuccess('Filters applied successfully');
  }

  public onFiltersReset(): void {
    this.graphService.resetFilters();
    this.notificationService.showInfo('All filters reset');
  }

  // Club info panel event handlers
  public onCloseClubInfo(): void {
    this.isClubInfoVisible.set(false);
    this.selectedClub.set(null);
    this.graphService.clearSelection();

    if (this.isMobile()) {
      this.rightSidenav?.close();
    }
  }

  public onEditClub(club: ClubDto): void {
    // Navigate to edit club page or open modal
    this.notificationService.showInfo(`Edit club: ${club.name}`);
  }

  public onManageConnections(club: ClubDto): void {
    // Navigate to manage connections page or open modal
    this.notificationService.showInfo(`Manage connections for: ${club.name}`);
  }

  public onHighlightConnection(connectionId: string): void {
    this.graphService.highlightConnection(connectionId);
  }

  public onSelectConnection(connection: ConnectionDto): void {
    this.graphService.selectConnection(connection.id.toString());
  }

  // Legend event handlers
  public onLegendItemVisibilityChanged(event: { itemId: string; visible: boolean }): void {
    this.graphService.toggleItemVisibility(event.itemId, event.visible);
  }

  public onLegendCategoryToggled(event: { categoryId: string; expanded: boolean }): void {
    // Handle category expansion state if needed
  }

  public onToggleLegend(): void {
    this.showLegend.set(!this.showLegend());
  }

  // Mobile specific handlers
  public toggleMobileMenu(): void {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  public onToggleSearch(): void {
    this.leftSidenav?.toggle();
  }

  public onToggleFilters(): void {
    this.leftSidenav?.toggle();
  }

  // Utility handlers
  public onRefreshData(): void {
    this.loadGraphData();
  }
}
