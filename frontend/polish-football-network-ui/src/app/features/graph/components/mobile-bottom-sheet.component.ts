import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ClubDto } from '../../../../shared/models/club.model';
import { ConnectionDto } from '../../../../shared/models/connection.model';

/// <summary>
/// Mobile bottom sheet data interface.
/// </summary>
interface BottomSheetData {
  type: 'club-info' | 'actions' | 'filters' | 'search';
  club?: ClubDto;
  connections?: ConnectionDto[];
  data?: any;
}

/// <summary>
/// Mobile bottom sheet action interface.
/// </summary>
interface BottomSheetAction {
  icon: string;
  label: string;
  action: string;
  disabled?: boolean;
}

/// <summary>
/// Mobile bottom sheet component for mobile-specific UI patterns.
/// Provides a bottom sheet interface for club info, actions, filters, and search on mobile devices.
/// </summary>
@Component({
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <div class="mobile-bottom-sheet">
      <!-- Header -->
      <div class="sheet-header">
        <div class="drag-handle"></div>
        <h3 class="sheet-title">{{ getSheetTitle() }}</h3>
        <button
          mat-icon-button
          (click)="close()"
          class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content based on sheet type -->
      <div class="sheet-content">
        <!-- Club Info Sheet -->
        <div *ngIf="data.type === 'club-info' && data.club" class="club-info-content">
          <div class="club-header">
            <div class="club-avatar">
              <img [src]="getClubLogo(data.club)" [alt]="data.club.name" />
            </div>
            <div class="club-details">
              <h4>{{ data.club.name }}</h4>
              <p class="club-league">{{ data.club.league }}</p>
              <p class="club-location">{{ data.club.city }}, {{ data.club.country }}</p>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="club-stats">
            <div class="stat-item">
              <span class="stat-label">Founded</span>
              <span class="stat-value">{{ data.club.foundedYear }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Stadium</span>
              <span class="stat-value">{{ data.club.stadium?.name || 'N/A' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connections</span>
              <span class="stat-value">{{ data.connections?.length || 0 }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Connections list -->
          <div class="connections-section" *ngIf="data.connections && data.connections.length > 0">
            <h5>Connections</h5>
            <mat-list>
              <mat-list-item *ngFor="let connection of data.connections.slice(0, 5)">
                <div matListItemAvatar class="connection-avatar">
                  <mat-icon>{{ getConnectionIcon(connection) }}</mat-icon>
                </div>
                <div matListItemTitle>{{ getOtherClub(connection, data.club).name }}</div>
                <div matListItemLine>{{ connection.type }} • {{ connection.strength }}/10</div>
                <button mat-icon-button (click)="onConnectionAction(connection)">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </mat-list-item>
            </mat-list>

            <button
              *ngIf="data.connections.length > 5"
              mat-button
              color="primary"
              (click)="viewAllConnections()"
              class="view-all-button">
              View All {{ data.connections.length }} Connections
            </button>
          </div>

          <!-- Action buttons -->
          <div class="action-buttons">
            <button
              mat-raised-button
              color="primary"
              (click)="editClub(data.club)"
              class="action-button">
              <mat-icon>edit</mat-icon>
              Edit Club
            </button>
            <button
              mat-raised-button
              color="accent"
              (click)="manageConnections(data.club)"
              class="action-button">
              <mat-icon>link</mat-icon>
              Manage Connections
            </button>
          </div>
        </div>

        <!-- Actions Sheet -->
        <div *ngIf="data.type === 'actions'" class="actions-content">
          <mat-list>
            <mat-list-item
              *ngFor="let action of getActions()"
              (click)="executeAction(action)"
              [class.disabled]="action.disabled">
              <div matListItemAvatar>
                <mat-icon>{{ action.icon }}</mat-icon>
              </div>
              <div matListItemTitle>{{ action.label }}</div>
            </mat-list-item>
          </mat-list>
        </div>

        <!-- Filters Sheet -->
        <div *ngIf="data.type === 'filters'" class="filters-content">
          <p>Filter options would go here</p>
          <!-- This would integrate with the filter panel component -->
        </div>

        <!-- Search Sheet -->
        <div *ngIf="data.type === 'search'" class="search-content">
          <p>Search options would go here</p>
          <!-- This would integrate with the search component -->
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mobile-bottom-sheet {
      max-height: 70vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .sheet-header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      gap: 16px;
      flex-shrink: 0;
    }

    .drag-handle {
      width: 32px;
      height: 4px;
      background: #ccc;
      border-radius: 2px;
      margin: 0 auto;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
    }

    .sheet-title {
      flex: 1;
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .close-button {
      flex-shrink: 0;
    }

    .sheet-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .club-info-content {
      padding: 16px;
    }

    .club-header {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .club-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .club-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .club-details h4 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .club-league {
      margin: 0 0 4px 0;
      color: #666;
      font-weight: 500;
    }

    .club-location {
      margin: 0;
      color: #888;
      font-size: 14px;
    }

    .club-stats {
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    .stat-value {
      font-weight: 500;
    }

    .connections-section {
      margin: 16px 0;
    }

    .connections-section h5 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .connection-avatar {
      background: #f5f5f5;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-all-button {
      width: 100%;
      margin-top: 8px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .action-button {
      flex: 1;
      height: 48px;
    }

    .actions-content mat-list-item {
      cursor: pointer;
    }

    .actions-content mat-list-item:hover {
      background: rgba(0,0,0,0.04);
    }

    .actions-content mat-list-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .actions-content mat-list-item.disabled:hover {
      background: none;
    }

    .filters-content,
    .search-content {
      padding: 16px;
    }

    /* Mobile optimizations */
    @media (max-width: 599px) {
      .club-header {
        flex-direction: column;
        text-align: center;
      }

      .action-buttons {
        flex-direction: column;
      }

      .action-button {
        width: 100%;
      }
    }
  `]
})
export class MobileBottomSheetComponent {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<MobileBottomSheetComponent>);

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: BottomSheetData) {}

  /// <summary>
  /// Get the sheet title based on type.
  /// </summary>
  getSheetTitle(): string {
    switch (this.data.type) {
      case 'club-info':
        return this.data.club?.name || 'Club Information';
      case 'actions':
        return 'Actions';
      case 'filters':
        return 'Filters';
      case 'search':
        return 'Search';
      default:
        return '';
    }
  }

  /// <summary>
  /// Get club logo URL.
  /// </summary>
  getClubLogo(club: ClubDto): string {
    return club.logoUrl || '/assets/images/default-club-logo.png';
  }

  /// <summary>
  /// Get connection icon based on type.
  /// </summary>
  getConnectionIcon(connection: ConnectionDto): string {
    switch (connection.type) {
      case 'transfer':
        return 'swap_horiz';
      case 'loan':
        return 'schedule';
      case 'rivalry':
        return 'sports_kabaddi';
      case 'partnership':
        return 'handshake';
      default:
        return 'link';
    }
  }

  /// <summary>
  /// Get the other club in a connection.
  /// </summary>
  getOtherClub(connection: ConnectionDto, currentClub: ClubDto): ClubDto {
    return connection.sourceClub.id === currentClub.id
      ? connection.targetClub
      : connection.sourceClub;
  }

  /// <summary>
  /// Get available actions based on context.
  /// </summary>
  getActions(): BottomSheetAction[] {
    const actions: BottomSheetAction[] = [
      { icon: 'zoom_in', label: 'Zoom In', action: 'zoom-in' },
      { icon: 'zoom_out', label: 'Zoom Out', action: 'zoom-out' },
      { icon: 'center_focus_strong', label: 'Fit to Screen', action: 'zoom-fit' },
      { icon: 'refresh', label: 'Reset View', action: 'reset-view' },
      { icon: 'download', label: 'Export Graph', action: 'export' },
      { icon: 'settings', label: 'Settings', action: 'settings' }
    ];

    return actions;
  }

  /// <summary>
  /// Execute action and close sheet.
  /// </summary>
  executeAction(action: BottomSheetAction): void {
    if (action.disabled) return;

    this.bottomSheetRef.dismiss(action.action);
  }

  /// <summary>
  /// Handle connection action.
  /// </summary>
  onConnectionAction(connection: ConnectionDto): void {
    this.bottomSheetRef.dismiss({
      action: 'select-connection',
      data: connection
    });
  }

  /// <summary>
  /// View all connections.
  /// </summary>
  viewAllConnections(): void {
    this.bottomSheetRef.dismiss({
      action: 'view-all-connections',
      data: this.data.club
    });
  }

  /// <summary>
  /// Edit club.
  /// </summary>
  editClub(club: ClubDto): void {
    this.bottomSheetRef.dismiss({
      action: 'edit-club',
      data: club
    });
  }

  /// <summary>
  /// Manage connections.
  /// </summary>
  manageConnections(club: ClubDto): void {
    this.bottomSheetRef.dismiss({
      action: 'manage-connections',
      data: club
    });
  }

  /// <summary>
  /// Close the bottom sheet.
  /// </summary>
  close(): void {
    this.bottomSheetRef.dismiss();
  }
}
