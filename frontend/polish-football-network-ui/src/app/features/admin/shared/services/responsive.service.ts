import { Injectable, signal, computed, effect } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, map, shareReplay } from 'rxjs';

/// <summary>
/// Service for managing responsive behavior and breakpoint detection across the admin panel.
/// Provides reactive signals for different screen sizes and device capabilities.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private readonly _currentBreakpoint = signal<string>('desktop');
  private readonly _isMobile = signal<boolean>(false);
  private readonly _isTablet = signal<boolean>(false);
  private readonly _isDesktop = signal<boolean>(true);
  private readonly _isTouchDevice = signal<boolean>(false);
  private readonly _sidenavMode = signal<'side' | 'over' | 'push'>('side');

  // Computed signals for UI state
  readonly currentBreakpoint = this._currentBreakpoint.asReadonly();
  readonly isMobile = this._isMobile.asReadonly();
  readonly isTablet = this._isTablet.asReadonly();
  readonly isDesktop = this._isDesktop.asReadonly();
  readonly isTouchDevice = this._isTouchDevice.asReadonly();
  readonly sidenavMode = this._sidenavMode.asReadonly();

  // Computed properties for layout decisions
  readonly showSidenavButton = computed(() =>
    this._isMobile() || this._isTablet()
  );

  readonly useCompactLayout = computed(() =>
    this._isMobile() || (this._isTablet() && window.innerWidth < 900)
  );

  readonly cardColumns = computed(() => {
    if (this._isMobile()) return 1;
    if (this._isTablet()) return 2;
    return window.innerWidth > 1400 ? 4 : 3;
  });

  readonly shouldCollapseSidenav = computed(() =>
    this._isMobile() || this._isTablet()
  );

  // Observable streams for reactive programming
  readonly isHandset$: Observable<boolean>;
  readonly isTablet$: Observable<boolean>;
  readonly isWeb$: Observable<boolean>;
  readonly orientation$: Observable<'portrait' | 'landscape'>;

  constructor(private breakpointObserver: BreakpointObserver) {
    // Set up breakpoint observables
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isTablet$ = this.breakpointObserver.observe(Breakpoints.Tablet)
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isWeb$ = this.breakpointObserver.observe(Breakpoints.Web)
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.orientation$ = this.breakpointObserver.observe('(orientation: portrait)')
      .pipe(
        map(result => result.matches ? 'portrait' : 'landscape'),
        shareReplay(1)
      );

    this.initializeBreakpointDetection();
    this.initializeTouchDetection();
    this.setupResizeListener();
  }

  /// <summary>
  /// Initialize breakpoint detection and set up reactive signals.
  /// </summary>
  private initializeBreakpointDetection(): void {
    // Mobile detection (phones)
    this.breakpointObserver.observe([
      '(max-width: 767px)'
    ]).subscribe(result => {
      this._isMobile.set(result.matches);
      if (result.matches) {
        this._currentBreakpoint.set('mobile');
        this._sidenavMode.set('over');
      }
    });

    // Tablet detection
    this.breakpointObserver.observe([
      '(min-width: 768px) and (max-width: 1023px)'
    ]).subscribe(result => {
      this._isTablet.set(result.matches);
      if (result.matches) {
        this._currentBreakpoint.set('tablet');
        this._sidenavMode.set('over');
      }
    });

    // Desktop detection
    this.breakpointObserver.observe([
      '(min-width: 1024px)'
    ]).subscribe(result => {
      this._isDesktop.set(result.matches);
      if (result.matches) {
        this._currentBreakpoint.set('desktop');
        this._sidenavMode.set('side');
      }
    });
  }

  /// <summary>
  /// Detect touch device capabilities for enhanced UX.
  /// </summary>
  private initializeTouchDetection(): void {
    const hasTouchScreen = 'ontouchstart' in window ||
                          navigator.maxTouchPoints > 0 ||
                          (navigator as any).msMaxTouchPoints > 0;

    // Additional check for pointer events
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasNoHover = window.matchMedia('(hover: none)').matches;

    this._isTouchDevice.set(hasTouchScreen || (hasCoarsePointer && hasNoHover));
  }

  /// <summary>
  /// Set up window resize listener for dynamic updates.
  /// </summary>
  private setupResizeListener(): void {
    let resizeTimeout: number;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.updateBreakpointState();
      }, 150); // Debounce resize events
    });
  }

  /// <summary>
  /// Update breakpoint state based on current window dimensions.
  /// </summary>
  private updateBreakpointState(): void {
    const width = window.innerWidth;

    if (width < 768) {
      this._isMobile.set(true);
      this._isTablet.set(false);
      this._isDesktop.set(false);
      this._currentBreakpoint.set('mobile');
      this._sidenavMode.set('over');
    } else if (width < 1024) {
      this._isMobile.set(false);
      this._isTablet.set(true);
      this._isDesktop.set(false);
      this._currentBreakpoint.set('tablet');
      this._sidenavMode.set('over');
    } else {
      this._isMobile.set(false);
      this._isTablet.set(false);
      this._isDesktop.set(true);
      this._currentBreakpoint.set('desktop');
      this._sidenavMode.set('side');
    }
  }

  /// <summary>
  /// Get appropriate grid columns for current screen size.
  /// </summary>
  /// <param name="defaultColumns">Default number of columns for desktop</param>
  /// <returns>Number of columns for current breakpoint</returns>
  getGridColumns(defaultColumns: number = 4): number {
    if (this._isMobile()) return 1;
    if (this._isTablet()) return Math.min(2, defaultColumns);
    if (window.innerWidth > 1400) return defaultColumns;
    return Math.max(3, defaultColumns - 1);
  }

  /// <summary>
  /// Get appropriate card size for current screen.
  /// </summary>
  /// <returns>CSS class for card sizing</returns>
  getCardSize(): 'small' | 'medium' | 'large' {
    if (this._isMobile()) return 'small';
    if (this._isTablet()) return 'medium';
    return 'large';
  }

  /// <summary>
  /// Get appropriate button size for current device.
  /// </summary>
  /// <returns>Material button size</returns>
  getButtonSize(): 'small' | 'medium' | 'large' {
    if (this._isTouchDevice()) return 'large';
    if (this._isMobile()) return 'medium';
    return 'medium';
  }

  /// <summary>
  /// Get optimal navigation drawer width for current screen.
  /// </summary>
  /// <returns>Navigation drawer width in pixels</returns>
  getNavDrawerWidth(): number {
    if (this._isMobile()) return Math.min(280, window.innerWidth - 56);
    if (this._isTablet()) return 320;
    return 280;
  }

  /// <summary>
  /// Check if element should use dense layout for current screen.
  /// </summary>
  /// <returns>True if dense layout should be used</returns>
  shouldUseDenseLayout(): boolean {
    return this._isMobile() || (this._isTablet() && window.innerWidth < 900);
  }

  /// <summary>
  /// Get appropriate table display mode for current screen.
  /// </summary>
  /// <returns>Table display mode</returns>
  getTableDisplayMode(): 'standard' | 'compact' | 'mobile-cards' {
    if (this._isMobile()) return 'mobile-cards';
    if (this._isTablet() && window.innerWidth < 900) return 'compact';
    return 'standard';
  }

  /// <summary>
  /// Get spacing size for current breakpoint.
  /// </summary>
  /// <param name="baseSize">Base spacing size</param>
  /// <returns>Adjusted spacing for current screen</returns>
  getSpacing(baseSize: number): number {
    if (this._isMobile()) return baseSize * 0.75;
    if (this._isTablet()) return baseSize * 0.875;
    return baseSize;
  }

  /// <summary>
  /// Check if screen is large enough for multi-column layout.
  /// </summary>
  /// <param name="minWidth">Minimum width required</param>
  /// <returns>True if screen supports multi-column layout</returns>
  supportsMultiColumn(minWidth: number = 1200): boolean {
    return window.innerWidth >= minWidth && !this._isMobile();
  }

  /// <summary>
  /// Get recommended items per page for current screen size.
  /// </summary>
  /// <returns>Number of items per page</returns>
  getItemsPerPage(): number {
    if (this._isMobile()) return 10;
    if (this._isTablet()) return 20;
    return 25;
  }

  /// <summary>
  /// Check if device supports hover interactions.
  /// </summary>
  /// <returns>True if hover is supported</returns>
  supportsHover(): boolean {
    return !this._isTouchDevice() && window.matchMedia('(hover: hover)').matches;
  }

  /// <summary>
  /// Get appropriate dialog width for current screen.
  /// </summary>
  /// <param name="contentType">Type of dialog content</param>
  /// <returns>Dialog width configuration</returns>
  getDialogWidth(contentType: 'form' | 'details' | 'confirmation' = 'form'): string {
    const width = window.innerWidth;

    if (this._isMobile()) {
      return '95vw';
    }

    if (this._isTablet()) {
      return contentType === 'confirmation' ? '400px' : '80vw';
    }

    switch (contentType) {
      case 'form':
        return width > 1400 ? '600px' : '500px';
      case 'details':
        return width > 1400 ? '800px' : '700px';
      case 'confirmation':
        return '400px';
      default:
        return '500px';
    }
  }

  /// <summary>
  /// Get CSS classes for responsive behavior.
  /// </summary>
  /// <returns>Object with responsive CSS classes</returns>
  getResponsiveClasses(): Record<string, boolean> {
    return {
      'is-mobile': this._isMobile(),
      'is-tablet': this._isTablet(),
      'is-desktop': this._isDesktop(),
      'is-touch': this._isTouchDevice(),
      'use-compact': this.useCompactLayout(),
      'supports-hover': this.supportsHover()
    };
  }

  /// <summary>
  /// Force a breakpoint update (useful after DOM changes).
  /// </summary>
  refreshBreakpoints(): void {
    setTimeout(() => {
      this.updateBreakpointState();
    }, 0);
  }
}

/// <summary>
/// Interface for component responsive configuration.
/// </summary>
export interface ResponsiveConfig {
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  useDenseLayout?: boolean;
  hideOnMobile?: boolean;
  touchOptimized?: boolean;
}

/// <summary>
/// Interface for breakpoint change events.
/// </summary>
export interface BreakpointChange {
  previous: string;
  current: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}
