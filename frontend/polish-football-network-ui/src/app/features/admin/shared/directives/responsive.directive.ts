import {
  Directive,
  ElementRef,
  Renderer2,
  Input,
  OnInit,
  OnDestroy,
  effect,
  signal
} from '@angular/core';
import { ResponsiveService, ResponsiveConfig } from '../services/responsive.service';

/// <summary>
/// Directive for applying responsive behavior and classes to admin panel elements.
/// Automatically updates element classes and styles based on current breakpoint.
/// </summary>
@Directive({
  selector: '[adminResponsive]',
  standalone: true
})
export class AdminResponsiveDirective implements OnInit, OnDestroy {
  @Input('adminResponsive') config: ResponsiveConfig = {};

  private readonly _isActive = signal(true);
  private cleanupFunctions: (() => void)[] = [];

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private responsiveService: ResponsiveService
  ) {
    // Set up reactive effects for responsive changes
    effect(() => {
      if (this._isActive()) {
        this.updateResponsiveClasses();
        this.updateResponsiveStyles();
      }
    });
  }

  ngOnInit(): void {
    this.applyInitialConfiguration();
    this.setupResponsiveUpdates();
  }

  ngOnDestroy(): void {
    this._isActive.set(false);
    this.cleanupFunctions.forEach(cleanup => cleanup());
  }

  /// <summary>
  /// Apply initial responsive configuration to the element.
  /// </summary>
  private applyInitialConfiguration(): void {
    const element = this.elementRef.nativeElement;

    // Add base responsive class
    this.renderer.addClass(element, 'admin-responsive');

    // Apply configuration-based classes
    if (this.config.useDenseLayout) {
      this.renderer.addClass(element, 'admin-dense');
    }

    if (this.config.touchOptimized) {
      this.renderer.addClass(element, 'admin-touch-optimized');
    }

    if (this.config.hideOnMobile) {
      this.renderer.addClass(element, 'admin-hide-mobile');
    }
  }

  /// <summary>
  /// Set up reactive updates for responsive changes.
  /// </summary>
  private setupResponsiveUpdates(): void {
    const element = this.elementRef.nativeElement;

    // Update classes when breakpoint changes
    const updateEffect = effect(() => {
      const classes = this.responsiveService.getResponsiveClasses();

      Object.entries(classes).forEach(([className, shouldAdd]) => {
        if (shouldAdd) {
          this.renderer.addClass(element, className);
        } else {
          this.renderer.removeClass(element, className);
        }
      });
    });

    this.cleanupFunctions.push(() => updateEffect.destroy());
  }

  /// <summary>
  /// Update responsive CSS classes based on current breakpoint.
  /// </summary>
  private updateResponsiveClasses(): void {
    const element = this.elementRef.nativeElement;
    const isMobile = this.responsiveService.isMobile();
    const isTablet = this.responsiveService.isTablet();
    const isDesktop = this.responsiveService.isDesktop();
    const isTouchDevice = this.responsiveService.isTouchDevice();

    // Remove old breakpoint classes
    this.renderer.removeClass(element, 'is-mobile');
    this.renderer.removeClass(element, 'is-tablet');
    this.renderer.removeClass(element, 'is-desktop');
    this.renderer.removeClass(element, 'is-touch');
    this.renderer.removeClass(element, 'is-hover');

    // Add current breakpoint classes
    if (isMobile) {
      this.renderer.addClass(element, 'is-mobile');
    }

    if (isTablet) {
      this.renderer.addClass(element, 'is-tablet');
    }

    if (isDesktop) {
      this.renderer.addClass(element, 'is-desktop');
    }

    if (isTouchDevice) {
      this.renderer.addClass(element, 'is-touch');
    } else {
      this.renderer.addClass(element, 'is-hover');
    }

    // Apply configuration-specific classes
    if (this.config.useDenseLayout && this.responsiveService.shouldUseDenseLayout()) {
      this.renderer.addClass(element, 'use-dense-layout');
    } else {
      this.renderer.removeClass(element, 'use-dense-layout');
    }
  }

  /// <summary>
  /// Update responsive styles based on current configuration.
  /// </summary>
  private updateResponsiveStyles(): void {
    const element = this.elementRef.nativeElement;

    // Update grid columns if configured
    if (this.isGridElement() && this.hasColumnConfiguration()) {
      this.updateGridColumns();
    }

    // Update touch targets for touch devices
    if (this.responsiveService.isTouchDevice() && this.config.touchOptimized) {
      this.applyTouchOptimizations();
    }

    // Update spacing based on screen size
    this.updateResponsiveSpacing();
  }

  /// <summary>
  /// Check if element is a grid container.
  /// </summary>
  /// <returns>True if element uses CSS Grid</returns>
  private isGridElement(): boolean {
    const element = this.elementRef.nativeElement;
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.display === 'grid';
  }

  /// <summary>
  /// Check if configuration includes column settings.
  /// </summary>
  /// <returns>True if column configuration is provided</returns>
  private hasColumnConfiguration(): boolean {
    return !!(this.config.mobileColumns ||
              this.config.tabletColumns ||
              this.config.desktopColumns);
  }

  /// <summary>
  /// Update grid template columns based on current breakpoint.
  /// </summary>
  private updateGridColumns(): void {
    const element = this.elementRef.nativeElement;
    let columns: number;

    if (this.responsiveService.isMobile()) {
      columns = this.config.mobileColumns ?? 1;
    } else if (this.responsiveService.isTablet()) {
      columns = this.config.tabletColumns ?? 2;
    } else {
      columns = this.config.desktopColumns ?? 4;
    }

    const gridTemplate = `repeat(${columns}, 1fr)`;
    this.renderer.setStyle(element, 'grid-template-columns', gridTemplate);
  }

  /// <summary>
  /// Apply touch-specific optimizations to the element.
  /// </summary>
  private applyTouchOptimizations(): void {
    const element = this.elementRef.nativeElement;
    const tagName = element.tagName.toLowerCase();

    // Increase touch targets for interactive elements
    if (this.isInteractiveElement(tagName)) {
      this.renderer.setStyle(element, 'min-height', '44px');
      this.renderer.setStyle(element, 'min-width', '44px');
    }

    // Add touch-friendly padding
    if (tagName === 'button' || element.hasAttribute('role') && element.getAttribute('role') === 'button') {
      this.renderer.setStyle(element, 'padding', '12px 16px');
    }
  }

  /// <summary>
  /// Check if element is interactive and needs touch optimization.
  /// </summary>
  /// <param name="tagName">HTML tag name</param>
  /// <returns>True if element is interactive</returns>
  private isInteractiveElement(tagName: string): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    return interactiveTags.includes(tagName) ||
           this.elementRef.nativeElement.hasAttribute('tabindex');
  }

  /// <summary>
  /// Update spacing based on current screen size.
  /// </summary>
  private updateResponsiveSpacing(): void {
    const element = this.elementRef.nativeElement;
    const baseSpacing = 16; // 1rem in pixels
    const adjustedSpacing = this.responsiveService.getSpacing(baseSpacing);

    // Update CSS custom properties for responsive spacing
    this.renderer.setStyle(element, '--responsive-spacing', `${adjustedSpacing}px`);
    this.renderer.setStyle(element, '--responsive-spacing-sm', `${adjustedSpacing * 0.5}px`);
    this.renderer.setStyle(element, '--responsive-spacing-lg', `${adjustedSpacing * 1.5}px`);
  }

  /// <summary>
  /// Update configuration at runtime.
  /// </summary>
  /// <param name="newConfig">New responsive configuration</param>
  updateConfig(newConfig: Partial<ResponsiveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateResponsiveClasses();
    this.updateResponsiveStyles();
  }

  /// <summary>
  /// Get current responsive state for debugging.
  /// </summary>
  /// <returns>Current responsive state information</returns>
  getResponsiveState(): Record<string, any> {
    return {
      breakpoint: this.responsiveService.currentBreakpoint(),
      isMobile: this.responsiveService.isMobile(),
      isTablet: this.responsiveService.isTablet(),
      isDesktop: this.responsiveService.isDesktop(),
      isTouchDevice: this.responsiveService.isTouchDevice(),
      config: this.config,
      elementClasses: Array.from(this.elementRef.nativeElement.classList),
      computedStyles: window.getComputedStyle(this.elementRef.nativeElement)
    };
  }
}

