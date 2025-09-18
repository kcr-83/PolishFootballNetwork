import { Component, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';

/// <summary>
/// Interface representing a logo in the gallery with metadata
/// </summary>
export interface GalleryLogo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  format: string;
  uploadDate: Date;
  tags: string[];
  category: LogoCategory;
  isVectorGraphic: boolean;
  description?: string;
  usageCount: number;
  lastUsed?: Date;
}

/// <summary>
/// Logo categories for organization and filtering
/// </summary>
export enum LogoCategory {
  ClubLogos = 'club-logos',
  LeagueLogos = 'league-logos',
  SponsorLogos = 'sponsor-logos',
  EventLogos = 'event-logos',
  Generic = 'generic',
  Historical = 'historical'
}

/// <summary>
/// Filter criteria for logo gallery search and display
/// </summary>
export interface LogoFilter {
  searchTerm: string;
  category: LogoCategory | null;
  format: string | null;
  tags: string[];
  isVectorOnly: boolean;
  dateRange: { start: Date | null; end: Date | null };
}

/// <summary>
/// Logo gallery view modes for different display preferences
/// </summary>
export enum ViewMode {
  Grid = 'grid',
  List = 'list',
  Detailed = 'detailed'
}

/// <summary>
/// Sort options for logo gallery
/// </summary>
export interface SortOption {
  field: keyof GalleryLogo;
  direction: 'asc' | 'desc';
  label: string;
}

/// <summary>
/// Comprehensive logo gallery component for browsing, searching, and selecting
/// from existing logo collection with advanced filtering and organization
/// </summary>
@Component({
  selector: 'app-logo-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatGridListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule,
    MatPaginatorModule,
    FormsModule
  ],
  templateUrl: './logo-gallery.component.html',
  styleUrls: ['./logo-gallery.component.scss']
})
export class LogoGalleryComponent implements OnInit {
  @Output() logoSelected = new EventEmitter<GalleryLogo>();
  @Output() galleryClosed = new EventEmitter<void>();

  // Reactive state
  private readonly _isLoading = signal(false);
  private readonly _selectedLogo = signal<GalleryLogo | null>(null);
  private readonly _viewMode = signal<ViewMode>(ViewMode.Grid);
  private readonly _searchTerm = signal('');
  private readonly _selectedCategory = signal<LogoCategory | null>(null);
  private readonly _selectedFormat = signal<string | null>(null);
  private readonly _isVectorOnly = signal(false);
  private readonly _selectedTags = signal<string[]>([]);
  private readonly _currentPage = signal(0);
  private readonly _pageSize = signal(20);
  private readonly _sortOption = signal<SortOption>({ field: 'uploadDate', direction: 'desc', label: 'Newest First' });

  // Mock data for demonstration
  private readonly _allLogos = signal<GalleryLogo[]>([]);
  private readonly _availableTags = signal<string[]>([]);

  // Computed properties
  readonly isLoading = this._isLoading.asReadonly();
  readonly selectedLogo = this._selectedLogo.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly selectedFormat = this._selectedFormat.asReadonly();
  readonly isVectorOnly = this._isVectorOnly.asReadonly();
  readonly selectedTags = this._selectedTags.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly sortOption = this._sortOption.asReadonly();
  readonly allLogos = this._allLogos.asReadonly();
  readonly availableTags = this._availableTags.asReadonly();

  readonly currentFilter = computed<LogoFilter>(() => ({
    searchTerm: this.searchTerm(),
    category: this.selectedCategory(),
    format: this.selectedFormat(),
    tags: this.selectedTags(),
    isVectorOnly: this.isVectorOnly(),
    dateRange: { start: null, end: null }
  }));

