import { Component, EventEmitter, Output, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { ClubDto } from '../../../shared/models/club.model';
import { ConnectionDto } from '../../../shared/models/connection.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

/// <summary>
/// Club connection information for display.
/// </summary>
interface ClubConnection {
  id: string;
  targetClub: string;
  type: string;
  strength: number;
  description?: string;
  color: string;
  icon: string;
  date?: Date;
  isIncoming: boolean;
}

/// <summary>
/// Club statistics information.
/// </summary>
interface ClubStats {
  totalConnections: number;
  incomingConnections: number;
  outgoingConnections: number;
  averageStrength: number;
  strongestConnection: string;
  networkPosition: string;
}

/// <summary>
/// Club info panel component for displaying detailed club information.
/// Provides slide-out panel with club details, connections, and admin controls.
/// </summary>
@Component({
  selector: 'app-graph-club-info-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatTabsModule
  ],
  template: `
    <div
      class="club-info-panel"
      [class.visible]="isVisible()"
      [class.mobile]="isMobile()">

      <!-- Panel header -->
      <div class="panel-header">
        <div class="header-content">
          <div class="club-basic-info">
            <div class="club-logo" *ngIf="selectedClub()?.logoUrl">
              <img [src]="selectedClub()?.logoUrl" [alt]="selectedClub()?.name + ' logo'">
            </div>
            <div class="club-icon" *ngIf="!selectedClub()?.logoUrl">
              <mat-icon>sports_soccer</mat-icon>
            </div>
            <div class="club-title">
              <h2>{{ selectedClub()?.name }}</h2>
              <p class="club-subtitle">{{ selectedClub()?.city }}</p>
            </div>
          </div>

          <button
            mat-icon-button
            (click)="onClose()"
            class="close-button"
            matTooltip="Close panel">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Quick stats -->
        <div class="quick-stats" *ngIf="clubStats()">
          <div class="stat-item">
            <span class="stat-value">{{ clubStats()?.totalConnections }}</span>
            <span class="stat-label">Connections</span>
          </div>
          <div class="stat-divider">•</div>
          <div class="stat-item">
            <span class="stat-value">{{ clubStats()?.averageStrength }}%</span>
            <span class="stat-label">Avg Strength</span>
          </div>
          <div class="stat-divider">•</div>
          <div class="stat-item">
            <span class="stat-value">{{ clubStats()?.networkPosition }}</span>
            <span class="stat-label">Position</span>
          </div>
        </div>
      </div>

      <!-- Panel content with tabs -->
      <div class="panel-content">
        <mat-tab-group
          [selectedIndex]="selectedTabIndex()"
          (selectedTabChange)="onTabChange($event.index)"
          class="info-tabs">

          <!-- Overview tab -->
          <mat-tab label="Overview">
            <div class="tab-content">
              <!-- Club details -->
              <div class="club-details">
                <div class="detail-section">
                  <h3>
                    <mat-icon>info</mat-icon>
                    Club Information
                  </h3>

                  <div class="detail-grid">
                    <div class="detail-item" *ngIf="selectedClub()?.league">
                      <label>League:</label>
                      <mat-chip [style.background-color]="getLeagueColor(selectedClub()?.league)">
                        {{ selectedClub()?.league }}
                      </mat-chip>
                    </div>

                    <div class="detail-item" *ngIf="selectedClub()?.founded">
                      <label>Founded:</label>
                      <span>{{ selectedClub()?.founded }}</span>
                    </div>

                    <div class="detail-item" *ngIf="selectedClub()?.stadium">
                      <label>Stadium:</label>
                      <span>{{ selectedClub()?.stadium }}</span>
                    </div>

                    <div class="detail-item" *ngIf="selectedClub()?.capacity">
                      <label>Capacity:</label>
                      <span>{{ selectedClub()?.capacity | number }}</span>
                    </div>
                  </div>
                </div>

                <!-- External links -->
                <div class="detail-section" *ngIf="hasExternalLinks()">
                  <h3>
                    <mat-icon>link</mat-icon>
                    External Links
                  </h3>

                  <div class="external-links">
                    <button
                      mat-stroked-button
                      *ngIf="selectedClub()?.website"
                      (click)="onOpenLink(selectedClub()?.website, 'website')"
                      class="link-button">
                      <mat-icon>public</mat-icon>
                      Official Website
                    </button>
                  </div>
                </div>

                <!-- Admin actions -->
                <div class="detail-section" *ngIf="isAdmin()">
                  <h3>
                    <mat-icon>admin_panel_settings</mat-icon>
                    Admin Actions
                  </h3>

                  <div class="admin-actions">
                    <button
                      mat-raised-button
                      color="primary"
                      (click)="onEditClub()"
                      class="admin-button">
                      <mat-icon>edit</mat-icon>
                      Edit Club
                    </button>

                    <button
                      mat-stroked-button
                      color="accent"
                      (click)="onManageConnections()"
                      class="admin-button">
                      <mat-icon>hub</mat-icon>
                      Manage Connections
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Connections tab -->
          <mat-tab [label]="getConnectionsTabLabel()">
            <div class="tab-content">
              <div class="connections-section">
                <!-- Connection filters -->
                <div class="connection-filters">
                  <mat-chip-set>
                    <mat-chip
                      *ngFor="let type of getConnectionTypes()"
                      [class.selected-chip]="selectedConnectionType() === type.id"
                      (click)="onFilterConnections(type.id)"
                      [style.color]="type.color"
                      class="connection-type-chip">
                      <mat-icon>{{ type.icon }}</mat-icon>
                      {{ type.label }}
                      <span class="connection-count">({{ type.count }})</span>
                    </mat-chip>
                  </mat-chip-set>
                </div>

                <!-- Connections list -->
                <div class="connections-list">
                  <div
                    *ngFor="let connection of getFilteredConnections()"
                    class="connection-item"
                    [class.incoming]="connection.isIncoming"
                    (click)="onSelectConnection(connection)">

                    <div class="connection-icon">
                      <mat-icon
                        [style.color]="connection.color"
                        [matTooltip]="connection.type">
                        {{ connection.icon }}
                      </mat-icon>
                      <mat-icon
                        class="direction-icon"
                        [class.incoming]="connection.isIncoming">
                        {{ connection.isIncoming ? 'arrow_forward' : 'arrow_back' }}
                      </mat-icon>
                    </div>

                    <div class="connection-details">
                      <div class="connection-header">
                        <span class="target-club">{{ connection.targetClub }}</span>
                        <span class="connection-strength">{{ connection.strength }}%</span>
                      </div>

                      <div class="connection-meta">
                        <span class="connection-type">{{ connection.type }}</span>
                        <span class="connection-date" *ngIf="connection.date">
                          {{ connection.date | date:'MMM yyyy' }}
                        </span>
                      </div>

                      <p class="connection-description" *ngIf="connection.description">
                        {{ connection.description }}
                      </p>
                    </div>

                    <div class="connection-actions">
                      <button
                        mat-icon-button
                        (click)="onHighlightConnection(connection, $event)"
                        matTooltip="Highlight in graph">
                        <mat-icon>visibility</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Empty state -->
                  <div class="empty-connections" *ngIf="getFilteredConnections().length === 0">
                    <mat-icon>hub</mat-icon>
                    <p>No connections found</p>
                    <span>This club has no {{ selectedConnectionType() === 'all' ? '' : selectedConnectionType() }} connections.</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Statistics tab -->
          <mat-tab label="Statistics">
            <div class="tab-content">
              <div class="stats-section">
                <div class="stats-grid">
                  <div class="stats-card">
                    <div class="stats-icon">
                      <mat-icon>hub</mat-icon>
                    </div>
                    <div class="stats-content">
                      <span class="stats-number">{{ clubStats()?.totalConnections }}</span>
                      <span class="stats-label">Total Connections</span>
                    </div>
                  </div>

                  <div class="stats-card">
                    <div class="stats-icon incoming">
                      <mat-icon>arrow_forward</mat-icon>
                    </div>
                    <div class="stats-content">
                      <span class="stats-number">{{ clubStats()?.incomingConnections }}</span>
                      <span class="stats-label">Incoming</span>
                    </div>
                  </div>

                  <div class="stats-card">
                    <div class="stats-icon outgoing">
                      <mat-icon>arrow_back</mat-icon>
                    </div>
                    <div class="stats-content">
                      <span class="stats-number">{{ clubStats()?.outgoingConnections }}</span>
                      <span class="stats-label">Outgoing</span>
                    </div>
                  </div>

                  <div class="stats-card">
                    <div class="stats-icon">
                      <mat-icon>trending_up</mat-icon>
                    </div>
                    <div class="stats-content">
                      <span class="stats-number">{{ clubStats()?.averageStrength }}%</span>
                      <span class="stats-label">Avg Strength</span>
                    </div>
                  </div>
                </div>

                <div class="network-position">
                  <h3>Network Position</h3>
                  <div class="position-info">
                    <mat-icon>account_tree</mat-icon>
                    <span>{{ clubStats()?.networkPosition }}</span>
                  </div>
                  <p class="position-description">
                    This club's position within the football network based on connection strength and centrality.
                  </p>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

    <!-- Backdrop for mobile -->
    <div
      class="panel-backdrop"
      *ngIf="isVisible() && isMobile()"
      (click)="onClose()">
    </div>
  `,
  styles: [`
    .club-info-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .club-info-panel.visible {
      right: 0;
    }

    .club-info-panel.mobile {
      width: 100vw;
      right: -100vw;
    }

    .club-info-panel.mobile.visible {
      right: 0;
    }

    .panel-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      z-index: 999;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .panel-header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 20px;
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .club-basic-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .club-logo img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: white;
      padding: 4px;
    }

    .club-icon {
      width: 48px;
      height: 48px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .club-title h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .club-subtitle {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .close-button {
      color: white;
    }

    .quick-stats {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
    }

    .stat-label {
      font-size: 11px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-divider {
      opacity: 0.7;
      margin: 0 4px;
    }

    .panel-content {
      flex: 1;
      overflow: hidden;
    }

    .info-tabs {
      height: 100%;
    }

    ::ng-deep .info-tabs .mat-mdc-tab-body-wrapper {
      height: calc(100% - 48px);
    }

    ::ng-deep .info-tabs .mat-mdc-tab-body-content {
      height: 100%;
      overflow-y: auto;
    }

    .tab-content {
      padding: 20px;
      height: 100%;
      overflow-y: auto;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .detail-grid {
      display: grid;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item label {
      font-weight: 500;
      color: #666;
    }

    .external-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-button {
      justify-content: flex-start;
      gap: 8px;
    }

    .admin-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .admin-button {
      justify-content: flex-start;
      gap: 8px;
    }

    .connection-filters {
      margin-bottom: 16px;
    }

    .connection-type-chip {
      margin: 2px;
      cursor: pointer;
    }

    .connection-type-chip.selected-chip {
      background-color: #1976d2;
      color: white !important;
    }

    .connection-count {
      margin-left: 4px;
      font-size: 11px;
      opacity: 0.8;
    }

    .connections-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .connection-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .connection-item:hover {
      background: #f8f9fa;
      border-color: #1976d2;
    }

    .connection-item.incoming {
      border-left: 4px solid #4caf50;
    }

    .connection-item:not(.incoming) {
      border-left: 4px solid #2196f3;
    }

    .connection-icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .direction-icon {
      position: absolute;
      top: -4px;
      right: -4px;
      font-size: 12px;
      background: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .direction-icon.incoming {
      color: #4caf50;
    }

    .direction-icon:not(.incoming) {
      color: #2196f3;
    }

    .connection-details {
      flex: 1;
    }

    .connection-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .target-club {
      font-weight: 600;
      color: #333;
    }

    .connection-strength {
      font-weight: 600;
      color: #1976d2;
      font-size: 12px;
    }

    .connection-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .connection-description {
      font-size: 12px;
      color: #666;
      margin: 0;
      line-height: 1.4;
    }

    .connection-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .empty-connections {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-connections mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-connections p {
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    .empty-connections span {
      font-size: 14px;
      opacity: 0.8;
    }

    .stats-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .stats-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }

    .stats-icon {
      width: 40px;
      height: 40px;
      background: #1976d2;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stats-icon.incoming {
      background: #4caf50;
    }

    .stats-icon.outgoing {
      background: #2196f3;
    }

    .stats-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stats-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .stats-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .network-position {
      padding: 20px;
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      border-radius: 8px;
    }

    .network-position h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .position-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .position-info span {
      font-size: 18px;
      font-weight: 600;
      color: #1976d2;
    }

    .position-description {
      margin: 0;
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .club-info-panel {
        width: 100vw;
        right: -100vw;
      }

      .panel-header {
        padding: 16px;
      }

      .tab-content {
        padding: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GraphClubInfoPanelComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  // Input properties
  @Input() selectedClub = signal<ClubDto | null>(null);
  @Input() connections = signal<ConnectionDto[]>([]);
  @Input() isVisible = signal<boolean>(false);

  // Output events
  @Output() closePanel = new EventEmitter<void>();
  @Output() editClub = new EventEmitter<ClubDto>();
  @Output() manageConnections = new EventEmitter<ClubDto>();
  @Output() highlightConnection = new EventEmitter<string>();
  @Output() selectConnection = new EventEmitter<ConnectionDto>();

  // Local state
  public readonly selectedTabIndex = signal<number>(0);
  public readonly selectedConnectionType = signal<string>('all');
  public readonly isMobile = signal<boolean>(window.innerWidth <= 768);

  // Computed properties
  public readonly isAdmin = computed(() => {
    return true; // Simplified admin check for demo - always true
  });

  public readonly clubStats = computed(() => {
    const club = this.selectedClub();
    const connections = this.connections();

    if (!club || !connections.length) return null;

    const clubConnections = connections.filter(c =>
      c.sourceClub.id === club.id || c.targetClub.id === club.id
    );

    const incoming = clubConnections.filter(c => c.targetClub.id === club.id);
    const outgoing = clubConnections.filter(c => c.sourceClub.id === club.id);

    const avgStrength = clubConnections.length > 0
      ? Math.round(clubConnections.reduce((sum, c) => sum + Number(c.type), 0) / clubConnections.length)
      : 0;

    const strongestConnection = clubConnections
      .sort((a, b) => Number(b.type) - Number(a.type))[0];

    // Calculate network position based on connections
    let position = 'Peripheral';
    if (clubConnections.length > 10) position = 'Central Hub';
    else if (clubConnections.length > 5) position = 'Well Connected';
    else if (clubConnections.length > 2) position = 'Connected';

    return {
      totalConnections: clubConnections.length,
      incomingConnections: incoming.length,
      outgoingConnections: outgoing.length,
      averageStrength: avgStrength,
      strongestConnection: strongestConnection?.targetClub.name || strongestConnection?.sourceClub.name || '',
      networkPosition: position
    };
  });

  public readonly clubConnections = computed(() => {
    const club = this.selectedClub();
    const connections = this.connections();

    if (!club || !connections.length) return [];

    return connections
      .filter(c => c.sourceClub.id === club.id || c.targetClub.id === club.id)
      .map(c => this.mapToClubConnection(c, club.id.toString()));
  });

  /// <summary>
  /// Get connections tab label with count.
  /// </summary>
  public getConnectionsTabLabel(): string {
    const count = this.clubConnections().length;
    return `Connections (${count})`;
  }

  /// <summary>
  /// Check if club has external links.
  /// </summary>
  public hasExternalLinks(): boolean {
    const club = this.selectedClub();
    return !!(club?.website);
  }

  /// <summary>
  /// Get league color for display.
  /// </summary>
  public getLeagueColor(league?: string): string {
    switch (league) {
      case 'Ekstraklasa': return '#dc2626';
      case 'Fortuna 1 Liga': return '#2563eb';
      case 'European': return '#059669';
      default: return '#6b7280';
    }
  }

  /// <summary>
  /// Get connection types with counts.
  /// </summary>
  public getConnectionTypes() {
    const connections = this.clubConnections();
    const types = new Map<string, { count: number; color: string; icon: string; label: string }>();

    // Initialize all types
    const allTypes = [
      { id: 'transfer', label: 'Transfers', color: '#059669', icon: 'swap_horiz' },
      { id: 'loan', label: 'Loans', color: '#7c3aed', icon: 'schedule' },
      { id: 'partnership', label: 'Partnerships', color: '#dc2626', icon: 'handshake' },
      { id: 'youth_development', label: 'Youth Development', color: '#2563eb', icon: 'school' },
      { id: 'management', label: 'Management', color: '#ea580c', icon: 'business_center' }
    ];

    allTypes.forEach(type => {
      types.set(type.id, { count: 0, ...type });
    });

    // Count connections by type
    connections.forEach(conn => {
      const existing = types.get(conn.type);
      if (existing) {
        existing.count++;
      }
    });

    // Convert to array and add 'all' option
    const result = Array.from(types.entries()).map(([id, data]) => ({
      id,
      ...data
    }));

    result.unshift({
      id: 'all',
      label: 'All Types',
      color: '#6b7280',
      icon: 'hub',
      count: connections.length
    });

    return result;
  }

  /// <summary>
  /// Get filtered connections based on selected type.
  /// </summary>
  public getFilteredConnections(): ClubConnection[] {
    const connections = this.clubConnections();
    const selectedType = this.selectedConnectionType();

    if (selectedType === 'all') {
      return connections;
    }

    return connections.filter(c => c.type === selectedType);
  }

  /// <summary>
  /// Handle tab change.
  /// </summary>
  public onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
  }

  /// <summary>
  /// Handle connection type filter.
  /// </summary>
  public onFilterConnections(type: string): void {
    this.selectedConnectionType.set(type);
  }

  /// <summary>
  /// Handle panel close.
  /// </summary>
  public onClose(): void {
    this.closePanel.emit();
  }

  /// <summary>
  /// Handle edit club action.
  /// </summary>
  public onEditClub(): void {
    const club = this.selectedClub();
    if (club) {
      this.editClub.emit(club);
    }
  }

  /// <summary>
  /// Handle manage connections action.
  /// </summary>
  public onManageConnections(): void {
    const club = this.selectedClub();
    if (club) {
      this.manageConnections.emit(club);
    }
  }

  /// <summary>
  /// Handle open external link.
  /// </summary>
  public onOpenLink(url?: string, type?: string): void {
    if (url) {
      window.open(url, '_blank');
      this.notificationService.showInfo(`Opening ${type} in new tab`);
    }
  }

  /// <summary>
  /// Handle highlight connection.
  /// </summary>
  public onHighlightConnection(connection: ClubConnection, event: Event): void {
    event.stopPropagation();
    this.highlightConnection.emit(connection.id);
  }

  /// <summary>
  /// Handle select connection.
  /// </summary>
  public onSelectConnection(connection: ClubConnection): void {
    const originalConnection = this.connections().find(c => c.id.toString() === connection.id);
    if (originalConnection) {
      this.selectConnection.emit(originalConnection);
    }
  }

  /// <summary>
  /// Map connection to club connection format.
  /// </summary>
  private mapToClubConnection(connection: ConnectionDto, clubId: string): ClubConnection {
    const isIncoming = connection.targetClub.id.toString() === clubId;
    const targetClub = isIncoming ? connection.sourceClub : connection.targetClub;

    const targetClubName = targetClub.name;

    const typeInfo = this.getConnectionTypeInfo(connection.type);

    return {
      id: connection.id.toString(),
      targetClub: targetClubName,
      type: connection.type,
      strength: 75, // Default strength for demo
      description: connection.description,
      color: typeInfo.color,
      icon: typeInfo.icon,
      date: connection.createdAt,
      isIncoming: isIncoming
    };
  }

  /// <summary>
  /// Get connection type visual information.
  /// </summary>
  private getConnectionTypeInfo(type: string): { color: string; icon: string } {
    switch (type) {
      case 'transfer': return { color: '#059669', icon: 'swap_horiz' };
      case 'loan': return { color: '#7c3aed', icon: 'schedule' };
      case 'partnership': return { color: '#dc2626', icon: 'handshake' };
      case 'youth_development': return { color: '#2563eb', icon: 'school' };
      case 'management': return { color: '#ea580c', icon: 'business_center' };
      default: return { color: '#6b7280', icon: 'hub' };
    }
  }
}
