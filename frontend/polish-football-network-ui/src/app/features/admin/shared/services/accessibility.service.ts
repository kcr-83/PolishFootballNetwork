import { Injectable, signal, effect } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/// <summary>
/// Service for managing accessibility features and WCAG compliance across the admin panel.
/// Provides utilities for screen readers, keyboard navigation, focus management, and color contrast.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly _announcements = new BehaviorSubject<string>('');
  private readonly _focusedElement = signal<HTMLElement | null>(null);
  private readonly _highContrastMode = signal<boolean>(false);
  private readonly _reducedMotion = signal<boolean>(false);
  private readonly _fontSize = signal<'normal' | 'large' | 'extra-large'>('normal');

  // Public readonly signals
  readonly focusedElement = this._focusedElement.asReadonly();
  readonly highContrastMode = this._highContrastMode.asReadonly();
  readonly reducedMotion = this._reducedMotion.asReadonly();
  readonly fontSize = this._fontSize.asReadonly();

  // Observable for screen reader announcements
  readonly announcements$: Observable<string> = this._announcements.asObservable();

  private focusStack: HTMLElement[] = [];
  private lastActiveElement: HTMLElement | null = null;

  constructor() {
    this.initializeAccessibilityFeatures();
    this.setupPreferenceDetection();
    this.setupKeyboardNavigation();
  }

  /// <summary>
  /// Initialize accessibility features and ARIA live region.
  /// </summary>
  private initializeAccessibilityFeatures(): void {
    this.createAriaLiveRegion();
    this.setupFocusManagement();
    this.initializeAccessibilitySettings();
  }

  /// <summary>
  /// Create ARIA live region for announcements.
  /// </summary>
  private createAriaLiveRegion(): void {
    if (!document.getElementById('aria-live-announcements')) {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
  }

  /// <summary>
  /// Setup focus management for modal dialogs and navigation.
  /// </summary>
  private setupFocusManagement(): void {
    // Track focus changes for debugging and navigation
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      this._focusedElement.set(target);
      this.lastActiveElement = target;
    });

    // Escape key handling for modal dialogs
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
  }

  /// <summary>
  /// Initialize accessibility settings from user preferences.
  /// </summary>
  private initializeAccessibilitySettings(): void {
    // Load saved preferences
    const savedFontSize = localStorage.getItem('admin-font-size') as 'normal' | 'large' | 'extra-large';
    if (savedFontSize) {
      this._fontSize.set(savedFontSize);
    }

    const savedHighContrast = localStorage.getItem('admin-high-contrast') === 'true';
    this._highContrastMode.set(savedHighContrast);

    // Apply initial settings
    this.applyFontSize();
    this.applyHighContrast();
  }

  /// <summary>
  /// Detect user preferences for motion and contrast.
  /// </summary>
  private setupPreferenceDetection(): void {
    // Detect reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reducedMotion.set(reducedMotionQuery.matches);

    reducedMotionQuery.addEventListener('change', (e) => {
      this._reducedMotion.set(e.matches);
    });

    // Detect high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const systemHighContrast = highContrastQuery.matches;

    if (systemHighContrast && !localStorage.getItem('admin-high-contrast')) {
      this._highContrastMode.set(true);
    }

    highContrastQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('admin-high-contrast')) {
        this._highContrastMode.set(e.matches);
      }
    });
  }

  /// <summary>
  /// Setup global keyboard navigation shortcuts.
  /// </summary>
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      // Skip navigation shortcuts when typing in inputs
      if (this.isTypingContext(event.target as HTMLElement)) {
        return;
      }

      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '/':
            event.preventDefault();
            this.focusSearchInput();
            break;
          case 'b':
            event.preventDefault();
            this.toggleSidenav();
            break;
          case 'h':
            event.preventDefault();
            this.focusHomeLink();
            break;
          case 'k':
            event.preventDefault();
            this.openCommandPalette();
            break;
        }
      }

      // Arrow key navigation for grids and lists
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowKeyNavigation(event);
      }
    });
  }

  /// <summary>
  /// Announce message to screen readers.
  /// </summary>
  /// <param name="message">Message to announce</param>
  /// <param name="priority">Announcement priority level</param>
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const liveRegion = document.getElementById('aria-live-announcements');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      this._announcements.next(message);

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /// <summary>
  /// Announce navigation change to screen readers.
  /// </summary>
  /// <param name="pageName">Name of the current page</param>
  /// <param name="breadcrumbs">Breadcrumb path</param>
  announceNavigation(pageName: string, breadcrumbs?: string[]): void {
    let message = `Navigated to ${pageName}`;
    if (breadcrumbs && breadcrumbs.length > 0) {
      message += `. Path: ${breadcrumbs.join(' > ')}`;
    }
    this.announce(message);
  }

  /// <summary>
  /// Announce action completion to screen readers.
  /// </summary>
  /// <param name="action">Action that was completed</param>
  /// <param name="result">Result of the action</param>
  announceAction(action: string, result: 'success' | 'error' | 'warning'): void {
    const resultText = result === 'success' ? 'completed successfully' :
                      result === 'error' ? 'failed' : 'completed with warnings';
    this.announce(`${action} ${resultText}`, result === 'error' ? 'assertive' : 'polite');
  }

  /// <summary>
  /// Focus on element with proper error handling and announcement.
  /// </summary>
  /// <param name="element">Element to focus</param>
  /// <param name="announce">Whether to announce focus change</param>
  focusElement(element: HTMLElement | null, announce: boolean = false): boolean {
    if (!element) return false;

    try {
      element.focus();

      if (announce) {
        const label = this.getElementLabel(element);
        if (label) {
          this.announce(`Focused on ${label}`);
        }
      }

      return document.activeElement === element;
    } catch (error) {
      console.warn('Failed to focus element:', error);
      return false;
    }
  }

  /// <summary>
  /// Push current focus to focus stack for later restoration.
  /// </summary>
  pushFocus(): void {
    if (this.lastActiveElement) {
      this.focusStack.push(this.lastActiveElement);
    }
  }

  /// <summary>
  /// Restore focus from focus stack.
  /// </summary>
  popFocus(): boolean {
    const previousElement = this.focusStack.pop();
    if (previousElement && document.contains(previousElement)) {
      return this.focusElement(previousElement);
    }
    return false;
  }

  /// <summary>
  /// Trap focus within a container element.
  /// </summary>
  /// <param name="container">Container to trap focus within</param>
  trapFocus(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element initially
    this.focusElement(firstElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            this.focusElement(lastElement);
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            this.focusElement(firstElement);
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Store cleanup function
    (container as any)._focusTrapCleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /// <summary>
  /// Release focus trap from container.
  /// </summary>
  /// <param name="container">Container to release focus trap from</param>
  releaseFocusTrap(container: HTMLElement): void {
    if ((container as any)._focusTrapCleanup) {
      (container as any)._focusTrapCleanup();
      delete (container as any)._focusTrapCleanup;
    }
  }

  /// <summary>
  /// Get all focusable elements within a container.
  /// </summary>
  /// <param name="container">Container to search within</param>
  /// <returns>Array of focusable elements</returns>
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selectors))
      .filter(el => {
        const element = el as HTMLElement;
        return element.offsetParent !== null &&
               !element.hasAttribute('hidden') &&
               window.getComputedStyle(element).visibility !== 'hidden';
      }) as HTMLElement[];
  }

  /// <summary>
  /// Toggle high contrast mode.
  /// </summary>
  toggleHighContrast(): void {
    const newValue = !this._highContrastMode();
    this._highContrastMode.set(newValue);
    localStorage.setItem('admin-high-contrast', newValue.toString());
    this.applyHighContrast();
    this.announce(`High contrast mode ${newValue ? 'enabled' : 'disabled'}`);
  }

  /// <summary>
  /// Set font size preference.
  /// </summary>
  /// <param name="size">Font size setting</param>
  setFontSize(size: 'normal' | 'large' | 'extra-large'): void {
    this._fontSize.set(size);
    localStorage.setItem('admin-font-size', size);
    this.applyFontSize();
    this.announce(`Font size changed to ${size}`);
  }

  /// <summary>
  /// Apply high contrast styles to document.
  /// </summary>
  private applyHighContrast(): void {
    if (this._highContrastMode()) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  }

  /// <summary>
  /// Apply font size styles to document.
  /// </summary>
  private applyFontSize(): void {
    const sizeClasses = ['font-size-normal', 'font-size-large', 'font-size-extra-large'];
    sizeClasses.forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add(`font-size-${this._fontSize()}`);
  }

  /// <summary>
  /// Check if current context is for typing (input fields).
  /// </summary>
  /// <param name="element">Current focused element</param>
  /// <returns>True if user is typing in an input</returns>
  private isTypingContext(element: HTMLElement): boolean {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    const isInput = ['input', 'textarea', 'select'].includes(tagName);
    const isContentEditable = element.contentEditable === 'true';
    const hasRole = ['textbox', 'searchbox', 'combobox'].includes(element.getAttribute('role') || '');

    return isInput || isContentEditable || hasRole;
  }

  /// <summary>
  /// Get accessible label for an element.
  /// </summary>
  /// <param name="element">Element to get label for</param>
  /// <returns>Accessible label text</returns>
  private getElementLabel(element: HTMLElement): string {
    // Try aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Try aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    // Try associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent || '';
    }

    // Try parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent || '';

    // Fallback to element text or title
    return element.textContent || element.getAttribute('title') || 'Unknown element';
  }

  /// <summary>
  /// Handle escape key for closing modals/menus.
  /// </summary>
  private handleEscapeKey(): void {
    // Close any open dialogs or modals
    const openDialog = document.querySelector('.cdk-dialog-container, .mat-dialog-container');
    if (openDialog) {
      const closeButton = openDialog.querySelector('[mat-dialog-close], [cdkDialogClose]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
        return;
      }
    }

    // Close any open menus
    const openMenu = document.querySelector('.mat-menu-panel');
    if (openMenu) {
      document.body.click(); // Close menu by clicking outside
      return;
    }

    // Restore previous focus if available
    this.popFocus();
  }

  /// <summary>
  /// Focus search input if available.
  /// </summary>
  private focusSearchInput(): void {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]') as HTMLElement;
    if (searchInput) {
      this.focusElement(searchInput, true);
    }
  }

  /// <summary>
  /// Toggle sidenav via keyboard shortcut.
  /// </summary>
  private toggleSidenav(): void {
    const menuButton = document.querySelector('.menu-toggle, [aria-label*="menu" i]') as HTMLElement;
    if (menuButton) {
      menuButton.click();
      this.announce('Navigation menu toggled');
    }
  }

  /// <summary>
  /// Focus home/dashboard link.
  /// </summary>
  private focusHomeLink(): void {
    const homeLink = document.querySelector('a[href*="dashboard"], a[href="/admin"], .admin-title') as HTMLElement;
    if (homeLink) {
      this.focusElement(homeLink, true);
    }
  }

  /// <summary>
  /// Open command palette (if implemented).
  /// </summary>
  private openCommandPalette(): void {
    // Placeholder for command palette functionality
    this.announce('Command palette not yet implemented');
  }

  /// <summary>
  /// Handle arrow key navigation in grids and lists.
  /// </summary>
  /// <param name="event">Keyboard event</param>
  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const role = target.getAttribute('role');

    // Handle grid navigation
    if (role === 'gridcell' || target.closest('[role="grid"]')) {
      this.handleGridNavigation(event);
    }

    // Handle list navigation
    if (role === 'listitem' || target.closest('[role="list"]')) {
      this.handleListNavigation(event);
    }
  }

  /// <summary>
  /// Handle navigation within grids.
  /// </summary>
  /// <param name="event">Keyboard event</param>
  private handleGridNavigation(event: KeyboardEvent): void {
    // Grid navigation implementation would go here
    // This is a placeholder for proper grid keyboard navigation
  }

  /// <summary>
  /// Handle navigation within lists.
  /// </summary>
  /// <param name="event">Keyboard event</param>
  private handleListNavigation(event: KeyboardEvent): void {
    // List navigation implementation would go here
    // This is a placeholder for proper list keyboard navigation
  }

  /// <summary>
  /// Get current accessibility status for debugging.
  /// </summary>
  /// <returns>Current accessibility configuration</returns>
  getAccessibilityStatus(): Record<string, any> {
    return {
      highContrastMode: this._highContrastMode(),
      reducedMotion: this._reducedMotion(),
      fontSize: this._fontSize(),
      focusedElement: this._focusedElement()?.tagName,
      focusStackSize: this.focusStack.length,
      hasAriaLiveRegion: !!document.getElementById('aria-live-announcements')
    };
  }
}
