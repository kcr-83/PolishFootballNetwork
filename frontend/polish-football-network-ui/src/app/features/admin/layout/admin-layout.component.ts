import { Component, OnInit, OnDestroy, inject, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, filter, map, takeUntil } from 'rxjs';
import { AdminNavigationComponent } from '../navigation/admin-navigation.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ResponsiveService } from '../shared/services/responsive.service';
import { AccessibilityService } from '../shared/services/accessibility.service';
import { KeyboardShortcutsComponent } from '../shared/components/keyboard-shortcuts/keyboard-shortcuts.component';

/// <summary>
/// Interface for breadcrumb items.
/// </summary>
interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  isActive: boolean;
}

/// <summary>
/// Interface for user information.
/// </summary>
interface UserInfo {
  username: string;
  email: string;
  role: string;
  avatar?: string;
  lastLogin?: Date;
}

/// <summary>
/// Admin layout component providing the main structure for admin pages.
/// Features responsive Material sidenav, toolbar with user info, breadcrumb navigation.
/// </summary>
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule,
    MatDialogModule,
    AdminNavigationComponent,
    BreadcrumbComponent
  ],
  template: `
    <div class="admin-layout" [ngClass]="responsiveClasses()">
      <!-- Top Toolbar -->
      <mat-toolbar class="admin-toolbar" color="primary">
        <!-- Menu Toggle Button -->
        <button
          mat-icon-button
          (click)="toggleSidenav()"
          class="menu-toggle"
          aria-label="Toggle navigation menu"
          [matTooltip]="sidenavOpened() ? 'Close menu' : 'Open menu'"
          matTooltipPosition="below">
          <mat-icon>{{ sidenavOpened() ? 'menu_open' : 'menu' }}</mat-icon>
        </button>

        <!-- App Title -->
        <span class="app-title">
          <mat-icon class="title-icon">admin_panel_settings</mat-icon>
          Admin Panel
        </span>

        <!-- Toolbar Spacer -->
        <div class="toolbar-spacer"></div>

        <!-- Notifications -->
        <button
          mat-icon-button
          class="notification-button"
          aria-label="View notifications"
          matTooltip="Notifications"
          matTooltipPosition="below"
          [matBadge]="notificationCount()"
          [matBadgeHidden]="notificationCount() === 0"
          matBadgeColor="warn">
          <mat-icon>notifications</mat-icon>
        </button>

        <!-- Help/Keyboard Shortcuts -->
        <button
          mat-icon-button
          class="help-button"
          aria-label="Help and keyboard shortcuts"
          matTooltip="Help & Shortcuts (F1)"
          matTooltipPosition="below"
          (click)="openHelp()">
          <mat-icon>help_outline</mat-icon>
        </button>

        <!-- System Health Indicator -->
        <button
          mat-icon-button
          class="health-indicator"
          [class.healthy]="systemHealth() === 'healthy'"
          [class.warning]="systemHealth() === 'warning'"
          [class.error]="systemHealth() === 'error'"
          aria-label="System health status"
          [matTooltip]="getHealthTooltip()"
          matTooltipPosition="below">
          <mat-icon>{{ getHealthIcon() }}</mat-icon>
        </button>

        <!-- User Menu -->
        <button
          mat-icon-button
          [matMenuTriggerFor]="userMenu"
          class="user-menu-trigger"
          aria-label="User menu"
          matTooltip="User menu"
          matTooltipPosition="below">
          @if (userInfo().avatar) {
            <img
              [src]="userInfo().avatar"
              [alt]="userInfo().username"
              class="user-avatar">
          } @else {
            <mat-icon>account_circle</mat-icon>
          }
        </button>

        <!-- User Menu Dropdown -->
        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="user-menu-header">
            <div class="user-info">
              <div class="user-name">{{ userInfo().username }}</div>
              <div class="user-email">{{ userInfo().email }}</div>
              <div class="user-role">{{ userInfo().role }}</div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <button mat-menu-item (click)="viewProfile()">
            <mat-icon>person</mat-icon>
            <span>Profile</span>
          </button>

          <button mat-menu-item (click)="openSettings()">
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </button>

          <button mat-menu-item (click)="openHelp()">
            <mat-icon>help</mat-icon>
            <span>Help</span>
          </button>

          <mat-divider></mat-divider>

          <button mat-menu-item (click)="logout()" class="logout-item">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <!-- Sidenav Container -->
      <mat-sidenav-container class="admin-sidenav-container">
        <!-- Side Navigation -->
        <mat-sidenav
          #sidenav
          class="admin-sidenav"
          [mode]="sidenavMode()"
          [opened]="sidenavOpened()"
          [fixedInViewport]="true"
          [fixedTopGap]="64"
          (openedChange)="onSidenavToggle($event)">

          <app-admin-navigation
            (navigationClick)="onNavigationClick()"
            [isMobile]="isMobile()">
          </app-admin-navigation>
        </mat-sidenav>

        <!-- Main Content Area -->
        <mat-sidenav-content class="admin-content">
          <!-- Breadcrumb Navigation -->
          <app-breadcrumb
            [items]="breadcrumbItems()"
            class="admin-breadcrumb">
          </app-breadcrumb>

          <!-- Page Content -->
          <main class="admin-main" role="main">
            <router-outlet></router-outlet>
          </main>

          <!-- Footer -->
          <footer class="admin-footer">
            <div class="footer-content">
              <span class="copyright">
                © {{ currentYear }} Polish Football Network Admin
              </span>
              <div class="footer-links">
                <a href="#" class="footer-link">Privacy</a>
                <a href="#" class="footer-link">Terms</a>
                <a href="#" class="footer-link">Support</a>
              </div>
            </div>
          </footer>
        </mat-sidenav-content>
      </mat-sidenav-container>

      <!-- Overlay for mobile -->
      @if (isMobile() && sidenavOpened()) {
        <div
          class="mobile-overlay"
          (click)="closeSidenav()"
          aria-hidden="true">
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly responsiveService = inject(ResponsiveService);
  private readonly accessibilityService = inject(AccessibilityService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy$ = new Subject<void>();

  // Component state signals using responsive service
  readonly isMobile = this.responsiveService.isMobile;
  readonly isTablet = this.responsiveService.isTablet;
  readonly isDesktop = this.responsiveService.isDesktop;
  readonly sidenavMode = this.responsiveService.sidenavMode;
  readonly sidenavOpened = signal(true);
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([]);
  readonly notificationCount = signal(0);
  readonly systemHealth = signal<'healthy' | 'warning' | 'error'>('healthy');
  readonly userInfo = signal<UserInfo>({
    username: 'Admin User',
    email: 'admin@polishfootball.com',
    role: 'Super Administrator',
    avatar: '',
    lastLogin: new Date()
  });

  // Computed responsive properties
  readonly responsiveClasses = computed(() => this.responsiveService.getResponsiveClasses());
  readonly shouldCollapseSidenav = this.responsiveService.shouldCollapseSidenav;

  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.setupResponsiveLayout();
    this.setupRouterNavigation();
    this.setupKeyboardShortcuts();
    this.loadUserInfo();
    this.initializeSystemHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Setup responsive layout behavior using ResponsiveService.
  /// </summary>
  private setupResponsiveLayout(): void {
    // Use responsive service for consistent breakpoint detection
    this.responsiveService.refreshBreakpoints();

    // Set initial sidenav state based on responsive service
    this.sidenavOpened.set(!this.responsiveService.shouldCollapseSidenav());
  }

  /// <summary>
  /// Setup router navigation for breadcrumbs.
  /// </summary>
  private setupRouterNavigation(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.buildBreadcrumbs()),
        takeUntil(this.destroy$)
      )
      .subscribe(breadcrumbs => {
        this.breadcrumbItems.set(breadcrumbs);

        // Announce navigation change to screen readers
        if (breadcrumbs.length > 0) {
          const currentPage = breadcrumbs[breadcrumbs.length - 1].label;
          const breadcrumbPath = breadcrumbs.map(b => b.label);
          this.accessibilityService.announceNavigation(currentPage, breadcrumbPath);
        }
      });
  }

  /// <summary>
  /// Setup keyboard shortcuts for admin panel.
  /// </summary>
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // F1 for help (global shortcut)
      if (event.key === 'F1') {
        event.preventDefault();
        this.openHelp();
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            this.toggleSidenav();
            this.accessibilityService.announce('Navigation menu toggled');
            break;
          case '/':
            event.preventDefault();
            this.focusSearch();
            break;
          case 'h':
            event.preventDefault();
            this.navigateToHome();
            break;
        }
      }

      if (event.key === 'Escape') {
        if (this.isMobile() && this.sidenavOpened()) {
          this.closeSidenav();
          this.accessibilityService.announce('Navigation menu closed');
        }
      }
    });
  }

  /// <summary>
  /// Load user information.
  /// </summary>
  private async loadUserInfo(): Promise<void> {
    try {
      // TODO: Replace with actual user service call
      const mockUserInfo: UserInfo = {
        username: 'Admin User',
        email: 'admin@polishfootball.com',
        role: 'Super Administrator',
        avatar: '', // Could load from service
        lastLogin: new Date()
      };

      this.userInfo.set(mockUserInfo);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  /// <summary>
  /// Initialize system health monitoring.
  /// </summary>
  private initializeSystemHealth(): void {
    // TODO: Replace with actual health check service
    // Simulate health check
    setInterval(() => {
      const healthStates: Array<'healthy' | 'warning' | 'error'> = ['healthy', 'warning', 'error'];
      const randomHealth = healthStates[Math.floor(Math.random() * 3)];
      this.systemHealth.set(randomHealth);
    }, 30000); // Check every 30 seconds
  }

  /// <summary>
  /// Build breadcrumbs from current route.
  /// </summary>
  private buildBreadcrumbs(): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    let route = this.activatedRoute.root;

    // Always start with admin home
    breadcrumbs.push({
      label: 'Admin',
      url: '/admin',
      icon: 'admin_panel_settings',
      isActive: false
    });

    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment && segment !== 'admin');

    let currentUrl = '/admin';

    segments.forEach((segment, index) => {
      currentUrl += `/${segment}`;
      const isLast = index === segments.length - 1;

      breadcrumbs.push({
        label: this.formatBreadcrumbLabel(segment),
        url: isLast ? undefined : currentUrl,
        isActive: isLast
      });
    });

    return breadcrumbs;
  }

  /// <summary>
  /// Format breadcrumb label from route segment.
  /// </summary>
  private formatBreadcrumbLabel(segment: string): string {
    const labelMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'clubs': 'Club Management',
      'connections': 'Connection Management',
      'files': 'File Management',
      'users': 'User Management',
      'settings': 'Settings',
      'create': 'Create',
      'edit': 'Edit',
      'view': 'View'
    };

    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  /// <summary>
  /// Toggle sidenav open/closed state.
  /// </summary>
  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    } else {
      this.sidenavOpened.set(!this.sidenavOpened());
    }
  }

  /// <summary>
  /// Close sidenav.
  /// </summary>
  closeSidenav(): void {
    if (this.sidenav) {
      this.sidenav.close();
    } else {
      this.sidenavOpened.set(false);
    }
  }

  /// <summary>
  /// Handle sidenav toggle event.
  /// </summary>
  onSidenavToggle(opened: boolean): void {
    this.sidenavOpened.set(opened);
  }

  /// <summary>
  /// Handle navigation click (close sidenav on mobile).
  /// </summary>
  onNavigationClick(): void {
    if (this.isMobile()) {
      this.closeSidenav();
    }
  }

  /// <summary>
  /// Get health indicator icon.
  /// </summary>
  getHealthIcon(): string {
    switch (this.systemHealth()) {
      case 'healthy':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  /// <summary>
  /// Get health indicator tooltip.
  /// </summary>
  getHealthTooltip(): string {
    switch (this.systemHealth()) {
      case 'healthy':
        return 'System is healthy';
      case 'warning':
        return 'System has warnings';
      case 'error':
        return 'System has errors';
      default:
        return 'System status unknown';
    }
  }

  /// <summary>
  /// Navigate to user profile.
  /// </summary>
  viewProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  /// <summary>
  /// Open settings page.
  /// </summary>
  openSettings(): void {
    this.router.navigate(['/admin/settings']);
  }

  /// <summary>
  /// Open help documentation.
  /// </summary>
  /// <summary>
  /// Open help and keyboard shortcuts dialog.
  /// </summary>
  openHelp(): void {
    const dialogRef = this.dialog.open(KeyboardShortcutsComponent, {
      width: this.responsiveService.getDialogWidth('details'),
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: true,
      restoreFocus: true,
      role: 'dialog',
      ariaLabel: 'Keyboard shortcuts and help'
    });

    // Announce dialog opening to screen readers
    this.accessibilityService.announce('Keyboard shortcuts dialog opened');

    dialogRef.afterClosed().subscribe(() => {
      this.accessibilityService.announce('Keyboard shortcuts dialog closed');
    });
  }

  /// <summary>
  /// Logout user.
  /// </summary>
  logout(): void {
    // TODO: Implement logout logic
    this.router.navigate(['/login']);
  }

  /// <summary>
  /// Focus search input (keyboard shortcut).
  /// </summary>
  private focusSearch(): void {
    // TODO: Focus search input when implemented
    console.log('Focus search (Ctrl+/)');
  }

  /// <summary>
  /// Navigate to admin home (keyboard shortcut).
  /// </summary>
  private navigateToHome(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
