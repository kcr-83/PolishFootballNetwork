import { Injectable, ElementRef, NgZone, inject } from '@angular/core';
import { Subject, fromEvent, merge, takeUntil, throttleTime, debounceTime } from 'rxjs';

/// <summary>
/// Touch gesture interface for handling touch events.
/// </summary>
interface TouchGesture {
  type: 'tap' | 'double-tap' | 'pinch' | 'pan' | 'swipe';
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  scale?: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  duration: number;
}

/// <summary>
/// Touch configuration options.
/// </summary>
interface TouchConfig {
  doubleTapDelay: number;
  pinchThreshold: number;
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  panThreshold: number;
  enableHapticFeedback: boolean;
  reducedMotion: boolean;
}

/// <summary>
/// Mobile touch service for handling advanced touch interactions.
/// Provides touch gestures, haptic feedback, and mobile-optimized interactions.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class MobileTouchService {
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  // Touch state
  private touchStartTime = 0;
  private lastTapTime = 0;
  private touchStartPositions: { x: number; y: number }[] = [];
  private initialDistance = 0;
  private initialScale = 1;
  private isPinching = false;
  private isPanning = false;
  private lastTouchPosition: { x: number; y: number } | null = null;

  // Configuration
  private config: TouchConfig = {
    doubleTapDelay: 300,
    pinchThreshold: 10,
    swipeThreshold: 50,
    swipeVelocityThreshold: 0.5,
    panThreshold: 10,
    enableHapticFeedback: 'vibrate' in navigator,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  // Event subjects
  public readonly gestureEvents$ = new Subject<TouchGesture>();
  public readonly tapEvents$ = new Subject<{ x: number; y: number; target: Element }>();
  public readonly doubleTapEvents$ = new Subject<{ x: number; y: number; target: Element }>();
  public readonly pinchEvents$ = new Subject<{ scale: number; center: { x: number; y: number } }>();
  public readonly panEvents$ = new Subject<{ deltaX: number; deltaY: number; velocity: number }>();
  public readonly swipeEvents$ = new Subject<{ direction: string; velocity: number }>();

  /// <summary>
  /// Initialize touch handling for a graph container element.
  /// </summary>
  public initializeTouchHandling(element: ElementRef<HTMLElement>): void {
    if (!element?.nativeElement) return;

    const container = element.nativeElement;

    // Prevent default touch behaviors
    container.style.touchAction = 'none';
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';

    this.ngZone.runOutsideAngular(() => {
      // Touch start
      fromEvent<TouchEvent>(container, 'touchstart', { passive: false })
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => this.handleTouchStart(event));

      // Touch move
      fromEvent<TouchEvent>(container, 'touchmove', { passive: false })
        .pipe(
          takeUntil(this.destroy$),
          throttleTime(16) // ~60fps
        )
        .subscribe(event => this.handleTouchMove(event));

      // Touch end
      fromEvent<TouchEvent>(container, 'touchend', { passive: false })
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => this.handleTouchEnd(event));

      // Touch cancel
      fromEvent<TouchEvent>(container, 'touchcancel', { passive: false })
        .pipe(takeUntil(this.destroy$))
        .subscribe(event => this.handleTouchCancel(event));

      // Mouse events for desktop testing
      if (!this.isTouchDevice()) {
        this.setupMouseEvents(container);
      }
    });

    // Setup reduced motion detection
    this.setupReducedMotionDetection();
  }

  /// <summary>
  /// Handle touch start event.
  /// </summary>
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    this.touchStartTime = Date.now();
    this.touchStartPositions = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY
    }));

    const touches = event.touches;

    if (touches.length === 1) {
      // Single touch - potential tap, double-tap, or pan start
      this.lastTouchPosition = {
        x: touches[0].clientX,
        y: touches[0].clientY
      };
      this.isPanning = false;
    } else if (touches.length === 2) {
      // Two touches - pinch gesture
      this.isPinching = true;
      this.initialDistance = this.getDistance(touches[0], touches[1]);
      this.initialScale = 1;

      // Haptic feedback for pinch start
      this.triggerHapticFeedback('light');
    }
  }

  /// <summary>
  /// Handle touch move event.
  /// </summary>
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    const touches = event.touches;

    if (touches.length === 1 && this.lastTouchPosition) {
      // Single touch movement - panning
      const currentTouch = touches[0];
      const deltaX = currentTouch.clientX - this.lastTouchPosition.x;
      const deltaY = currentTouch.clientY - this.lastTouchPosition.y;

      // Check if movement exceeds pan threshold
      if (!this.isPanning && (Math.abs(deltaX) > this.config.panThreshold || Math.abs(deltaY) > this.config.panThreshold)) {
        this.isPanning = true;
      }

      if (this.isPanning) {
        const velocity = this.calculateVelocity(deltaX, deltaY);

        this.ngZone.run(() => {
          this.panEvents$.next({ deltaX, deltaY, velocity });
        });
      }

      this.lastTouchPosition = {
        x: currentTouch.clientX,
        y: currentTouch.clientY
      };
    } else if (touches.length === 2 && this.isPinching) {
      // Two touches - pinch zoom
      const currentDistance = this.getDistance(touches[0], touches[1]);
      const scale = currentDistance / this.initialDistance;

      const center = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };

      this.ngZone.run(() => {
        this.pinchEvents$.next({ scale, center });
      });
    }
  }

  /// <summary>
  /// Handle touch end event.
  /// </summary>
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;

    if (event.touches.length === 0) {
      // All touches ended
      if (this.isPinching) {
        this.isPinching = false;
        this.triggerHapticFeedback('light');
      } else if (!this.isPanning && touchDuration < 200) {
        // Quick tap without panning
        this.handleTap(event, touchEndTime);
      } else if (this.isPanning && this.lastTouchPosition) {
        // End of pan gesture - check for swipe
        this.handlePanEnd(event, touchDuration);
      }

      this.resetTouchState();
    }
  }

  /// <summary>
  /// Handle touch cancel event.
  /// </summary>
  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();
    this.resetTouchState();
  }

  /// <summary>
  /// Handle tap gesture detection.
  /// </summary>
  private handleTap(event: TouchEvent, currentTime: number): void {
    const changedTouch = event.changedTouches[0];
    const tapPosition = { x: changedTouch.clientX, y: changedTouch.clientY };
    const target = event.target as Element;

    // Check for double tap
    if (currentTime - this.lastTapTime < this.config.doubleTapDelay) {
      this.triggerHapticFeedback('medium');
      this.ngZone.run(() => {
        this.doubleTapEvents$.next({ ...tapPosition, target });
      });
    } else {
      // Single tap
      this.triggerHapticFeedback('light');
      this.ngZone.run(() => {
        this.tapEvents$.next({ ...tapPosition, target });
      });
    }

    this.lastTapTime = currentTime;
  }

  /// <summary>
  /// Handle end of pan gesture and detect swipes.
  /// </summary>
  private handlePanEnd(event: TouchEvent, duration: number): void {
    if (!this.lastTouchPosition || !this.touchStartPositions[0]) return;

    const endPosition = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };

    const startPosition = this.touchStartPositions[0];
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Check for swipe gesture
    if (distance > this.config.swipeThreshold && velocity > this.config.swipeVelocityThreshold) {
      const direction = this.getSwipeDirection(deltaX, deltaY);

      this.triggerHapticFeedback('medium');
      this.ngZone.run(() => {
        this.swipeEvents$.next({ direction, velocity });
      });
    }
  }

  /// <summary>
  /// Setup mouse events for desktop testing.
  /// </summary>
  private setupMouseEvents(container: HTMLElement): void {
    let isMouseDown = false;
    let lastMousePosition: { x: number; y: number } | null = null;

    fromEvent<MouseEvent>(container, 'mousedown')
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        isMouseDown = true;
        lastMousePosition = { x: event.clientX, y: event.clientY };
      });

    fromEvent<MouseEvent>(container, 'mousemove')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(16)
      )
      .subscribe(event => {
        if (isMouseDown && lastMousePosition) {
          const deltaX = event.clientX - lastMousePosition.x;
          const deltaY = event.clientY - lastMousePosition.y;

          this.ngZone.run(() => {
            this.panEvents$.next({ deltaX, deltaY, velocity: 0 });
          });

          lastMousePosition = { x: event.clientX, y: event.clientY };
        }
      });

    fromEvent<MouseEvent>(container, 'mouseup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        isMouseDown = false;
        lastMousePosition = null;
      });
  }

  /// <summary>
  /// Setup reduced motion detection.
  /// </summary>
  private setupReducedMotionDetection(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateReducedMotion = () => {
      this.config.reducedMotion = mediaQuery.matches;
    };

    updateReducedMotion();
    mediaQuery.addEventListener('change', updateReducedMotion);
  }

  /// <summary>
  /// Trigger haptic feedback if supported and enabled.
  /// </summary>
  private triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.config.enableHapticFeedback || this.config.reducedMotion) return;

    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30, 10, 30]
        };
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      // Haptic feedback not supported, silently fail
    }
  }

  /// <summary>
  /// Calculate distance between two touch points.
  /// </summary>
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /// <summary>
  /// Calculate velocity from deltas.
  /// </summary>
  private calculateVelocity(deltaX: number, deltaY: number): number {
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /// <summary>
  /// Get swipe direction from deltas.
  /// </summary>
  private getSwipeDirection(deltaX: number, deltaY: number): string {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /// <summary>
  /// Reset touch state.
  /// </summary>
  private resetTouchState(): void {
    this.isPinching = false;
    this.isPanning = false;
    this.lastTouchPosition = null;
    this.touchStartPositions = [];
  }

  /// <summary>
  /// Check if device supports touch.
  /// </summary>
  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /// <summary>
  /// Check if device is mobile.
  /// </summary>
  public isMobileDevice(): boolean {
    return window.innerWidth <= 768 || this.isTouchDevice();
  }

  /// <summary>
  /// Update touch configuration.
  /// </summary>
  public updateConfig(newConfig: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /// <summary>
  /// Get current touch configuration.
  /// </summary>
  public getConfig(): TouchConfig {
    return { ...this.config };
  }

  /// <summary>
  /// Destroy service and cleanup.
  /// </summary>
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
