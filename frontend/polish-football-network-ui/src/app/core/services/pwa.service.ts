import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, fromEvent, merge } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

/// <summary>
/// PWA update information.
/// </summary>
interface PWAUpdateInfo {
  available: boolean;
  version?: string;
  releaseNotes?: string;
}

/// <summary>
/// Network status information.
/// </summary>
interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/// <summary>
/// Installation prompt event.
/// </summary>
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/// <summary>
/// PWA service for Progressive Web App functionality.
/// Handles service worker registration, updates, installation prompts, and offline capabilities.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class PWAService {
  private readonly destroy$ = new Subject<void>();
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private installPromptEvent: BeforeInstallPromptEvent | null = null;

  // State subjects
  private readonly isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  private readonly networkStatus$ = new BehaviorSubject<NetworkStatus>({
    online: navigator.onLine
  });
  private readonly updateAvailable$ = new BehaviorSubject<PWAUpdateInfo>({
    available: false
  });
  private readonly canInstall$ = new BehaviorSubject<boolean>(false);
  private readonly isInstalled$ = new BehaviorSubject<boolean>(false);
  private readonly serviceWorkerReady$ = new BehaviorSubject<boolean>(false);

  // Observable getters
  public readonly isOnline = this.isOnline$.asObservable();
  public readonly networkStatus = this.networkStatus$.asObservable();
  public readonly updateAvailable = this.updateAvailable$.asObservable();
  public readonly canInstall = this.canInstall$.asObservable();
  public readonly isInstalled = this.isInstalled$.asObservable();
  public readonly serviceWorkerReady = this.serviceWorkerReady$.asObservable();

  constructor() {
    this.initializePWA();
  }

  /// <summary>
  /// Initialize PWA functionality.
  /// </summary>
  private initializePWA(): void {
    this.setupNetworkDetection();
    this.setupInstallPrompt();
    this.checkIfInstalled();
    this.registerServiceWorker();
  }

  /// <summary>
  /// Setup network status detection.
  /// </summary>
  private setupNetworkDetection(): void {
    // Listen for online/offline events
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(online => {
      this.isOnline$.next(online);
      this.updateNetworkStatus();
    });

    // Listen for connection changes
    if ('connection' in navigator) {
      fromEvent((navigator as any).connection, 'change')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateNetworkStatus();
        });
    }

    // Initial network status
    this.updateNetworkStatus();
  }

  /// <summary>
  /// Update network status information.
  /// </summary>
  private updateNetworkStatus(): void {
    const connection = (navigator as any).connection;
    const status: NetworkStatus = {
      online: navigator.onLine
    };

    if (connection) {
      status.effectiveType = connection.effectiveType;
      status.downlink = connection.downlink;
      status.rtt = connection.rtt;
    }

    this.networkStatus$.next(status);
  }

  /// <summary>
  /// Setup install prompt handling.
  /// </summary>
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.installPromptEvent = event as BeforeInstallPromptEvent;
      this.canInstall$.next(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled$.next(true);
      this.canInstall$.next(false);
      this.installPromptEvent = null;
    });
  }

  /// <summary>
  /// Check if app is already installed.
  /// </summary>
  private checkIfInstalled(): void {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check for iOS standalone mode
    const isIOSStandalone = (window.navigator as any).standalone === true;

    // Check for installed app indicators
    const isInstalled = isStandalone || isIOSStandalone;

    this.isInstalled$.next(isInstalled);
  }

  /// <summary>
  /// Register service worker.
  /// </summary>
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');
      this.serviceWorkerReady$.next(true);

      // Listen for updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate();
      });

      // Check for existing update
      if (this.serviceWorkerRegistration.waiting) {
        this.updateAvailable$.next({
          available: true,
          version: 'New version available'
        });
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      // Check for updates periodically
      setInterval(() => {
        this.checkForUpdate();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /// <summary>
  /// Handle service worker update.
  /// </summary>
  private handleServiceWorkerUpdate(): void {
    if (!this.serviceWorkerRegistration) return;

    const newWorker = this.serviceWorkerRegistration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker is available
        this.updateAvailable$.next({
          available: true,
          version: 'New version available',
          releaseNotes: 'Performance improvements and new features'
        });
      }
    });
  }

  /// <summary>
  /// Handle messages from service worker.
  /// </summary>
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'GRAPH_DATA_SYNCED':
        console.log('Graph data synced:', data);
        // Notify components about updated data
        break;
      case 'USER_ACTIONS_SYNCED':
        console.log('User actions synced:', data);
        break;
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data);
        break;
      default:
        console.log('Unknown message from service worker:', event.data);
    }
  }

  /// <summary>
  /// Check for service worker updates.
  /// </summary>
  public async checkForUpdate(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      await this.serviceWorkerRegistration.update();
    } catch (error) {
      console.error('Error checking for service worker update:', error);
    }
  }

  /// <summary>
  /// Apply service worker update.
  /// </summary>
  public async applyUpdate(): Promise<void> {
    if (!this.serviceWorkerRegistration?.waiting) return;

    try {
      // Tell the waiting service worker to activate
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        }, { once: true });
      });

      // Reload the page to use the new service worker
      window.location.reload();
    } catch (error) {
      console.error('Error applying service worker update:', error);
    }
  }

  /// <summary>
  /// Show install prompt.
  /// </summary>
  public async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent) {
      return false;
    }

    try {
      await this.installPromptEvent.prompt();
      const { outcome } = await this.installPromptEvent.userChoice;

      this.canInstall$.next(false);
      this.installPromptEvent = null;

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  /// <summary>
  /// Cache graph data manually.
  /// </summary>
  public cacheGraphData(data: any): void {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_GRAPH_DATA',
      data
    });
  }

  /// <summary>
  /// Clear application cache.
  /// </summary>
  public clearCache(cacheName?: string): void {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE',
      cacheName
    });
  }

  /// <summary>
  /// Register for background sync.
  /// </summary>
  public async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      await (this.serviceWorkerRegistration as any).sync.register(tag);
      console.log(`Background sync registered: ${tag}`);
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }

  /// <summary>
  /// Share content using Web Share API.
  /// </summary>
  public async shareContent(shareData: ShareData): Promise<boolean> {
    if (!('share' in navigator)) {
      // Fallback to clipboard API
      return this.copyToClipboard(shareData.url || shareData.text || '');
    }

    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      console.error('Error sharing content:', error);
      return false;
    }
  }

  /// <summary>
  /// Copy text to clipboard.
  /// </summary>
  private async copyToClipboard(text: string): Promise<boolean> {
    if (!('clipboard' in navigator)) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /// <summary>
  /// Get current network status.
  /// </summary>
  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus$.value;
  }

  /// <summary>
  /// Check if app is online.
  /// </summary>
  public getIsOnline(): boolean {
    return this.isOnline$.value;
  }

  /// <summary>
  /// Check if update is available.
  /// </summary>
  public getUpdateAvailable(): PWAUpdateInfo {
    return this.updateAvailable$.value;
  }

  /// <summary>
  /// Check if app can be installed.
  /// </summary>
  public getCanInstall(): boolean {
    return this.canInstall$.value;
  }

  /// <summary>
  /// Check if app is installed.
  /// </summary>
  public getIsInstalled(): boolean {
    return this.isInstalled$.value;
  }

  /// <summary>
  /// Check if service worker is ready.
  /// </summary>
  public getServiceWorkerReady(): boolean {
    return this.serviceWorkerReady$.value;
  }

  /// <summary>
  /// Enable/disable background app refresh.
  /// </summary>
  public async setBackgroundAppRefresh(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await this.registerBackgroundSync('graph-data-sync');
        await this.registerBackgroundSync('user-actions-sync');
      }
      // Note: There's no standard way to unregister background sync
    } catch (error) {
      console.error('Error setting background app refresh:', error);
    }
  }

  /// <summary>
  /// Request persistent storage.
  /// </summary>
  public async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent}`);
      return persistent;
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }

  /// <summary>
  /// Get storage estimate.
  /// </summary>
  public async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate;
    } catch (error) {
      console.error('Error getting storage estimate:', error);
      return null;
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
