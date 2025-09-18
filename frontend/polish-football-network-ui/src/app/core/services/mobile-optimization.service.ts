import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, Subject, fromEvent, merge, debounceTime, throttleTime, takeUntil } from 'rxjs';

/// <summary>
/// Device performance characteristics.
/// </summary>
interface DevicePerformance {
  isMobile: boolean;
  isLowEnd: boolean;
  supportedFeatures: {
    webGL: boolean;
    webGL2: boolean;
    offscreenCanvas: boolean;
    webWorkers: boolean;
    intersectionObserver: boolean;
  };
  memory: {
    total: number;
    available: number;
    pressure: 'nominal' | 'fair' | 'serious' | 'critical';
  };
  battery: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } | null;
}

/// <summary>
/// Performance optimization settings.
/// </summary>
interface PerformanceSettings {
  enableAnimations: boolean;
  animationDuration: number;
  maxNodes: number;
  maxEdges: number;
  enableLabels: boolean;
  enableShadows: boolean;
  renderQuality: 'low' | 'medium' | 'high';
  updateFrequency: number;
  enableVirtualization: boolean;
  prefersReducedMotion: boolean;
}

/// <summary>
/// Mobile optimization service for performance and battery management.
/// Handles device capability detection and adaptive performance settings.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class MobileOptimizationService {
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  // State subjects
  private readonly devicePerformance$ = new BehaviorSubject<DevicePerformance | null>(null);
  private readonly performanceSettings$ = new BehaviorSubject<PerformanceSettings | null>(null);
  private readonly isLowPowerMode$ = new BehaviorSubject<boolean>(false);
  private readonly networkStatus$ = new BehaviorSubject<'online' | 'offline' | 'slow'>('online');

  // Performance monitoring
  private frameCount = 0;
  private frameStartTime = 0;
  private averageFPS = 60;
  private memoryWarningCount = 0;

  // Default settings
  private defaultSettings: PerformanceSettings = {
    enableAnimations: true,
    animationDuration: 300,
    maxNodes: 1000,
    maxEdges: 2000,
    enableLabels: true,
    enableShadows: true,
    renderQuality: 'high',
    updateFrequency: 60,
    enableVirtualization: false,
    prefersReducedMotion: false
  };

  // Observable getters
  public readonly devicePerformance = this.devicePerformance$.asObservable();
  public readonly performanceSettings = this.performanceSettings$.asObservable();
  public readonly isLowPowerMode = this.isLowPowerMode$.asObservable();
  public readonly networkStatus = this.networkStatus$.asObservable();

  constructor() {
    this.initializeOptimization();
  }

  /// <summary>
  /// Initialize mobile optimization and device detection.
  /// </summary>
  private initializeOptimization(): void {
    this.detectDeviceCapabilities();
    this.setupPerformanceMonitoring();
    this.setupBatteryMonitoring();
    this.setupNetworkMonitoring();
    this.setupVisibilityChangeHandling();
    this.setupMemoryPressureHandling();
  }

  /// <summary>
  /// Detect device capabilities and performance characteristics.
  /// </summary>
  private detectDeviceCapabilities(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const gl2 = canvas.getContext('webgl2');

    // Device classification
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.innerWidth <= 768;

    // Performance heuristics
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 2;
    const isLowEnd = hardwareConcurrency <= 2 || deviceMemory <= 2 || isMobile;

    // Feature detection
    const supportedFeatures = {
      webGL: !!gl,
      webGL2: !!gl2,
      offscreenCanvas: 'OffscreenCanvas' in window,
      webWorkers: 'Worker' in window,
      intersectionObserver: 'IntersectionObserver' in window
    };

    // Memory information
    const performance = (window as any).performance;
    const memory = performance?.memory ? {
      total: performance.memory.totalJSHeapSize,
      available: performance.memory.usedJSHeapSize,
      pressure: this.calculateMemoryPressure(performance.memory)
    } : {
      total: deviceMemory * 1024 * 1024 * 1024,
      available: deviceMemory * 1024 * 1024 * 1024 * 0.5,
      pressure: 'nominal' as const
    };

    const devicePerformance: DevicePerformance = {
      isMobile,
      isLowEnd,
      supportedFeatures,
      memory,
      battery: null
    };

    this.devicePerformance$.next(devicePerformance);
    this.optimizeSettingsForDevice(devicePerformance);
  }

  /// <summary>
  /// Setup performance monitoring.
  /// </summary>
  private setupPerformanceMonitoring(): void {
    if (!('requestAnimationFrame' in window)) return;

    const measureFPS = () => {
      this.frameCount++;
      const now = performance.now();

      if (this.frameStartTime === 0) {
        this.frameStartTime = now;
      }

      const elapsed = now - this.frameStartTime;
      if (elapsed >= 1000) {
        this.averageFPS = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.frameStartTime = now;

        // Adjust settings if FPS is low
        if (this.averageFPS < 30) {
          this.degradePerformance();
        } else if (this.averageFPS > 50) {
          this.improvePerformance();
        }
      }

      requestAnimationFrame(measureFPS);
    };

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(measureFPS);
    });
  }

  /// <summary>
  /// Setup battery monitoring.
  /// </summary>
  private setupBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          const devicePerformance = this.devicePerformance$.value;
          if (devicePerformance) {
            devicePerformance.battery = {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            };
            this.devicePerformance$.next(devicePerformance);

            // Enable low power mode if battery is low
            this.isLowPowerMode$.next(battery.level < 0.2 && !battery.charging);
          }
        };

        updateBatteryInfo();
        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('levelchange', updateBatteryInfo);
      }).catch(() => {
        // Battery API not supported
      });
    }
  }

  /// <summary>
  /// Setup network monitoring.
  /// </summary>
  private setupNetworkMonitoring(): void {
    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        this.networkStatus$.next('offline');
        return;
      }

      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      if (connection) {
        const slowTypes = ['slow-2g', '2g', '3g'];
        const isSlow = slowTypes.includes(connection.effectiveType) ||
                      connection.downlink < 1;
        this.networkStatus$.next(isSlow ? 'slow' : 'online');
      } else {
        this.networkStatus$.next('online');
      }
    };

    updateNetworkStatus();

    fromEvent(window, 'online')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => updateNetworkStatus());

    fromEvent(window, 'offline')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => updateNetworkStatus());

    if ((navigator as any).connection) {
      fromEvent((navigator as any).connection, 'change')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => updateNetworkStatus());
    }
  }

  /// <summary>
  /// Setup visibility change handling for battery optimization.
  /// </summary>
  private setupVisibilityChangeHandling(): void {
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const settings = this.performanceSettings$.value;
        if (settings) {
          if (document.hidden) {
            // Reduce performance when page is hidden
            this.updatePerformanceSettings({
              ...settings,
              updateFrequency: 10,
              enableAnimations: false
            });
          } else {
            // Restore performance when page is visible
            this.optimizeSettingsForDevice(this.devicePerformance$.value!);
          }
        }
      });
  }

  /// <summary>
  /// Setup memory pressure handling.
  /// </summary>
  private setupMemoryPressureHandling(): void {
    // Listen for memory pressure events (experimental)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          const pressure = this.calculateMemoryPressure(memInfo);
          const devicePerformance = this.devicePerformance$.value;

          if (devicePerformance) {
            devicePerformance.memory.pressure = pressure;
            this.devicePerformance$.next(devicePerformance);

            if (pressure === 'serious' || pressure === 'critical') {
              this.memoryWarningCount++;
              if (this.memoryWarningCount > 3) {
                this.degradePerformance();
              }
            } else {
              this.memoryWarningCount = 0;
            }
          }
        }
      }, 5000);
    }
  }

  /// <summary>
  /// Calculate memory pressure level.
  /// </summary>
  private calculateMemoryPressure(memInfo: any): 'nominal' | 'fair' | 'serious' | 'critical' {
    const usageRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;

    if (usageRatio > 0.9) return 'critical';
    if (usageRatio > 0.75) return 'serious';
    if (usageRatio > 0.6) return 'fair';
    return 'nominal';
  }

  /// <summary>
  /// Optimize settings for detected device capabilities.
  /// </summary>
  private optimizeSettingsForDevice(devicePerformance: DevicePerformance): void {
    if (!devicePerformance) return;

    const settings = { ...this.defaultSettings };

    // Mobile optimizations
    if (devicePerformance.isMobile) {
      settings.animationDuration = 200;
      settings.maxNodes = 500;
      settings.maxEdges = 1000;
      settings.renderQuality = 'medium';
      settings.updateFrequency = 30;
      settings.enableVirtualization = true;
    }

    // Low-end device optimizations
    if (devicePerformance.isLowEnd) {
      settings.enableAnimations = false;
      settings.enableShadows = false;
      settings.maxNodes = 250;
      settings.maxEdges = 500;
      settings.renderQuality = 'low';
      settings.updateFrequency = 20;
      settings.enableVirtualization = true;
    }

    // Feature-based optimizations
    if (!devicePerformance.supportedFeatures.webGL) {
      settings.renderQuality = 'low';
      settings.enableShadows = false;
    }

    // Battery-based optimizations
    if (this.isLowPowerMode$.value) {
      settings.enableAnimations = false;
      settings.updateFrequency = 15;
      settings.renderQuality = 'low';
    }

    // Reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settings.enableAnimations = false;
      settings.prefersReducedMotion = true;
    }

    this.performanceSettings$.next(settings);
  }

  /// <summary>
  /// Degrade performance settings due to low FPS or memory pressure.
  /// </summary>
  private degradePerformance(): void {
    const settings = this.performanceSettings$.value;
    if (!settings) return;

    const degradedSettings = { ...settings };

    if (degradedSettings.renderQuality === 'high') {
      degradedSettings.renderQuality = 'medium';
    } else if (degradedSettings.renderQuality === 'medium') {
      degradedSettings.renderQuality = 'low';
    }

    if (degradedSettings.updateFrequency > 15) {
      degradedSettings.updateFrequency = Math.max(15, degradedSettings.updateFrequency - 10);
    }

    if (degradedSettings.maxNodes > 100) {
      degradedSettings.maxNodes = Math.max(100, degradedSettings.maxNodes - 50);
    }

    degradedSettings.enableAnimations = false;
    degradedSettings.enableShadows = false;

    this.performanceSettings$.next(degradedSettings);
  }

  /// <summary>
  /// Improve performance settings when performance is good.
  /// </summary>
  private improvePerformance(): void {
    const settings = this.performanceSettings$.value;
    const devicePerformance = this.devicePerformance$.value;
    if (!settings || !devicePerformance) return;

    // Only improve if we're not on a low-end device and not in low power mode
    if (devicePerformance.isLowEnd || this.isLowPowerMode$.value) return;

    const improvedSettings = { ...settings };

    if (improvedSettings.renderQuality === 'low') {
      improvedSettings.renderQuality = 'medium';
    } else if (improvedSettings.renderQuality === 'medium' && !devicePerformance.isMobile) {
      improvedSettings.renderQuality = 'high';
    }

    if (improvedSettings.updateFrequency < 60 && !devicePerformance.isMobile) {
      improvedSettings.updateFrequency = Math.min(60, improvedSettings.updateFrequency + 5);
    }

    this.performanceSettings$.next(improvedSettings);
  }

  /// <summary>
  /// Update performance settings manually.
  /// </summary>
  public updatePerformanceSettings(newSettings: Partial<PerformanceSettings>): void {
    const currentSettings = this.performanceSettings$.value || this.defaultSettings;
    this.performanceSettings$.next({ ...currentSettings, ...newSettings });
  }

  /// <summary>
  /// Get current device performance information.
  /// </summary>
  public getDevicePerformance(): DevicePerformance | null {
    return this.devicePerformance$.value;
  }

  /// <summary>
  /// Get current performance settings.
  /// </summary>
  public getPerformanceSettings(): PerformanceSettings | null {
    return this.performanceSettings$.value;
  }

  /// <summary>
  /// Get current FPS.
  /// </summary>
  public getCurrentFPS(): number {
    return this.averageFPS;
  }

  /// <summary>
  /// Check if device should use reduced animations.
  /// </summary>
  public shouldReduceAnimations(): boolean {
    const settings = this.performanceSettings$.value;
    return !settings?.enableAnimations ||
           settings.prefersReducedMotion ||
           this.isLowPowerMode$.value ||
           this.averageFPS < 30;
  }

  /// <summary>
  /// Check if device should use simplified rendering.
  /// </summary>
  public shouldSimplifyRendering(): boolean {
    const settings = this.performanceSettings$.value;
    const devicePerformance = this.devicePerformance$.value;

    return settings?.renderQuality === 'low' ||
           devicePerformance?.isLowEnd ||
           this.isLowPowerMode$.value ||
           this.averageFPS < 20;
  }

  /// <summary>
  /// Get recommended batch size for updates.
  /// </summary>
  public getRecommendedBatchSize(): number {
    const settings = this.performanceSettings$.value;
    if (!settings) return 10;

    switch (settings.renderQuality) {
      case 'low': return 5;
      case 'medium': return 10;
      case 'high': return 20;
      default: return 10;
    }
  }

  /// <summary>
  /// Force low power mode.
  /// </summary>
  public setLowPowerMode(enabled: boolean): void {
    this.isLowPowerMode$.next(enabled);
    if (enabled) {
      this.degradePerformance();
    } else {
      this.optimizeSettingsForDevice(this.devicePerformance$.value!);
    }
  }

  /// <summary>
  /// Destroy service and cleanup.
  /// </summary>
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
