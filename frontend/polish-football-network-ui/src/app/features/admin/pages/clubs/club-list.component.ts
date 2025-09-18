import { Component, OnInit, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { Subject, combineLatest, debounceTime, takeUntil } from 'rxjs';
import { 
  ClubListItem, 
  ClubListParams, 
  LeagueType, 
  ClubStatus, 
  BulkClubOperation, 
  BulkOperationType,
  ClubExportOptions,
  ExportFormat
} from '../shared/models/club.models';
import { ClubService } from '../shared/services/club.service';
import { AccessibilityService } from '../shared/services/accessibility.service';
import { ResponsiveService } from '../shared/services/responsive.service';
import { HasPermissionDirective } from '../shared/directives/permission.directives';

/// <summary>
/// Club list component with Material table, sorting, pagination, search, filtering, and bulk operations.
/// Provides comprehensive club management interface for administrators.
/// </summary>
@Component({
  selector: 'app-club-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatMenuModule,
    MatToolbarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    HasPermissionDirective
  ],
  templateUrl: './club-list.component.html',
  styleUrls: ['./club-list.component.scss']
})
export class ClubListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data source for the table
  public dataSource = new MatTableDataSource<ClubListItem>([]);
  public selection = new SelectionModel<ClubListItem>(true, []);

  // Reactive state
  private readonly _isLoading = signal(false);
  private readonly _totalCount = signal(0);
  private readonly _pageIndex = signal(0);
  private readonly _pageSize = signal(25);

  // Form controls for filtering
  public readonly searchControl = new FormControl('');
  public readonly leagueControl = new FormControl<LeagueType[]>([]);
  public readonly statusControl = new FormControl<ClubStatus[]>([]);
  public readonly cityControl = new FormControl<string[]>([]);
  public readonly verifiedControl = new FormControl<boolean | null>(null);
  public readonly featuredControl = new FormControl<boolean | null>(null);

  // Table configuration
  public readonly displayedColumns: string[] = [
    'select',
    'logo',
    'name',
    'league',
    'city', 
    'status',
    'verified',
    'featured',
    'connections',
    'lastUpdated',
    'actions'
  ];

  // Computed properties
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly totalCount = this._totalCount.asReadonly();
  public readonly pageIndex = this._pageIndex.asReadonly();
  public readonly pageSize = this._pageSize.asReadonly();
  
  public readonly hasSelection = computed(() => this.selection.selected.length > 0);
  public readonly isAllSelected = computed(() => {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  });
  public readonly isMobile = computed(() => this.responsiveService.isMobile());

  // Options for dropdowns
  public readonly leagueOptions = this.clubService.getLeagueOptions();
  public readonly statusOptions = this.clubService.getStatusOptions();

  constructor(
    private readonly clubService: ClubService,
    private readonly accessibilityService: AccessibilityService,
    private readonly responsiveService: ResponsiveService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupTableConfiguration();
    this.setupFilterSubscriptions();
    this.loadClubs();
    this.announcePageLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Loads clubs data with current filters and pagination
  /// </summary>
  loadClubs(): void {
    this._isLoading.set(true);
    
    const params: ClubListParams = {
      page: this._pageIndex() + 1, // API expects 1-based indexing
      pageSize: this._pageSize(),
      sortBy: this.sort?.active,
      sortDirection: this.sort?.direction || 'asc',
      search: this.searchControl.value || undefined,
      league: this.leagueControl.value?.length ? this.leagueControl.value : undefined,
      status: this.statusControl.value?.length ? this.statusControl.value : undefined,
      city: this.cityControl.value?.length ? this.cityControl.value : undefined,
      isVerified: this.verifiedControl.value ?? undefined,
      isFeatured: this.featuredControl.value ?? undefined
    };

    this.clubService.getClubs(params).subscribe({
      next: (response) => {
        this.dataSource.data = response.items;
        this._totalCount.set(response.totalCount);
        this._isLoading.set(false);
        this.selection.clear();
        
        this.accessibilityService.announceToScreenReader(
          `Loaded ${response.items.length} clubs of ${response.totalCount} total`
        );
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError('Failed to load clubs: ' + error.message);
      }
    });
  }

  /// <summary>
  /// Handles search input changes
  /// </summary>
  onSearch(): void {
    this._pageIndex.set(0);
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadClubs();
  }

  /// <summary>
  /// Handles filter changes
  /// </summary>
  onFilterChange(): void {
    this._pageIndex.set(0);
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadClubs();
  }

  /// <summary>
  /// Clears all filters
  /// </summary>
  clearFilters(): void {
    this.searchControl.setValue('');
    this.leagueControl.setValue([]);
    this.statusControl.setValue([]);
    this.cityControl.setValue([]);
    this.verifiedControl.setValue(null);
    this.featuredControl.setValue(null);
    this.onFilterChange();
    
    this.accessibilityService.announceToScreenReader('All filters cleared');
  }

  /// <summary>
  /// Toggles selection of all items
  /// </summary>
  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.accessibilityService.announceToScreenReader('All items deselected');
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
      this.accessibilityService.announceToScreenReader(
        `Selected all ${this.dataSource.data.length} visible items`
      );
    }
  }

  /// <summary>
  /// Toggles selection of a single row
  /// </summary>
  /// <param name="row">Club item to toggle</param>
  toggleRowSelection(row: ClubListItem): void {
    this.selection.toggle(row);
    const isSelected = this.selection.isSelected(row);
    this.accessibilityService.announceToScreenReader(
      `${row.name} ${isSelected ? 'selected' : 'deselected'}`
    );
  }

  /// <summary>
  /// Performs bulk operation on selected clubs
  /// </summary>
  /// <param name="operation">Bulk operation type</param>
  async performBulkOperation(operation: BulkOperationType): Promise<void> {
    if (this.selection.selected.length === 0) {
      this.showError('Please select clubs to perform bulk operation');
      return;
    }

    const selectedIds = this.selection.selected.map(club => club.id);
    const operationData: BulkClubOperation = {
      operation,
      clubIds: selectedIds
    };

    // Show confirmation dialog for destructive operations
    if (operation === BulkOperationType.Delete || operation === BulkOperationType.Deactivate) {
      const confirmed = await this.showConfirmationDialog(
        `Are you sure you want to ${operation.toLowerCase()} ${selectedIds.length} club(s)?`
      );
      if (!confirmed) return;
    }

    this._isLoading.set(true);
    this.clubService.bulkOperation(operationData).subscribe({
      next: () => {
        this._isLoading.set(false);
        this.showSuccess(`Bulk ${operation.toLowerCase()} completed successfully`);
        this.loadClubs();
        this.accessibilityService.announceToScreenReader(
          `Bulk ${operation.toLowerCase()} completed for ${selectedIds.length} clubs`
        );
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Bulk operation failed: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Exports clubs to file
  /// </summary>
  /// <param name="format">Export format</param>
  exportClubs(format: ExportFormat): void {
    const options: ClubExportOptions = {
      format,
      includeFields: ['name', 'shortName', 'league', 'city', 'status', 'isVerified', 'isFeatured'],
      filters: this.getCurrentFilters(),
      includeLogos: false,
      includeConnections: false
    };

    this._isLoading.set(true);
    this.clubService.exportClubs(options).subscribe({
      next: (blob) => {
        this._isLoading.set(false);
        this.downloadFile(blob, `clubs.${format.toLowerCase()}`);
        this.showSuccess('Export completed successfully');
        this.accessibilityService.announceToScreenReader('Club export downloaded');
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Export failed: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Navigates to club details page
  /// </summary>
  /// <param name="club">Club to view</param>
  viewClub(club: ClubListItem): void {
    this.router.navigate(['/admin/clubs', club.id]);
  }

  /// <summary>
  /// Navigates to club edit page
  /// </summary>
  /// <param name="club">Club to edit</param>
  editClub(club: ClubListItem): void {
    this.router.navigate(['/admin/clubs', club.id, 'edit']);
  }

  /// <summary>
  /// Deletes a single club
  /// </summary>
  /// <param name="club">Club to delete</param>
  async deleteClub(club: ClubListItem): Promise<void> {
    const confirmed = await this.showConfirmationDialog(
      `Are you sure you want to delete "${club.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    this._isLoading.set(true);
    this.clubService.deleteClub(club.id).subscribe({
      next: () => {
        this._isLoading.set(false);
        this.showSuccess(`"${club.name}" deleted successfully`);
        this.loadClubs();
        this.accessibilityService.announceToScreenReader(`${club.name} deleted`);
      },
      error: (error) => {
        this._isLoading.set(false);
        this.showError(`Failed to delete club: ${error.message}`);
      }
    });
  }

  /// <summary>
  /// Gets CSS class for status chip
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
  /// Gets CSS class for league chip
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
  /// Handles page change events
  /// </summary>
  /// <param name="event">Page event</param>
  onPageChange(event: any): void {
    this._pageIndex.set(event.pageIndex);
    this._pageSize.set(event.pageSize);
    this.loadClubs();
  }

  /// <summary>
  /// Handles sort change events
  /// </summary>
  onSortChange(): void {
    this._pageIndex.set(0);
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadClubs();
  }

  /// <summary>
  /// Sets up table configuration
  /// </summary>
  private setupTableConfiguration(): void {
    // Configure mobile columns
    if (this.isMobile()) {
      this.displayedColumns = ['select', 'name', 'league', 'status', 'actions'];
    }
  }

  /// <summary>
  /// Sets up filter change subscriptions
  /// </summary>
  private setupFilterSubscriptions(): void {
    // Debounce search input
    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.onSearch());

    // React to filter changes
    combineLatest([
      this.leagueControl.valueChanges,
      this.statusControl.valueChanges,
      this.cityControl.valueChanges,
      this.verifiedControl.valueChanges,
      this.featuredControl.valueChanges
    ]).pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => this.onFilterChange());
  }

  /// <summary>
  /// Gets current filter parameters
  /// </summary>
  /// <returns>Current filter parameters</returns>
  private getCurrentFilters(): ClubListParams {
    return {
      page: this._pageIndex() + 1,
      pageSize: this._pageSize(),
      sortBy: this.sort?.active,
      sortDirection: this.sort?.direction || 'asc',
      search: this.searchControl.value || undefined,
      league: this.leagueControl.value?.length ? this.leagueControl.value : undefined,
      status: this.statusControl.value?.length ? this.statusControl.value : undefined,
      city: this.cityControl.value?.length ? this.cityControl.value : undefined,
      isVerified: this.verifiedControl.value ?? undefined,
      isFeatured: this.featuredControl.value ?? undefined
    };
  }

  /// <summary>
  /// Downloads a file blob
  /// </summary>
  /// <param name="blob">File blob</param>
  /// <param name="filename">File name</param>
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
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

  /// <summary>
  /// Announces page load for accessibility
  /// </summary>
  private announcePageLoad(): void {
    this.accessibilityService.announceToScreenReader(
      'Club management page loaded. Use the table to view and manage clubs.'
    );
  }
}