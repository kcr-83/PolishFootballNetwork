import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { PWANotificationsComponent } from './shared/components/pwa-notifications/pwa-notifications.component';
import { PWAService } from './core/services/pwa.service';

/// <summary>
/// Main application component.
/// Root component that provides the main layout and PWA functionality.
/// </summary>
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    PWANotificationsComponent
  ],
  template: `
    <div class="app-container">
      <!-- Main Toolbar -->
      <mat-toolbar color="primary" class="app-toolbar">
        <button
          mat-icon-button
          (click)="toggleSidenav()"
          class="menu-button"
          aria-label="Toggle navigation">
          <mat-icon>menu</mat-icon>
        </button>

        <span class="app-title">Polish Football Network</span>

        <div class="toolbar-spacer"></div>

        <!-- PWA Share Button -->
        <button
          mat-icon-button
          (click)="shareApp()"
          class="share-button"
          title="Share app"
          aria-label="Share app">
          <mat-icon>share</mat-icon>
        </button>
      </mat-toolbar>

      <!-- Sidenav Container -->
      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav
          #sidenav
          mode="over"
          class="app-sidenav"
          [fixedInViewport]="true">
          <div class="sidenav-content">
            <div class="sidenav-header">
              <h3>Navigation</h3>
              <button
                mat-icon-button
                (click)="sidenav.close()"
                aria-label="Close navigation">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <nav class="sidenav-nav">
              <a mat-button routerLink="/dashboard" (click)="sidenav.close()">
                <mat-icon>dashboard</mat-icon>
                Dashboard
              </a>
              <a mat-button routerLink="/graph" (click)="sidenav.close()">
                <mat-icon>account_tree</mat-icon>
                Network Graph
              </a>
              <a mat-button routerLink="/clubs" (click)="sidenav.close()">
                <mat-icon>sports_soccer</mat-icon>
                Clubs
              </a>
              <a mat-button routerLink="/players" (click)="sidenav.close()">
                <mat-icon>people</mat-icon>
                Players
              </a>
              <a mat-button routerLink="/stats" (click)="sidenav.close()">
                <mat-icon>analytics</mat-icon>
                Statistics
              </a>
            </nav>
          </div>
        </mat-sidenav>

        <!-- Main Content -->
        <mat-sidenav-content class="main-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>

      <!-- PWA Notifications -->
      <app-pwa-notifications></app-pwa-notifications>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Polish Football Network';

  constructor(private pwaService: PWAService) {}

  ngOnInit(): void {
    this.initializePWA();
  }

  /// <summary>
  /// Initialize PWA functionality.
  /// </summary>
  private async initializePWA(): Promise<void> {
    // Request persistent storage for better performance
    await this.pwaService.requestPersistentStorage();

    // Enable background sync for data updates
    await this.pwaService.setBackgroundAppRefresh(true);

    // Log storage usage
    const storageEstimate = await this.pwaService.getStorageEstimate();
    if (storageEstimate) {
      console.log('Storage usage:', {
        used: storageEstimate.usage,
        quota: storageEstimate.quota,
        percentage: storageEstimate.usage && storageEstimate.quota
          ? Math.round((storageEstimate.usage / storageEstimate.quota) * 100)
          : 0
      });
    }
  }

  /// <summary>
  /// Toggle the side navigation.
  /// </summary>
  toggleSidenav(): void {
    // This will be handled by the template reference
  }

  /// <summary>
  /// Share the app using PWA share functionality.
  /// </summary>
  async shareApp(): Promise<void> {
    await this.pwaService.shareContent({
      title: 'Polish Football Network',
      text: 'Explore the fascinating connections in Polish football!',
      url: window.location.href
    });
  }
}
