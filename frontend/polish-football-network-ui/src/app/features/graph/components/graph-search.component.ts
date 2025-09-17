import { Component, EventEmitter, Output, Input, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ClubDto } from '../../../shared/models/club.model';
import { GraphNode } from '../../../shared/models/graph.model';
import { GraphService } from '../../../core/services/graph.service';
import { NotificationService } from '../../../core/services/notification.service';

/// <summary>
/// Search history item interface.
/// </summary>
interface SearchHistoryItem {
  clubId: number;
  clubName: string;
  searchedAt: Date;
}

/// <summary>
/// Search component for finding and highlighting clubs in the graph.
/// Provides real-time search with autocomplete, search history, and node highlighting.
/// </summary>
@Component({
  selector: 'app-graph-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="search-container">
      <!-- Main search input -->
      <div class="search-input-container">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search clubs...</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            [matAutocomplete]="auto"
            placeholder="Type club name or location..."
            (keydown.enter)="onSearchEnter()"
            (keydown.escape)="onClearSearch()">

          <mat-icon matPrefix>search</mat-icon>

          <button
            mat-icon-button
            matSuffix
            *ngIf="searchControl.value"
            (click)="onClearSearch()"
            matTooltip="Clear search">
            <mat-icon>clear</mat-icon>
          </button>

          <button
            mat-icon-button
            matSuffix
            [matMenuTriggerFor]="historyMenu"
            matTooltip="Search history"
            *ngIf="searchHistory().length > 0">
            <mat-icon>history</mat-icon>
          </button>
        </mat-form-field>

        <!-- Autocomplete panel -->
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onClubSelected($event.option.value)">
          <mat-option
            *ngFor="let club of filteredClubs$ | async"
            [value]="club"
            class="club-option">
            <div class="club-option-content">
              <div class="club-info">
                <span class="club-name">{{ club.name }}</span>
                <span class="club-details">{{ club.league }} • {{ club.city }}</span>
              </div>
              <mat-icon class="club-league-icon" [ngClass]="getLeagueClass(club.league)">
                {{ getLeagueIcon(club.league) }}
              </mat-icon>
            </div>
          </mat-option>

          <mat-option disabled *ngIf="(filteredClubs$ | async)?.length === 0 && searchControl.value">
            <span class="no-results">No clubs found</span>
          </mat-option>
        </mat-autocomplete>

        <!-- Search history menu -->
        <mat-menu #historyMenu="matMenu">
          <div class="history-header">
            <span>Recent searches</span>
            <button mat-icon-button (click)="onClearHistory()" matTooltip="Clear history">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <mat-divider></mat-divider>

          <button
            mat-menu-item
            *ngFor="let item of searchHistory().slice(0, 5)"
            (click)="onHistoryItemClick(item)">
            <mat-icon>history</mat-icon>
            <span>{{ item.clubName }}</span>
            <span class="history-time">{{ getRelativeTime(item.searchedAt) }}</span>
          </button>
        </mat-menu>
      </div>

      <!-- Search results and actions -->
      <div class="search-results" *ngIf="selectedClub()">
        <div class="selected-club-info">
          <div class="club-card">
            <div class="club-header">
              <h3>{{ selectedClub()?.name }}</h3>
              <mat-icon [ngClass]="getLeagueClass(selectedClub()?.league)">
                {{ getLeagueIcon(selectedClub()?.league) }}
              </mat-icon>
            </div>
            <p class="club-location">{{ selectedClub()?.city }}</p>
          </div>

          <div class="search-actions">
            <button
              mat-stroked-button
              (click)="onCenterOnClub()"
              matTooltip="Center view on club">
              <mat-icon>center_focus_strong</mat-icon>
              Center
            </button>

            <button
              mat-stroked-button
              (click)="onHighlightConnections()"
              matTooltip="Highlight club connections">
              <mat-icon>hub</mat-icon>
              Connections
            </button>

            <button
              mat-stroked-button
              (click)="onShowClubDetails()"
              matTooltip="Show detailed information">
              <mat-icon>info</mat-icon>
              Details
            </button>
          </div>
        </div>
      </div>

      <!-- Quick filters -->
      <div class="quick-filters" *ngIf="!selectedClub()">
        <div class="filter-title">Quick search:</div>
        <div class="filter-chips">
          <mat-chip-set>
            <mat-chip (click)="onQuickFilter('Ekstraklasa')" [selected]="false">
              Ekstraklasa
            </mat-chip>
            <mat-chip (click)="onQuickFilter('1 Liga')" [selected]="false">
              1 Liga
            </mat-chip>
            <mat-chip (click)="onQuickFilter('European')" [selected]="false">
              European
            </mat-chip>
            <mat-chip (click)="onQuickFilter('Warsaw')" [selected]="false">
              Warsaw
            </mat-chip>
            <mat-chip (click)="onQuickFilter('Krakow')" [selected]="false">
              Krakow
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
      max-width: 400px;
      min-width: 300px;
    }

    .search-input-container {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .search-field {
      width: 100%;
    }

    .club-option {
      height: auto !important;
      padding: 12px 16px !important;
    }

    .club-option-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .club-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .club-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 2px;
    }

    .club-details {
      font-size: 12px;
      color: #666;
    }

    .club-league-icon {
      margin-left: 12px;
    }

    .club-league-icon.ekstraklasa {
      color: #dc2626;
    }

    .club-league-icon.liga1 {
      color: #2563eb;
    }

    .club-league-icon.european {
      color: #059669;
    }

    .no-results {
      color: #666;
      font-style: italic;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      font-weight: 500;
      color: #333;
    }

    .history-time {
      margin-left: auto;
      font-size: 11px;
      color: #999;
    }

    .search-results {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .club-card {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .club-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .club-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .club-location {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .search-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .search-actions button {
      flex: 1;
      min-width: 0;
    }

    .search-actions mat-icon {
      margin-right: 4px;
      font-size: 18px;
    }

    .quick-filters {
      padding: 16px;
    }

    .filter-title {
      font-size: 13px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
    }

    .filter-chips mat-chip-set {
      gap: 4px;
    }

    .filter-chips mat-chip {
      font-size: 12px;
      cursor: pointer;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .search-container {
        max-width: 100%;
        min-width: 250px;
      }

      .search-actions {
        flex-direction: column;
      }

      .search-actions button {
        width: 100%;
      }
    }

    /* Animation transitions */
    .search-container {
      transition: all 0.3s ease;
    }

    .club-card {
      transition: background-color 0.2s ease;
    }

    .club-card:hover {
      background: #f1f3f4;
    }

    mat-chip {
      transition: all 0.2s ease;
    }
  `]
})
export class GraphSearchComponent {
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);

  // Form control for search input
  public readonly searchControl = new FormControl('');

  // Output events
  @Output() clubSelected = new EventEmitter<ClubDto>();
  @Output() centerOnClub = new EventEmitter<number>();
  @Output() highlightConnections = new EventEmitter<number>();
  @Output() showClubDetails = new EventEmitter<number>();
  @Output() quickFilter = new EventEmitter<string>();

  // Local state
  public readonly selectedClub = signal<ClubDto | null>(null);
  public readonly searchHistory = signal<SearchHistoryItem[]>([]);

  // Computed properties
  public readonly allClubs = computed(() => {
    const graphData = this.graphService.graphData();
    return graphData?.nodes.map(node => node.data) || [];
  });

  // Observable for filtered clubs
  public readonly filteredClubs$: Observable<ClubDto[]> = this.searchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(200),
    distinctUntilChanged(),
    map(searchTerm => {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
      }

      const term = searchTerm.toLowerCase().trim();
      if (term.length < 2) {
        return [];
      }

      return this.allClubs()
        .filter(club =>
          club.name.toLowerCase().includes(term) ||
          club.city.toLowerCase().includes(term) ||
          club.league.toLowerCase().includes(term)
        )
        .slice(0, 8); // Limit results
    })
  );

  constructor() {
    // Load search history from localStorage
    this.loadSearchHistory();
  }

  /// <summary>
  /// Handle club selection from autocomplete.
  /// </summary>
  public onClubSelected(club: ClubDto): void {
    this.selectedClub.set(club);
    this.searchControl.setValue(club.name);
    this.addToSearchHistory(club);
    this.clubSelected.emit(club);
    this.notificationService.showInfo(`Selected: ${club.name}`);
  }

  /// <summary>
  /// Handle search enter key.
  /// </summary>
  public onSearchEnter(): void {
    const value = this.searchControl.value;
    if (!value) return;

    // Try to find exact match
    const exactMatch = this.allClubs().find(club =>
      club.name.toLowerCase() === value.toLowerCase()
    );

    if (exactMatch) {
      this.onClubSelected(exactMatch);
    } else {
      // Try partial match
      const partialMatch = this.allClubs().find(club =>
        club.name.toLowerCase().includes(value.toLowerCase())
      );

      if (partialMatch) {
        this.onClubSelected(partialMatch);
      } else {
        this.notificationService.showError(`No club found matching "${value}"`);
      }
    }
  }

  /// <summary>
  /// Clear search input and selection.
  /// </summary>
  public onClearSearch(): void {
    this.searchControl.setValue('');
    this.selectedClub.set(null);
  }

  /// <summary>
  /// Handle history item click.
  /// </summary>
  public onHistoryItemClick(item: SearchHistoryItem): void {
    const club = this.allClubs().find(c => c.id === item.clubId);
    if (club) {
      this.onClubSelected(club);
    }
  }

  /// <summary>
  /// Clear search history.
  /// </summary>
  public onClearHistory(): void {
    this.searchHistory.set([]);
    localStorage.removeItem('graph-search-history');
    this.notificationService.showInfo('Search history cleared');
  }

  /// <summary>
  /// Center view on selected club.
  /// </summary>
  public onCenterOnClub(): void {
    const club = this.selectedClub();
    if (club) {
      this.centerOnClub.emit(club.id);
      this.notificationService.showInfo(`Centered on ${club.name}`);
    }
  }

  /// <summary>
  /// Highlight club connections.
  /// </summary>
  public onHighlightConnections(): void {
    const club = this.selectedClub();
    if (club) {
      this.highlightConnections.emit(club.id);
      this.notificationService.showInfo(`Highlighted connections for ${club.name}`);
    }
  }

  /// <summary>
  /// Show club details panel.
  /// </summary>
  public onShowClubDetails(): void {
    const club = this.selectedClub();
    if (club) {
      this.showClubDetails.emit(club.id);
    }
  }

  /// <summary>
  /// Handle quick filter selection.
  /// </summary>
  public onQuickFilter(filter: string): void {
    this.searchControl.setValue(filter);
    this.quickFilter.emit(filter);
  }

  /// <summary>
  /// Get league icon for club.
  /// </summary>
  public getLeagueIcon(league: string): string {
    switch (league.toLowerCase()) {
      case 'ekstraklasa': return 'stars';
      case '1 liga': case 'fortuna 1 liga': return 'sports_soccer';
      case 'european': return 'public';
      default: return 'sports';
    }
  }

  /// <summary>
  /// Get league CSS class for styling.
  /// </summary>
  public getLeagueClass(league: string): string {
    switch (league.toLowerCase()) {
      case 'ekstraklasa': return 'ekstraklasa';
      case '1 liga': case 'fortuna 1 liga': return 'liga1';
      case 'european': return 'european';
      default: return '';
    }
  }

  /// <summary>
  /// Get relative time string for history items.
  /// </summary>
  public getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }

  /// <summary>
  /// Add club to search history.
  /// </summary>
  private addToSearchHistory(club: ClubDto): void {
    const history = this.searchHistory();
    const newItem: SearchHistoryItem = {
      clubId: club.id,
      clubName: club.name,
      searchedAt: new Date()
    };

    // Remove existing entry if present
    const filteredHistory = history.filter(item => item.clubId !== club.id);

    // Add new item at the beginning
    const updatedHistory = [newItem, ...filteredHistory].slice(0, 5);

    this.searchHistory.set(updatedHistory);
    this.saveSearchHistory();
  }

  /// <summary>
  /// Load search history from localStorage.
  /// </summary>
  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('graph-search-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert searchedAt strings back to Date objects
        const history = parsed.map((item: any) => ({
          ...item,
          searchedAt: new Date(item.searchedAt)
        }));
        this.searchHistory.set(history);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }

  /// <summary>
  /// Save search history to localStorage.
  /// </summary>
  private saveSearchHistory(): void {
    try {
      localStorage.setItem('graph-search-history', JSON.stringify(this.searchHistory()));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }
}
