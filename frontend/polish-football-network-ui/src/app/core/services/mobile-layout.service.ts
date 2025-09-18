import { Injectable, inject, DestroyRef } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, fromEvent, map, startWith, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/// <summary>
/// Mobile layout configuration.
/// </summary>
interface MobileLayoutConfig {
  showToolbar: boolean;
  showSearchPanel: boolean;
  showFilterPanel: boolean;
  showClubInfoPanel: boolean;
  showLegend: boolean;
  toolbarPosition: 'top' | 'bottom' | 'floating';
  panelStyle: 'overlay' | 'push' | 'bottom-sheet';
  compactMode: boolean;
  singlePanelMode: boolean;
}

/// <summary>
/// Responsive breakpoint information.
/// </summary>
interface ResponsiveBreakpoint {
  name: 'mobile' | 'tablet' | 'desktop' | 'large';
  isActive: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
}

/// <summary>
/// Panel state for mobile layouts.
/// </summary>
interface PanelState {
  isOpen: boolean;
  isMinimized: boolean;
  position: 'left' | 'right' | 'bottom' | 'floating';
  width?: number;
  height?: number;
}

/// <summary>
/// Mobile layout service for responsive design and mobile-specific UI patterns.
/// Handles breakpoint detection, panel management, and mobile layout optimizations.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class MobileLayoutService {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  // State subjects
  private readonly currentBreakpoint$ = new BehaviorSubject<ResponsiveBreakpoint>({
    name: 'desktop',
    isActive: false,
    width: 0,
    height: 0,
    orientation: 'landscape',
    isTouch: false
  });

  private readonly layoutConfig$ = new BehaviorSubject<MobileLayoutConfig>({
    showToolbar: true,
    showSearchPanel: true,
    showFilterPanel: true,
    showClubInfoPanel: true,
    showLegend: true,
    toolbarPosition: 'top',
    panelStyle: 'overlay',
    compactMode: false,
    singlePanelMode: false
  });

  private readonly panelStates$ = new BehaviorSubject<Record<string, PanelState>>({
    search: { isOpen: false, isMinimized: false, position: 'left' },
    filter: { isOpen: false, isMinimized: false, position: 'left' },
    clubInfo: { isOpen: false, isMinimized: false, position: 'right' },
    legend: { isOpen: false, isMinimized: false, position: 'bottom' }
  });

  private readonly activePanel$ = new BehaviorSubject<string | null>(null);
  private readonly isMenuOpen$ = new BehaviorSubject<boolean>(false);
  private readonly keyboardHeight$ = new BehaviorSubject<number>(0);

  // Observable getters
  public readonly currentBreakpoint = this.currentBreakpoint$.asObservable();
  public readonly layoutConfig = this.layoutConfig$.asObservable();
  public readonly panelStates = this.panelStates$.asObservable();
  public readonly activePanel = this.activePanel$.asObservable();
  public readonly isMenuOpen = this.isMenuOpen$.asObservable();
  public readonly keyboardHeight = this.keyboardHeight$.asObservable();

  // Computed observables
  public readonly isMobile = this.currentBreakpoint.pipe(
    map(bp => bp.name === 'mobile')
  );

  public readonly isTablet = this.currentBreakpoint.pipe(
    map(bp => bp.name === 'tablet')
  );

  public readonly isHandset = this.currentBreakpoint.pipe(
    map(bp => bp.name === 'mobile' || bp.name === 'tablet')
  );

  public readonly isPortrait = this.currentBreakpoint.pipe(
    map(bp => bp.orientation === 'portrait')
  );

  public readonly isTouch = this.currentBreakpoint.pipe(
    map(bp => bp.isTouch)
  );

  constructor() {
    this.initializeLayoutService();
  }

  /// <summary>
  /// Initialize mobile layout service.
  /// </summary>
  private initializeLayoutService(): void {
    this.setupBreakpointObservation();
    this.setupOrientationHandling();
    this.setupKeyboardHandling();
    this.setupTouchDetection();
    this.setupResponsiveConfiguration();
  }

  /// <summary>
  /// Setup breakpoint observation.
  /// </summary>
  private setupBreakpointObservation(): void {
    const breakpoints = {
      mobile: Breakpoints.Handset,
      tablet: Breakpoints.Tablet,
      desktop: Breakpoints.Web,
      large: Breakpoints.XLarge
    };

    // Observe all breakpoints
    this.breakpointObserver.observe([
      breakpoints.mobile,
      breakpoints.tablet,
      breakpoints.desktop,
      breakpoints.large
    ]).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.updateBreakpoint(result.matches, result.breakpoints);
    });

    // Also listen to window resize for more responsive updates
    fromEvent(window, 'resize').pipe(
      takeUntilDestroyed(this.destroyRef),
      startWith(null)
    ).subscribe(() => {
      this.updateBreakpointFromWindow();
    });
  }

  /// <summary>
  /// Setup orientation change handling.
  /// </summary>
  private setupOrientationHandling(): void {
    const orientationChange$ = 'screen' in window && 'orientation' in window.screen
      ? fromEvent(window.screen.orientation, 'change')
      : fromEvent(window, 'orientationchange');

    orientationChange$.pipe(
      takeUntilDestroyed(this.destroyRef),
      startWith(null)
    ).subscribe(() => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => this.updateBreakpointFromWindow(), 100);
    });
  }

  /// <summary>
  /// Setup virtual keyboard handling for mobile.
  /// </summary>
  private setupKeyboardHandling(): void {
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport!;

      const updateKeyboardHeight = () => {
        const keyboardHeight = window.innerHeight - visualViewport.height;
        this.keyboardHeight$.next(Math.max(0, keyboardHeight));
      };

      fromEvent(visualViewport, 'resize').pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(updateKeyboardHeight);

      // Initial check
      updateKeyboardHeight();
    } else {
      // Fallback for older browsers
      let initialHeight = window.innerHeight;

      fromEvent(window, 'resize').pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        const currentHeight = window.innerHeight;
        const difference = initialHeight - currentHeight;

        // Assume keyboard is open if height decreased significantly
        if (difference > 150) {
          this.keyboardHeight$.next(difference);
        } else {
          this.keyboardHeight$.next(0);
          initialHeight = currentHeight;
        }
      });
    }
  }

  /// <summary>
  /// Setup touch device detection.
  /// </summary>
  private setupTouchDetection(): void {
    const isTouch = 'ontouchstart' in window ||
                   navigator.maxTouchPoints > 0 ||
                   (navigator as any).msMaxTouchPoints > 0;

    const breakpoint = this.currentBreakpoint$.value;
    breakpoint.isTouch = isTouch;
    this.currentBreakpoint$.next(breakpoint);
  }

  /// <summary>
  /// Setup responsive configuration updates.
  /// </summary>
  private setupResponsiveConfiguration(): void {
    this.currentBreakpoint.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(breakpoint => {
      this.updateLayoutConfiguration(breakpoint);
    });
  }

  /// <summary>
  /// Update breakpoint from breakpoint observer results.
  /// </summary>
  private updateBreakpoint(matches: boolean, matchedBreakpoints: Record<string, boolean>): void {
    if (!matches) return;

    const breakpoint = this.currentBreakpoint$.value;

    // Determine active breakpoint
    if (matchedBreakpoints[Breakpoints.Handset]) {
      breakpoint.name = 'mobile';
    } else if (matchedBreakpoints[Breakpoints.Tablet]) {
      breakpoint.name = 'tablet';
    } else if (matchedBreakpoints[Breakpoints.XLarge]) {
      breakpoint.name = 'large';
    } else {
      breakpoint.name = 'desktop';
    }

    this.updateBreakpointFromWindow();
  }

  /// <summary>
  /// Update breakpoint information from window dimensions.
  /// </summary>
  private updateBreakpointFromWindow(): void {
    const breakpoint = this.currentBreakpoint$.value;

    breakpoint.width = window.innerWidth;
    breakpoint.height = window.innerHeight;
    breakpoint.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    breakpoint.isActive = true;

    // Override breakpoint name based on actual dimensions if needed
    if (breakpoint.width <= 599) {
      breakpoint.name = 'mobile';
    } else if (breakpoint.width <= 959) {
      breakpoint.name = 'tablet';
    } else if (breakpoint.width <= 1279) {
      breakpoint.name = 'desktop';
    } else {
      breakpoint.name = 'large';
    }

    this.currentBreakpoint$.next({ ...breakpoint });
  }

  /// <summary>
  /// Update layout configuration based on breakpoint.
  /// </summary>
  private updateLayoutConfiguration(breakpoint: ResponsiveBreakpoint): void {
    const config: MobileLayoutConfig = {
      showToolbar: true,
      showSearchPanel: true,
      showFilterPanel: true,
      showClubInfoPanel: true,
      showLegend: true,
      toolbarPosition: 'top',
      panelStyle: 'overlay',
      compactMode: false,
      singlePanelMode: false
    };

    switch (breakpoint.name) {
      case 'mobile':
        config.toolbarPosition = 'bottom';
        config.panelStyle = 'bottom-sheet';
        config.compactMode = true;
        config.singlePanelMode = true;
        config.showLegend = false; // Hide legend on mobile by default
        break;

      case 'tablet':
        config.toolbarPosition = breakpoint.orientation === 'portrait' ? 'bottom' : 'top';
        config.panelStyle = 'overlay';
        config.compactMode = true;
        config.singlePanelMode = breakpoint.orientation === 'portrait';
        break;

      case 'desktop':
        config.toolbarPosition = 'top';
        config.panelStyle = 'push';
        config.compactMode = false;
        config.singlePanelMode = false;
        break;

      case 'large':
        config.toolbarPosition = 'top';
        config.panelStyle = 'push';
        config.compactMode = false;
        config.singlePanelMode = false;
        break;
    }

    this.layoutConfig$.next(config);
    this.updatePanelStatesForBreakpoint(breakpoint);
  }

  /// <summary>
  /// Update panel states based on breakpoint.
  /// </summary>
  private updatePanelStatesForBreakpoint(breakpoint: ResponsiveBreakpoint): void {
    const panelStates = this.panelStates$.value;
    const config = this.layoutConfig$.value;

    if (config.singlePanelMode) {
      // Close all panels except active one in single panel mode
      const activePanel = this.activePanel$.value;
      Object.keys(panelStates).forEach(key => {
        panelStates[key].isOpen = key === activePanel;
      });
    }

    // Adjust positions for mobile
    if (breakpoint.name === 'mobile') {
      panelStates.search.position = 'bottom';
      panelStates.filter.position = 'bottom';
      panelStates.clubInfo.position = 'bottom';
      panelStates.legend.position = 'bottom';
    } else if (breakpoint.name === 'tablet') {
      panelStates.search.position = 'left';
      panelStates.filter.position = 'left';
      panelStates.clubInfo.position = 'right';
      panelStates.legend.position = 'bottom';
    } else {
      panelStates.search.position = 'left';
      panelStates.filter.position = 'left';
      panelStates.clubInfo.position = 'right';
      panelStates.legend.position = 'bottom';
    }

    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Toggle panel visibility.
  /// </summary>
  public togglePanel(panelName: string): void {
    const panelStates = this.panelStates$.value;
    const config = this.layoutConfig$.value;

    if (!panelStates[panelName]) return;

    const wasOpen = panelStates[panelName].isOpen;

    if (config.singlePanelMode) {
      // Close all other panels in single panel mode
      Object.keys(panelStates).forEach(key => {
        panelStates[key].isOpen = false;
      });
    }

    panelStates[panelName].isOpen = !wasOpen;

    if (panelStates[panelName].isOpen) {
      this.activePanel$.next(panelName);
    } else if (this.activePanel$.value === panelName) {
      this.activePanel$.next(null);
    }

    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Open specific panel.
  /// </summary>
  public openPanel(panelName: string): void {
    const panelStates = this.panelStates$.value;
    const config = this.layoutConfig$.value;

    if (!panelStates[panelName]) return;

    if (config.singlePanelMode) {
      // Close all other panels
      Object.keys(panelStates).forEach(key => {
        panelStates[key].isOpen = key === panelName;
      });
    } else {
      panelStates[panelName].isOpen = true;
    }

    this.activePanel$.next(panelName);
    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Close specific panel.
  /// </summary>
  public closePanel(panelName: string): void {
    const panelStates = this.panelStates$.value;

    if (!panelStates[panelName]) return;

    panelStates[panelName].isOpen = false;

    if (this.activePanel$.value === panelName) {
      this.activePanel$.next(null);
    }

    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Close all panels.
  /// </summary>
  public closeAllPanels(): void {
    const panelStates = this.panelStates$.value;

    Object.keys(panelStates).forEach(key => {
      panelStates[key].isOpen = false;
    });

    this.activePanel$.next(null);
    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Toggle minimize state of panel.
  /// </summary>
  public togglePanelMinimize(panelName: string): void {
    const panelStates = this.panelStates$.value;

    if (!panelStates[panelName]) return;

    panelStates[panelName].isMinimized = !panelStates[panelName].isMinimized;
    this.panelStates$.next({ ...panelStates });
  }

  /// <summary>
  /// Toggle main menu.
  /// </summary>
  public toggleMenu(): void {
    this.isMenuOpen$.next(!this.isMenuOpen$.value);
  }

  /// <summary>
  /// Close main menu.
  /// </summary>
  public closeMenu(): void {
    this.isMenuOpen$.next(false);
  }

  /// <summary>
  /// Get panel state.
  /// </summary>
  public getPanelState(panelName: string): PanelState | null {
    return this.panelStates$.value[panelName] || null;
  }

  /// <summary>
  /// Check if panel is open.
  /// </summary>
  public isPanelOpen(panelName: string): boolean {
    const state = this.getPanelState(panelName);
    return state?.isOpen || false;
  }

  /// <summary>
  /// Check if any panel is open.
  /// </summary>
  public isAnyPanelOpen(): boolean {
    const panelStates = this.panelStates$.value;
    return Object.values(panelStates).some(state => state.isOpen);
  }

  /// <summary>
  /// Get current layout configuration.
  /// </summary>
  public getCurrentLayoutConfig(): MobileLayoutConfig {
    return this.layoutConfig$.value;
  }

  /// <summary>
  /// Get current breakpoint information.
  /// </summary>
  public getCurrentBreakpoint(): ResponsiveBreakpoint {
    return this.currentBreakpoint$.value;
  }

  /// <summary>
  /// Check if device is mobile.
  /// </summary>
  public getIsMobile(): boolean {
    return this.currentBreakpoint$.value.name === 'mobile';
  }

  /// <summary>
  /// Check if device is tablet.
  /// </summary>
  public getIsTablet(): boolean {
    return this.currentBreakpoint$.value.name === 'tablet';
  }

  /// <summary>
  /// Check if device is handset (mobile or tablet).
  /// </summary>
  public getIsHandset(): boolean {
    const name = this.currentBreakpoint$.value.name;
    return name === 'mobile' || name === 'tablet';
  }

  /// <summary>
  /// Check if device is in portrait mode.
  /// </summary>
  public getIsPortrait(): boolean {
    return this.currentBreakpoint$.value.orientation === 'portrait';
  }

  /// <summary>
  /// Check if device supports touch.
  /// </summary>
  public getIsTouch(): boolean {
    return this.currentBreakpoint$.value.isTouch;
  }

  /// <summary>
  /// Get recommended panel width for current breakpoint.
  /// </summary>
  public getRecommendedPanelWidth(): number {
    const breakpoint = this.currentBreakpoint$.value;

    switch (breakpoint.name) {
      case 'mobile':
        return Math.min(320, breakpoint.width * 0.9);
      case 'tablet':
        return breakpoint.orientation === 'portrait' ? 320 : 380;
      case 'desktop':
        return 320;
      case 'large':
        return 380;
      default:
        return 320;
    }
  }

  /// <summary>
  /// Get safe area insets for mobile devices.
  /// </summary>
  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const style = getComputedStyle(document.documentElement);

    return {
      top: parseInt(style.getPropertyValue('--sat') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || '0', 10)
    };
  }
}
