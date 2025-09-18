import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, takeUntil } from 'rxjs';
import { PWAService } from '../services/pwa.service';

/// <summary>
/// PWA update notification component.
/// Displays update prompts, installation prompts, and offline status indicators.
/// </summary>
@Component({
  selector: 'app-pwa-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule
  ],
  template: `
    <div class="pwa-notifications">
      <!-- Install App Button -->
      @if (canInstall && !isInstalled) {
        <div class="install-prompt">
          <button
            mat-fab
            extended
            color="primary"
            class="install-button"
            (click)="installApp()"
            title="Install Polish Football Network">
            <mat-icon>download</mat-icon>
            Install App
          </button>
        </div>
      }

      <!-- Update Available Badge -->
      @if (updateAvailable.available) {
        <div class="update-badge">
          <button
            mat-mini-fab
            color="accent"
            class="update-button"
            (click)="showUpdatePrompt()"
            title="Update available">
            <mat-icon matBadge="!" matBadgeColor="warn">system_update</mat-icon>
          </button>
        </div>
      }

      <!-- Offline Indicator -->
      @if (!isOnline) {
        <div class="offline-indicator">
          <mat-icon class="offline-icon">cloud_off</mat-icon>
          <span class="offline-text">Offline</span>
        </div>
      }

      <!-- Network Status Indicator -->
      @if (isOnline && networkStatus.effectiveType) {
        <div class="network-indicator" [class]="getNetworkClass()">
          <mat-icon class="network-icon">signal_cellular_alt</mat-icon>
          <span class="network-text">{{ getNetworkText() }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./pwa-notifications.component.scss']
})
export class PWANotificationsComponent implements OnInit, OnDestroy {
  private readonly pwaService = inject(PWAService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // Component state
  isOnline = true;
  canInstall = false;
  isInstalled = false;
  updateAvailable = { available: false };
  networkStatus: any = { online: true };

  ngOnInit(): void {
    this.subscribeToState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Subscribe to PWA service state changes.
  /// </summary>
  private subscribeToState(): void {
    // Online status
    this.pwaService.isOnline
      .pipe(takeUntil(this.destroy$))
      .subscribe(online => {
        const wasOffline = !this.isOnline;
        this.isOnline = online;

        if (online && wasOffline) {
          this.showOfflineRecoveredMessage();
        } else if (!online) {
          this.showOfflineMessage();
        }
      });

    // Network status
    this.pwaService.networkStatus
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.networkStatus = status;
      });

    // Install availability
    this.pwaService.canInstall
      .pipe(takeUntil(this.destroy$))
      .subscribe(canInstall => {
        this.canInstall = canInstall;
        if (canInstall) {
          this.showInstallPrompt();
        }
      });

    // Installation status
    this.pwaService.isInstalled
      .pipe(takeUntil(this.destroy$))
      .subscribe(installed => {
        this.isInstalled = installed;
        if (installed) {
          this.showInstalledMessage();
        }
      });

    // Update availability
    this.pwaService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        this.updateAvailable = update;
        if (update.available) {
          this.showUpdateMessage();
        }
      });
  }

  /// <summary>
  /// Install the PWA.
  /// </summary>
  async installApp(): Promise<void> {
    try {
      const installed = await this.pwaService.showInstallPrompt();
      if (installed) {
        console.log('App installed successfully');
      }
    } catch (error) {
      console.error('Error installing app:', error);
      this.snackBar.open(
        'Unable to install app. Please try again.',
        'Close',
        { duration: 3000 }
      );
    }
  }

  /// <summary>
  /// Show update prompt with options.
  /// </summary>
  showUpdatePrompt(): void {
    const snackBarRef = this.snackBar.open(
      'A new version is available!',
      'Update Now',
      {
        duration: 0, // Keep open until action
        panelClass: 'update-snack-bar'
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.applyUpdate();
    });
  }

  /// <summary>
  /// Apply the available update.
  /// </summary>
  async applyUpdate(): Promise<void> {
    try {
      await this.pwaService.applyUpdate();
    } catch (error) {
      console.error('Error applying update:', error);
      this.snackBar.open(
        'Unable to apply update. Please refresh manually.',
        'Close',
        { duration: 5000 }
      );
    }
  }

  /// <summary>
  /// Show install prompt message.
  /// </summary>
  private showInstallPrompt(): void {
    const snackBarRef = this.snackBar.open(
      'Install Polish Football Network for the best experience!',
      'Install',
      {
        duration: 10000,
        panelClass: 'install-snack-bar'
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.installApp();
    });
  }

  /// <summary>
  /// Show app installed message.
  /// </summary>
  private showInstalledMessage(): void {
    this.snackBar.open(
      'Polish Football Network installed successfully!',
      'Great!',
      {
        duration: 3000,
        panelClass: 'success-snack-bar'
      }
    );
  }

  /// <summary>
  /// Show offline status message.
  /// </summary>
  private showOfflineMessage(): void {
    this.snackBar.open(
      'You are offline. Some features may be limited.',
      'OK',
      {
        duration: 5000,
        panelClass: 'offline-snack-bar'
      }
    );
  }

  /// <summary>
  /// Show connection recovered message.
  /// </summary>
  private showOfflineRecoveredMessage(): void {
    this.snackBar.open(
      'Connection restored!',
      'Close',
      {
        duration: 2000,
        panelClass: 'success-snack-bar'
      }
    );
  }

  /// <summary>
  /// Show update available message.
  /// </summary>
  private showUpdateMessage(): void {
    const snackBarRef = this.snackBar.open(
      `New version available: ${this.updateAvailable.version || 'Latest'}`,
      'Update',
      {
        duration: 8000,
        panelClass: 'update-snack-bar'
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.applyUpdate();
    });
  }

  /// <summary>
  /// Get CSS class for network status.
  /// </summary>
  getNetworkClass(): string {
    if (!this.isOnline) return 'network-offline';

    switch (this.networkStatus.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'network-slow';
      case '3g':
        return 'network-medium';
      case '4g':
        return 'network-fast';
      default:
        return 'network-unknown';
    }
  }

  /// <summary>
  /// Get network status text.
  /// </summary>
  getNetworkText(): string {
    if (!this.isOnline) return 'Offline';

    switch (this.networkStatus.effectiveType) {
      case 'slow-2g':
        return 'Very Slow';
      case '2g':
        return 'Slow';
      case '3g':
        return 'Good';
      case '4g':
        return 'Fast';
      default:
        return 'Connected';
    }
  }

  /// <summary>
  /// Share app with others.
  /// </summary>
  async shareApp(): Promise<void> {
    const shareData = {
      title: 'Polish Football Network',
      text: 'Explore the connections in Polish football!',
      url: window.location.origin
    };

    const shared = await this.pwaService.shareContent(shareData);
    if (!shared) {
      this.snackBar.open(
        'Link copied to clipboard!',
        'Close',
        { duration: 2000 }
      );
    }
  }
}