  readonly filteredLogos = computed(() => {
    let logos = this.allLogos();
    const filter = this.currentFilter();

    // Apply search term filter
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      logos = logos.filter(logo => 
        logo.name.toLowerCase().includes(term) ||
        logo.description?.toLowerCase().includes(term) ||
        logo.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Apply category filter
    if (filter.category) {
      logos = logos.filter(logo => logo.category === filter.category);
    }

    // Apply format filter
    if (filter.format) {
      logos = logos.filter(logo => logo.format === filter.format);
    }

    // Apply vector-only filter
    if (filter.isVectorOnly) {
      logos = logos.filter(logo => logo.isVectorGraphic);
    }

    // Apply tags filter
    if (filter.tags.length > 0) {
      logos = logos.filter(logo => 
        filter.tags.every(tag => logo.tags.includes(tag))
      );
    }

    // Apply sorting
    const sort = this.sortOption();
    logos = logos.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return logos;
  });

  readonly paginatedLogos = computed(() => {
    const filtered = this.filteredLogos();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  readonly totalCount = computed(() => this.filteredLogos().length);

  readonly hasSelection = computed(() => this.selectedLogo() !== null);

  readonly gridCols = computed(() => {
    switch (this.viewMode()) {
      case ViewMode.Grid: return 4;
      case ViewMode.List: return 1;
      case ViewMode.Detailed: return 2;
      default: return 4;
    }
  });

  // Constants
  readonly logoCategories = Object.values(LogoCategory);
  readonly viewModes = Object.values(ViewMode);
  readonly logoFormats = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
  
  readonly sortOptions: SortOption[] = [
    { field: 'uploadDate', direction: 'desc', label: 'Newest First' },
    { field: 'uploadDate', direction: 'asc', label: 'Oldest First' },
    { field: 'name', direction: 'asc', label: 'Name A-Z' },
    { field: 'name', direction: 'desc', label: 'Name Z-A' },
    { field: 'usageCount', direction: 'desc', label: 'Most Used' },
    { field: 'fileSize', direction: 'asc', label: 'Smallest First' },
    { field: 'fileSize', direction: 'desc', label: 'Largest First' }
  ];

  ngOnInit(): void {
    this.loadLogos();
  }

  /// <summary>
  /// Loads logos from the gallery service (mock implementation for demonstration)
  /// </summary>
  private async loadLogos(): Promise<void> {
    this._isLoading.set(true);

    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockLogos = this.generateMockLogos();
      this._allLogos.set(mockLogos);
      
      // Extract unique tags
      const tags = new Set<string>();
      mockLogos.forEach(logo => logo.tags.forEach(tag => tags.add(tag)));
      this._availableTags.set(Array.from(tags).sort());
      
    } catch (error) {
      console.error('Error loading logos:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /// <summary>
  /// Generates mock logo data for demonstration purposes
  /// </summary>
  private generateMockLogos(): GalleryLogo[] {
    const logos: GalleryLogo[] = [];
    const logoNames = [
      'Legia Warsaw', 'Wisła Kraków', 'Cracovia', 'Lech Poznań', 'Śląsk Wrocław',
      'Jagiellonia Białystok', 'Piast Gliwice', 'Pogoń Szczecin', 'Raków Częstochowa',
      'Górnik Zabrze', 'Stal Mielec', 'Warta Poznań', 'Zagłębie Lubin', 'Korona Kielce',
      'Radomiak Radom', 'Bruk-Bet Termalica', 'Ekstraklasa Logo', 'Polish FA',
      'UEFA Logo', 'FIFA Logo', 'Nike Logo', 'Adidas Logo', 'Puma Logo'
    ];

    const categories = Object.values(LogoCategory);
    const formats = ['png', 'svg', 'jpg'];
    const tagOptions = [
      'football', 'soccer', 'club', 'league', 'poland', 'sports', 'team',
      'logo', 'badge', 'crest', 'official', 'professional', 'vector', 'high-quality'
    ];

    logoNames.forEach((name, index) => {
      const isVector = Math.random() > 0.6;
      const format = isVector ? 'svg' : formats[Math.floor(Math.random() * formats.length)];
      const category = index < 16 ? LogoCategory.ClubLogos : 
                     index < 18 ? LogoCategory.LeagueLogos : 
                     LogoCategory.SponsorLogos;
      
      const logo: GalleryLogo = {
        id: `logo-${index + 1}`,
        name,
        url: `https://example.com/logos/${name.toLowerCase().replace(/\s+/g, '-')}.${format}`,
        thumbnailUrl: `https://example.com/logos/thumbnails/${name.toLowerCase().replace(/\s+/g, '-')}-thumb.${format}`,
        fileSize: Math.floor(Math.random() * 500000) + 50000, // 50KB - 550KB
        dimensions: {
          width: Math.floor(Math.random() * 1000) + 500,
          height: Math.floor(Math.random() * 1000) + 500
        },
        format,
        uploadDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
        tags: this.getRandomTags(tagOptions, 2, 5),
        category,
        isVectorGraphic: isVector,
        description: `Official ${name} logo in ${format.toUpperCase()} format`,
        usageCount: Math.floor(Math.random() * 100),
        lastUsed: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)) : undefined
      };

      logos.push(logo);
    });

    return logos;
  }

  /// <summary>
  /// Gets random tags from available options
  /// </summary>
  private getRandomTags(options: string[], min: number, max: number): string[] {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = options.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /// <summary>
  /// Handles logo selection
  /// </summary>
  onLogoSelect(logo: GalleryLogo): void {
    this._selectedLogo.set(logo);
  }

  /// <summary>
  /// Confirms logo selection and emits the selected logo
  /// </summary>
  confirmSelection(): void {
    const selected = this.selectedLogo();
    if (selected) {
      this.logoSelected.emit(selected);
    }
  }

  /// <summary>
  /// Cancels selection and closes the gallery
  /// </summary>
  cancel(): void {
    this.galleryClosed.emit();
  }

  /// <summary>
  /// Handles search term changes
  /// </summary>
  onSearchChange(term: string): void {
    this._searchTerm.set(term);
    this._currentPage.set(0); // Reset to first page
  }

  /// <summary>
  /// Handles category filter changes
  /// </summary>
  onCategoryChange(category: LogoCategory | null): void {
    this._selectedCategory.set(category);
    this._currentPage.set(0);
  }

  /// <summary>
  /// Handles format filter changes
  /// </summary>
  onFormatChange(format: string | null): void {
    this._selectedFormat.set(format);
    this._currentPage.set(0);
  }

  /// <summary>
  /// Handles vector-only filter toggle
  /// </summary>
  onVectorOnlyChange(isVectorOnly: boolean): void {
    this._isVectorOnly.set(isVectorOnly);
    this._currentPage.set(0);
  }

  /// <summary>
  /// Handles tag selection changes
  /// </summary>
  onTagToggle(tag: string): void {
    const currentTags = this.selectedTags();
    const index = currentTags.indexOf(tag);
    
    if (index > -1) {
      this._selectedTags.set(currentTags.filter(t => t !== tag));
    } else {
      this._selectedTags.set([...currentTags, tag]);
    }
    
    this._currentPage.set(0);
  }

  /// <summary>
  /// Removes a selected tag
  /// </summary>
  removeTag(tag: string): void {
    this._selectedTags.set(this.selectedTags().filter(t => t !== tag));
    this._currentPage.set(0);
  }

  /// <summary>
  /// Handles view mode changes
  /// </summary>
  onViewModeChange(mode: ViewMode): void {
    this._viewMode.set(mode);
  }

  /// <summary>
  /// Handles sort option changes
  /// </summary>
  onSortChange(option: SortOption): void {
    this._sortOption.set(option);
  }

  /// <summary>
  /// Handles pagination changes
  /// </summary>
  onPageChange(event: PageEvent): void {
    this._currentPage.set(event.pageIndex);
    this._pageSize.set(event.pageSize);
  }

  /// <summary>
  /// Clears all filters and resets to default view
  /// </summary>
  clearFilters(): void {
    this._searchTerm.set('');
    this._selectedCategory.set(null);
    this._selectedFormat.set(null);
    this._isVectorOnly.set(false);
    this._selectedTags.set([]);
    this._currentPage.set(0);
  }

  /// <summary>
  /// Gets display text for logo file size
  /// </summary>
  getFileSizeDisplay(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /// <summary>
  /// Gets display text for logo dimensions
  /// </summary>
  getDimensionsDisplay(dimensions: { width: number; height: number }): string {
    return `${dimensions.width} × ${dimensions.height}`;
  }

  /// <summary>
  /// Gets category display name
  /// </summary>
  getCategoryDisplayName(category: LogoCategory): string {
    switch (category) {
      case LogoCategory.ClubLogos: return 'Club Logos';
      case LogoCategory.LeagueLogos: return 'League Logos';
      case LogoCategory.SponsorLogos: return 'Sponsor Logos';
      case LogoCategory.EventLogos: return 'Event Logos';
      case LogoCategory.Generic: return 'Generic';
      case LogoCategory.Historical: return 'Historical';
      default: return category;
    }
  }

  /// <summary>
  /// Gets view mode display name
  /// </summary>
  getViewModeDisplayName(mode: ViewMode): string {
    switch (mode) {
      case ViewMode.Grid: return 'Grid';
      case ViewMode.List: return 'List';
      case ViewMode.Detailed: return 'Detailed';
      default: return mode;
    }
  }

  /// <summary>
  /// Gets view mode icon
  /// </summary>
  getViewModeIcon(mode: ViewMode): string {
    switch (mode) {
      case ViewMode.Grid: return 'grid_view';
      case ViewMode.List: return 'list';
      case ViewMode.Detailed: return 'view_module';
      default: return 'grid_view';
    }
  }

  /// <summary>
  /// Checks if a tag is currently selected
  /// </summary>
  isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }

  /// <summary>
  /// Handles logo preview
  /// </summary>
  previewLogo(logo: GalleryLogo): void {
    // Implementation for logo preview modal
    console.log('Preview logo:', logo);
  }

  /// <summary>
  /// Downloads a logo
  /// </summary>
  downloadLogo(logo: GalleryLogo): void {
    // Implementation for logo download
    const link = document.createElement('a');
    link.href = logo.url;
    link.download = `${logo.name}.${logo.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}