/// <summary>
/// Directive for responsive grid containers with automatic column adjustment.
/// </summary>
@Directive({
  selector: '[adminResponsiveGrid]',
  standalone: true
})
export class AdminResponsiveGridDirective implements OnInit {
  @Input('adminResponsiveGrid') columns: number = 4;
  @Input() gap: string = '1rem';
  @Input() minItemWidth: string = '200px';

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private responsiveService: ResponsiveService
  ) {
    effect(() => {
      this.updateGridLayout();
    });
  }

  ngOnInit(): void {
    this.setupGridContainer();
  }

  /// <summary>
  /// Set up initial grid container styles.
  /// </summary>
  private setupGridContainer(): void {
    const element = this.elementRef.nativeElement;

    this.renderer.setStyle(element, 'display', 'grid');
    this.renderer.setStyle(element, 'gap', this.gap);
    this.renderer.addClass(element, 'admin-responsive-grid');

    this.updateGridLayout();
  }

  /// <summary>
  /// Update grid layout based on current breakpoint.
  /// </summary>
  private updateGridLayout(): void {
    const element = this.elementRef.nativeElement;
    const responsiveColumns = this.responsiveService.getGridColumns(this.columns);

    // Use CSS auto-fit for truly responsive behavior
    const gridTemplate = this.responsiveService.isMobile()
      ? '1fr'
      : `repeat(auto-fit, minmax(${this.minItemWidth}, 1fr))`;

    this.renderer.setStyle(element, 'grid-template-columns', gridTemplate);

    // Set max columns to prevent overflow
    this.renderer.setStyle(element, '--max-columns', responsiveColumns.toString());
  }
}

/// <summary>
/// Directive for responsive typography scaling.
/// </summary>
@Directive({
  selector: '[adminResponsiveText]',
  standalone: true
})
export class AdminResponsiveTextDirective implements OnInit {
  @Input('adminResponsiveText') baseSize: string = '1rem';
  @Input() scaleFactor: number = 0.875;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private responsiveService: ResponsiveService
  ) {
    effect(() => {
      this.updateFontSize();
    });
  }

  ngOnInit(): void {
    this.updateFontSize();
  }

  /// <summary>
  /// Update font size based on current breakpoint.
  /// </summary>
  private updateFontSize(): void {
    const element = this.elementRef.nativeElement;
    let fontSize = this.baseSize;

    if (this.responsiveService.isMobile()) {
      fontSize = `calc(${this.baseSize} * ${this.scaleFactor * this.scaleFactor})`;
    } else if (this.responsiveService.isTablet()) {
      fontSize = `calc(${this.baseSize} * ${this.scaleFactor})`;
    }

    this.renderer.setStyle(element, 'font-size', fontSize);
  }
}
