import { Injectable, inject, NgZone } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snackbar';
import { BehaviorSubject, Subject, fromEvent, merge, debounceTime, throttleTime, takeUntil } from 'rxjs';
import { MobileBottomSheetComponent } from '../../features/graph/components/mobile-bottom-sheet.component';
import { ClubDto } from '../models/club.model';
import { ConnectionDto } from '../models/connection.model';

/// <summary>
/// Mobile gesture configuration.
/// </summary>
interface MobileGestureConfig {
  swipeThreshold: number;
  swipeTimeout: number;
  tapTimeout: number;
  doubleTapTimeout: number;
  longPressTimeout: number;
  enableHaptics: boolean;
}

/// <summary>
/// Touch target configuration.
/// </summary>
interface TouchTargetConfig {
  minSize: number;
  recommendedSize: number;
  largeSize: number;
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

/// <summary>
/// Mobile utilities service for enhanced mobile UX.
/// Provides touch target optimization, gesture helpers, and mobile-specific UI patterns.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class MobileUtilitiesService {
  private readonly ngZone = inject(NgZone);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // Configuration
  private readonly gestureConfig: MobileGestureConfig = {
    swipeThreshold: 50,
    swipeTimeout: 300,
    tapTimeout: 300,
    doubleTapTimeout: 300,
    longPressTimeout: 500,
    enableHaptics: true
  };

  private readonly touchTargetConfig: TouchTargetConfig = {
    minSize: 44,
    recommendedSize: 48,
    largeSize: 56,
    spacing: {
      small: 8,
      medium: 16,
      large: 24
    }
  };

  // State
  private readonly keyboardHeight$ = new BehaviorSubject<number>(0);
  private readonly isKeyboardOpen$ = new BehaviorSubject<boolean>(false);
  private readonly swipeIndicators$ = new BehaviorSubject<{ direction: string; visible: boolean } | null>(null);

  // Observable getters
  public readonly keyboardHeight = this.keyboardHeight$.asObservable();
  public readonly isKeyboardOpen = this.isKeyboardOpen$.asObservable();
  public readonly swipeIndicators = this.swipeIndicators$.asObservable();

  constructor() {
    this.initializeMobileUtilities();
  }

  /// <summary>
  /// Initialize mobile utilities.
  /// </summary>
  private initializeMobileUtilities(): void {
    this.setupKeyboardDetection();
    this.setupTouchTargetEnhancements();
    this.setupGestureIndicators();
  }

