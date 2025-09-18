import { Component, OnInit, OnDestroy, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { 
  Club, 
  ClubStatus, 
  LeagueType,
  ClubActivityLog,
  ClubStatistics,
  ClubConnection
} from '../shared/models/club.models';
import { ClubService } from '../shared/services/club.service';
import { ClubFormComponent } from './club-form.component';
import { ConnectionTableComponent } from '../components/connection-table/connection-table.component';
import { ActivityTimelineComponent } from '../components/activity-timeline/activity-timeline.component';
import { ClubStatsComponent } from '../components/club-stats/club-stats.component';
import { MapViewComponent } from '../shared/components/map-view/map-view.component';
import { HasPermissionDirective } from '../shared/directives/permission.directives';

/// <summary>
/// Club details component providing read-only view with comprehensive club information,
/// connections table, activity history, and quick edit actions.
/// </summary>
@Component({
  selector: 'app-club-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatToolbarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    ClubFormComponent,
    ConnectionTableComponent,
    ActivityTimelineComponent,
    ClubStatsComponent,
    MapViewComponent,
    HasPermissionDirective
  ],
  templateUrl: './club-details.component.html',
  styleUrls: ['./club-details.component.scss']
})
export class ClubDetailsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly clubService = inject(ClubService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  @Input() clubId?: string;
  @Input() embedded = false;

  // Reactive state
  private readonly _club = signal<Club | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isEditing = signal(false);
  private readonly _activeTab = signal(0);
  private readonly _statistics = signal<ClubStatistics | null>(null);
  private readonly _activityLogs = signal<ClubActivityLog[]>([]);
  private readonly _connections = signal<ClubConnection[]>([]);

  // Computed properties
  public readonly club = this._club.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly isEditing = this._isEditing.asReadonly();
  public readonly activeTab = this._activeTab.asReadonly();
  public readonly statistics = this._statistics.asReadonly();
  public readonly activityLogs = this._activityLogs.asReadonly();
  public readonly connections = this._connections.asReadonly();
  
  public readonly clubExists = computed(() => !!this.club());
  public readonly clubName = computed(() => this.club()?.name || 'Unknown Club');
  public readonly clubLogo = computed(() => this.club()?.logoUrl);
  public readonly clubPosition = computed(() => this.club()?.position);
  public readonly isVerified = computed(() => this.club()?.isVerified || false);
  public readonly isFeatured = computed(() => this.club()?.isFeatured || false);
  public readonly canEdit = computed(() => !this.isEditing());
  public readonly hasConnections = computed(() => this.connections().length > 0);
  public readonly hasActivityLogs = computed(() => this.activityLogs().length > 0);

  constructor() {}

  ngOnInit(): void {
    this.loadClubData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Navigates back to clubs list
  /// </summary>
  goBack(): void {
    if (this.embedded) {
      return;
    }
    this.router.navigate(['/admin/clubs']);
  }

  /// <summary>
  /// Enters edit mode
  /// </summary>
  startEdit(): void {
    this._isEditing.set(true);
  }

  /// <summary>
  /// Cancels editing
  /// </summary>
  cancelEdit(): void {
    this._isEditing.set(false);
  }

  /// <summary>
  /// Handles club save from edit form
  /// </summary>
  /// <param name="updatedClub">Updated club data</param>
  onClubSaved(updatedClub: Club): void {
    this._club.set(updatedClub);
    this._isEditing.set(false);
    this.showSuccess('Club updated successfully');
    this.loadStatistics(); // Refresh statistics
  }

  /// <summary>
  /// Deletes the club after confirmation
  /// </summary>
  async deleteClub(): Promise<void> {
    const club = this.club();
    if (!club) return;

    const confirmed = await this.showConfirmationDialog(
      `Are you sure you want to delete "${club.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    this._isLoading.set(true);
    this.clubService.deleteClub(club.id).subscribe({
      next: () => {
        this._isLoading.set(false);
        this.showSuccess(`"${club.name}" deleted successfully`);
        
        if (!this.embedded) {
          this.router.navigate(['/admin/clubs']);
        }
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Failed to delete club: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Toggles club verification status
  /// </summary>
  async toggleVerification(): Promise<void> {
    const club = this.club();
    if (!club) return;

    const newStatus = !club.isVerified;
    const action = newStatus ? 'verify' : 'unverify';
    
    this._isLoading.set(true);
    this.clubService.updateClub(club.id, { ...club, isVerified: newStatus }).subscribe({
      next: (updatedClub) => {
        this._club.set(updatedClub);
        this._isLoading.set(false);
        this.showSuccess(`Club ${action}ed successfully`);
        this.logActivity(`Club ${action}ed`);
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Failed to ${action} club: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Toggles club featured status
  /// </summary>
  async toggleFeatured(): Promise<void> {
    const club = this.club();
    if (!club) return;

    const newStatus = !club.isFeatured;
    const action = newStatus ? 'feature' : 'unfeature';
    
    this._isLoading.set(true);
    this.clubService.updateClub(club.id, { ...club, isFeatured: newStatus }).subscribe({
      next: (updatedClub) => {
        this._club.set(updatedClub);
        this._isLoading.set(false);
        this.showSuccess(`Club ${action}d successfully`);
        this.logActivity(`Club ${action}d`);
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Failed to ${action} club: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Changes active tab
  /// </summary>
  /// <param name="tabIndex">Tab index to activate</param>
  onTabChange(tabIndex: number): void {
    this._activeTab.set(tabIndex);
    
    // Load data for specific tabs on demand
    switch (tabIndex) {
      case 1: // Connections tab
        if (this.connections().length === 0) {
          this.loadConnections();
        }
        break;
      case 2: // Activity tab
        if (this.activityLogs().length === 0) {
          this.loadActivityLogs();
        }
        break;
      case 3: // Statistics tab
        if (!this.statistics()) {
          this.loadStatistics();
        }
        break;
    }
  }

  /// <summary>
  /// Refreshes all club data
  /// </summary>
  refreshData(): void {
    this.loadClubData();
    this.loadConnections();
    this.loadActivityLogs();
    this.loadStatistics();
  }

  /// <summary>
  /// Gets CSS class for club status
  /// </summary>
  /// <param name="status">Club status</param>
  /// <returns>CSS class name</returns>
  getStatusClass(status: ClubStatus): string {
    const statusClasses: Record<ClubStatus, string> = {
      [ClubStatus.Active]: 'status-active',
      [ClubStatus.Inactive]: 'status-inactive',
      [ClubStatus.Pending]: 'status-pending',
      [ClubStatus.Suspended]: 'status-suspended',
      [ClubStatus.Archived]: 'status-archived'
    };
    return statusClasses[status] || 'status-default';
  }

  /// <summary>
  /// Gets CSS class for league
  /// </summary>
  /// <param name="league">League type</param>
  /// <returns>CSS class name</returns>
  getLeagueClass(league: LeagueType): string {
    const leagueClasses: Record<LeagueType, string> = {
      [LeagueType.Ekstraklasa]: 'league-ekstraklasa',
      [LeagueType.Fortuna1Liga]: 'league-fortuna',
      [LeagueType.EuropeanClub]: 'league-european',
      [LeagueType.Regional]: 'league-regional',
      [LeagueType.International]: 'league-international'
    };
    return leagueClasses[league] || 'league-default';
  }

  /// <summary>
  /// Formats phone number for display
  /// </summary>
  /// <param name="phone">Phone number</param>
  /// <returns>Formatted phone number</returns>
  formatPhone(phone: string): string {
    // Simple phone formatting - could be enhanced with proper internationalization
    return phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }

  /// <summary>
  /// Loads club data from service or route parameter
  /// </summary>
  private loadClubData(): void {
    const id = this.clubId || this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.showError('No club ID provided');
      return;
    }

    this._isLoading.set(true);
    this.clubService.getClubById(id).subscribe({
      next: (club) => {
        this._club.set(club);
        this._isLoading.set(false);
        this.logActivity('Club details viewed');
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError('Failed to load club: ' + error.message);
        
        if (!this.embedded) {
          this.router.navigate(['/admin/clubs']);
        }
      }
    });
  }

  /// <summary>
  /// Loads club connections
  /// </summary>
  private loadConnections(): void {
    const club = this.club();
    if (!club) return;

    this.clubService.getClubConnections(club.id).subscribe({
      next: (connections) => {
        this._connections.set(connections);
      },
      error: (error) => {
        console.warn('Failed to load connections:', error);
      }
    });
  }

  /// <summary>
  /// Loads activity logs
  /// </summary>
  private loadActivityLogs(): void {
    const club = this.club();
    if (!club) return;

    this.clubService.getClubActivityLogs(club.id).subscribe({
      next: (logs) => {
        this._activityLogs.set(logs);
      },
      error: (error) => {
        console.warn('Failed to load activity logs:', error);
      }
    });
  }

  /// <summary>
  /// Loads club statistics
  /// </summary>
  private loadStatistics(): void {
    const club = this.club();
    if (!club) return;

    this.clubService.getClubStatistics(club.id).subscribe({
      next: (stats) => {
        this._statistics.set(stats);
      },
      error: (error) => {
        console.warn('Failed to load statistics:', error);
      }
    });
  }

  /// <summary>
  /// Logs an activity for the club
  /// </summary>
  /// <param name="action">Action description</param>
  private logActivity(action: string): void {
    const club = this.club();
    if (!club) return;

    // Add to local activity logs immediately for better UX
    const newLog: ClubActivityLog = {
      id: Date.now().toString(),
      clubId: club.id,
      action,
      timestamp: new Date(),
      userId: 'current-user', // Should come from auth service
      details: {}
    };

    this._activityLogs.update(logs => [newLog, ...logs]);
  }

  /// <summary>
  /// Shows confirmation dialog
  /// </summary>
  /// <param name="message">Confirmation message</param>
  /// <returns>Promise resolving to user's choice</returns>
  private async showConfirmationDialog(message: string): Promise<boolean> {
    // This would open a Material confirmation dialog
    // For now, using browser confirm
    return confirm(message);
  }

  /// <summary>
  /// Shows success message
  /// </summary>
  /// <param name="message">Success message</param>
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /// <summary>
  /// Shows error message
  /// </summary>
  /// <param name="message">Error message</param>
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}