  /// <summary>
  /// Setup keyboard detection for mobile devices.
  /// </summary>
  private setupKeyboardDetection(): void {
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport!;

      fromEvent(visualViewport, 'resize')
        .pipe(
          debounceTime(100),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          const keyboardHeight = window.innerHeight - visualViewport.height;
          const isOpen = keyboardHeight > 150; // Threshold for keyboard detection

          this.keyboardHeight$.next(Math.max(0, keyboardHeight));
          this.isKeyboardOpen$.next(isOpen);

          // Apply keyboard-specific styles
          if (isOpen) {
            document.body.classList.add('keyboard-open');
          } else {
            document.body.classList.remove('keyboard-open');
          }
        });
    }
  }

  /// <summary>
  /// Setup touch target enhancements.
  /// </summary>
  private setupTouchTargetEnhancements(): void {
    // Add CSS custom properties for touch targets
    const root = document.documentElement;
    root.style.setProperty('--touch-target-min', `${this.touchTargetConfig.minSize}px`);
    root.style.setProperty('--touch-target-recommended', `${this.touchTargetConfig.recommendedSize}px`);
    root.style.setProperty('--touch-target-large', `${this.touchTargetConfig.largeSize}px`);
    root.style.setProperty('--touch-spacing-small', `${this.touchTargetConfig.spacing.small}px`);
    root.style.setProperty('--touch-spacing-medium', `${this.touchTargetConfig.spacing.medium}px`);
    root.style.setProperty('--touch-spacing-large', `${this.touchTargetConfig.spacing.large}px`);
  }

  /// <summary>
  /// Setup gesture indicators.
  /// </summary>
  private setupGestureIndicators(): void {
    // Listen for custom gesture events
    fromEvent(document, 'mobile-gesture')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        this.showGestureIndicator(event.detail.direction);
      });
  }

  /// <summary>
  /// Show gesture indicator.
  /// </summary>
  private showGestureIndicator(direction: string): void {
    this.swipeIndicators$.next({ direction, visible: true });

    setTimeout(() => {
      this.swipeIndicators$.next({ direction, visible: false });
    }, 1000);
  }

  /// <summary>
  /// Open mobile bottom sheet for club information.
  /// </summary>
  public openClubBottomSheet(club: ClubDto, connections?: ConnectionDto[]): MatBottomSheetRef<MobileBottomSheetComponent> {
    return this.bottomSheet.open(MobileBottomSheetComponent, {
      data: {
        type: 'club-info',
        club,
        connections
      },
      panelClass: 'mobile-bottom-sheet-panel',
      backdropClass: 'mobile-bottom-sheet-backdrop',
      hasBackdrop: true,
      disableClose: false
    });
  }

  /// <summary>
  /// Open mobile bottom sheet for actions.
  /// </summary>
  public openActionsBottomSheet(): MatBottomSheetRef<MobileBottomSheetComponent> {
    return this.bottomSheet.open(MobileBottomSheetComponent, {
      data: {
        type: 'actions'
      },
      panelClass: 'mobile-bottom-sheet-panel',
      backdropClass: 'mobile-bottom-sheet-backdrop'
    });
  }

  /// <summary>
  /// Open mobile bottom sheet for filters.
  /// </summary>
  public openFiltersBottomSheet(filterData?: any): MatBottomSheetRef<MobileBottomSheetComponent> {
    return this.bottomSheet.open(MobileBottomSheetComponent, {
      data: {
        type: 'filters',
        data: filterData
      },
      panelClass: 'mobile-bottom-sheet-panel'
    });
  }

  /// <summary>
  /// Open mobile bottom sheet for search.
  /// </summary>
  public openSearchBottomSheet(): MatBottomSheetRef<MobileBottomSheetComponent> {
    return this.bottomSheet.open(MobileBottomSheetComponent, {
      data: {
        type: 'search'
      },
      panelClass: 'mobile-bottom-sheet-panel'
    });
  }

  /// <summary>
  /// Show mobile-optimized notification.
  /// </summary>
  public showMobileNotification(message: string, action?: string, config?: Partial<MatSnackBarConfig>): void {
    const defaultConfig: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['mobile-snackbar']
    };

    const finalConfig = { ...defaultConfig, ...config };

    const snackBarRef = this.snackBar.open(message, action, finalConfig);

    // Add haptic feedback for notifications
    if (this.gestureConfig.enableHaptics) {
      this.triggerHapticFeedback('light');
    }

    // Handle action button
    if (action) {
      snackBarRef.onAction().subscribe(() => {
        this.triggerHapticFeedback('medium');
      });
    }
  }

  /// <summary>
  /// Show success notification.
  /// </summary>
  public showSuccessNotification(message: string): void {
    this.showMobileNotification(message, 'OK', {
      panelClass: ['mobile-snackbar', 'success-snackbar'],
      duration: 3000
    });
  }

  /// <summary>
  /// Show error notification.
  /// </summary>
  public showErrorNotification(message: string): void {
    this.showMobileNotification(message, 'DISMISS', {
      panelClass: ['mobile-snackbar', 'error-snackbar'],
      duration: 6000
    });
  }

  /// <summary>
  /// Show warning notification.
  /// </summary>
  public showWarningNotification(message: string): void {
    this.showMobileNotification(message, 'OK', {
      panelClass: ['mobile-snackbar', 'warning-snackbar'],
      duration: 5000
    });
  }

  /// <summary>
  /// Trigger haptic feedback.
  /// </summary>
  public triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.gestureConfig.enableHaptics) return;

    try {
      if ('vibrate' in navigator) {
        let pattern: number[];

        switch (type) {
          case 'light':
            pattern = [10];
            break;
          case 'medium':
            pattern = [20];
            break;
          case 'heavy':
            pattern = [30];
            break;
          default:
            pattern = [10];
        }

        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Haptic feedback not supported
      console.debug('Haptic feedback not supported:', error);
    }
  }

  /// <summary>
  /// Enhance element for touch interactions.
  /// </summary>
  public enhanceElementForTouch(element: HTMLElement, config?: Partial<TouchTargetConfig>): void {
    const finalConfig = { ...this.touchTargetConfig, ...config };

    // Apply minimum touch target size
    element.style.minWidth = `${finalConfig.recommendedSize}px`;
    element.style.minHeight = `${finalConfig.recommendedSize}px`;

    // Add touch feedback
    element.classList.add('touch-feedback');

    // Add touch event listeners for visual feedback
    let touchStartTime = 0;

    element.addEventListener('touchstart', (event) => {
      touchStartTime = Date.now();
      element.classList.add('touch-active');

      // Light haptic feedback on touch start
      this.triggerHapticFeedback('light');
    }, { passive: true });

    element.addEventListener('touchend', (event) => {
      const touchDuration = Date.now() - touchStartTime;
      element.classList.remove('touch-active');

      // Add ripple effect
      this.addRippleEffect(element, event);

      // Haptic feedback for successful interaction
      if (touchDuration < this.gestureConfig.longPressTimeout) {
        this.triggerHapticFeedback('medium');
      }
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
      element.classList.remove('touch-active');
    }, { passive: true });
  }

  /// <summary>
  /// Add ripple effect to element.
  /// </summary>
  private addRippleEffect(element: HTMLElement, event: TouchEvent): void {
    const rect = element.getBoundingClientRect();
    const touch = event.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /// <summary>
  /// Setup swipe gestures for element.
  /// </summary>
  public setupSwipeGestures(
    element: HTMLElement,
    callbacks: {
      onSwipeLeft?: () => void;
      onSwipeRight?: () => void;
      onSwipeUp?: () => void;
      onSwipeDown?: () => void;
    }
  ): void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    element.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    }, { passive: true });

    element.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Check if it's a valid swipe
      if (deltaTime > this.gestureConfig.swipeTimeout) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < this.gestureConfig.swipeThreshold) return;

      // Determine swipe direction
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && callbacks.onSwipeRight) {
          callbacks.onSwipeRight();
          this.showGestureIndicator('right');
        } else if (deltaX < 0 && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft();
          this.showGestureIndicator('left');
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
          this.showGestureIndicator('down');
        } else if (deltaY < 0 && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
          this.showGestureIndicator('up');
        }
      }

      this.triggerHapticFeedback('medium');
    }, { passive: true });
  }

  /// <summary>
  /// Check if device is mobile.
  /// </summary>
  public isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  /// <summary>
  /// Check if device supports touch.
  /// </summary>
  public isTouchDevice(): boolean {
    return 'ontouchstart' in window ||
           navigator.maxTouchPoints > 0 ||
           (navigator as any).msMaxTouchPoints > 0;
  }

  /// <summary>
  /// Get safe area insets.
  /// </summary>
  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const style = getComputedStyle(document.documentElement);

    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10)
    };
  }

  /// <summary>
  /// Get current keyboard height.
  /// </summary>
  public getCurrentKeyboardHeight(): number {
    return this.keyboardHeight$.value;
  }

  /// <summary>
  /// Check if keyboard is currently open.
  /// </summary>
  public getIsKeyboardOpen(): boolean {
    return this.isKeyboardOpen$.value;
  }

  /// <summary>
  /// Enable/disable haptic feedback.
  /// </summary>
  public setHapticFeedbackEnabled(enabled: boolean): void {
    this.gestureConfig.enableHaptics = enabled;
  }

  /// <summary>
  /// Update gesture configuration.
  /// </summary>
  public updateGestureConfig(config: Partial<MobileGestureConfig>): void {
    Object.assign(this.gestureConfig, config);
  }

  /// <summary>
  /// Update touch target configuration.
  /// </summary>
  public updateTouchTargetConfig(config: Partial<TouchTargetConfig>): void {
    Object.assign(this.touchTargetConfig, config);
    this.setupTouchTargetEnhancements();
  }

  /// <summary>
  /// Destroy service and cleanup.
  /// </summary>
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
