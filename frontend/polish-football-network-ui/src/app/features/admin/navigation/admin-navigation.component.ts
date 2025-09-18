import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, filter, takeUntil } from 'rxjs';

/// <summary>
/// Interface for navigation menu items.
/// </summary>
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?: number;
  badgeColor?: 'primary' | 'accent' | 'warn';
  children?: NavigationItem[];
  expanded?: boolean;
  permissions?: string[];
  description?: string;
}

/// <summary>
/// Admin navigation component providing the sidebar navigation menu.
/// Features hierarchical navigation, badges, permissions, and responsive behavior.
/// </summary>
@Component({
  selector: 'app-admin-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatExpansionModule
  ],
  template: `
    <nav class="admin-navigation" [class.mobile]="isMobile">
      <!-- Navigation Header -->
      <div class="nav-header">
        <div class="nav-title">
          <mat-icon class="nav-logo">sports_soccer</mat-icon>
          <span class="nav-text">Polish Football</span>
        </div>
        <div class="nav-subtitle">Administration</div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-number">{{ quickStats.clubs }}</span>
          <span class="stat-label">Clubs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ quickStats.connections }}</span>
          <span class="stat-label">Connections</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ quickStats.users }}</span>
          <span class="stat-label">Users</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Navigation Menu -->
      <div class="nav-menu">
        @for (item of navigationItems(); track item.id) {
          <div class="nav-item-container">
            @if (item.children && item.children.length > 0) {
              <!-- Expandable Menu Item -->
              <mat-expansion-panel
                class="nav-expansion-panel"
                [expanded]="item.expanded"
                (expandedChange)="toggleExpansion(item)">

                <mat-expansion-panel-header class="nav-expansion-header">
                  <mat-panel-title class="nav-panel-title">
                    <mat-icon class="nav-item-icon">{{ item.icon }}</mat-icon>
                    <span class="nav-item-text">{{ item.label }}</span>
                    @if (item.badge && item.badge > 0) {
                      <span
                        class="nav-badge"
                        [class]="'badge-' + (item.badgeColor || 'primary')">
                        {{ item.badge }}
                      </span>
                    }
                  </mat-panel-title>
                </mat-expansion-panel-header>

                <div class="nav-submenu">
                  @for (subItem of item.children; track subItem.id) {
                    <button
                      mat-button
                      class="nav-subitem"
                      [class.active]="isActive(subItem.route)"
                      [routerLink]="subItem.route"
                      [matTooltip]="isMobile ? subItem.description || subItem.label : ''"
                      matTooltipPosition="right"
                      (click)="onNavigationClick(subItem)">

                      <mat-icon class="nav-subitem-icon">{{ subItem.icon }}</mat-icon>
                      <span class="nav-subitem-text">{{ subItem.label }}</span>

                      @if (subItem.badge && subItem.badge > 0) {
                        <span
                          class="nav-badge"
                          [class]="'badge-' + (subItem.badgeColor || 'primary')">
                          {{ subItem.badge }}
                        </span>
                      }
                    </button>
                  }
                </div>
              </mat-expansion-panel>
            } @else {
              <!-- Simple Menu Item -->
              <button
                mat-button
                class="nav-item"
                [class.active]="isActive(item.route)"
                [routerLink]="item.route"
                [matTooltip]="isMobile ? item.description || item.label : ''"
                matTooltipPosition="right"
                (click)="onNavigationClick(item)">

                <mat-icon class="nav-item-icon">{{ item.icon }}</mat-icon>
                <span class="nav-item-text">{{ item.label }}</span>

                @if (item.badge && item.badge > 0) {
                  <span
                    class="nav-badge"
                    [class]="'badge-' + (item.badgeColor || 'primary')">
                    {{ item.badge }}
                  </span>
                }
              </button>
            }
          </div>
        }
      </div>

      <!-- Footer Actions -->
      <div class="nav-footer">
        <mat-divider></mat-divider>

        <button
          mat-button
          class="nav-item footer-item"
          routerLink="/admin/help"
          matTooltip="Help & Documentation"
          matTooltipPosition="right">
          <mat-icon class="nav-item-icon">help_outline</mat-icon>
          <span class="nav-item-text">Help</span>
        </button>

        <button
          mat-button
          class="nav-item footer-item"
          routerLink="/admin/feedback"
          matTooltip="Send Feedback"
          matTooltipPosition="right">
          <mat-icon class="nav-item-icon">feedback</mat-icon>
          <span class="nav-item-text">Feedback</span>
        </button>
      </div>
    </nav>
  `,
  styleUrls: ['./admin-navigation.component.scss']
})
export class AdminNavigationComponent implements OnInit, OnDestroy {
  @Input() isMobile = false;
  @Output() navigationClick = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // Component state
  readonly navigationItems = signal<NavigationItem[]>([]);
  readonly currentRoute = signal('');
  readonly quickStats = {
    clubs: 127,
    connections: 340,
    users: 12
  };

  ngOnInit(): void {
    this.initializeNavigation();
    this.setupRouteTracking();
    this.loadQuickStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Initialize navigation menu structure.
  /// </summary>
  private initializeNavigation(): void {
    const navigationItems: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/admin/dashboard',
        description: 'Overview and statistics'
      },
      {
        id: 'clubs',
        label: 'Club Management',
        icon: 'sports_soccer',
        expanded: false,
        description: 'Manage football clubs',
        children: [
          {
            id: 'clubs-list',
            label: 'All Clubs',
            icon: 'list',
            route: '/admin/clubs',
            badge: 127,
            badgeColor: 'primary',
            description: 'View and manage all clubs'
          },
          {
            id: 'clubs-create',
            label: 'Add Club',
            icon: 'add_circle_outline',
            route: '/admin/clubs/create',
            description: 'Create a new club'
          },
          {
            id: 'clubs-inactive',
            label: 'Inactive Clubs',
            icon: 'visibility_off',
            route: '/admin/clubs/inactive',
            badge: 8,
            badgeColor: 'warn',
            description: 'View inactive clubs'
          },
          {
            id: 'clubs-import',
            label: 'Import/Export',
            icon: 'import_export',
            route: '/admin/clubs/import',
            description: 'Import or export club data'
          }
        ]
      },
      {
        id: 'connections',
        label: 'Connection Management',
        icon: 'account_tree',
        expanded: false,
        description: 'Manage club connections',
        children: [
          {
            id: 'connections-list',
            label: 'All Connections',
            icon: 'list',
            route: '/admin/connections',
            badge: 340,
            badgeColor: 'primary',
            description: 'View and manage all connections'
          },
          {
            id: 'connections-create',
            label: 'Add Connection',
            icon: 'add_link',
            route: '/admin/connections/create',
            description: 'Create a new connection'
          },
          {
            id: 'connections-pending',
            label: 'Pending Review',
            icon: 'pending',
            route: '/admin/connections/pending',
            badge: 15,
            badgeColor: 'accent',
            description: 'Connections pending review'
          },
          {
            id: 'connections-analytics',
            label: 'Analytics',
            icon: 'analytics',
            route: '/admin/connections/analytics',
            description: 'Connection analytics and insights'
          }
        ]
      },
      {
        id: 'files',
        label: 'File Management',
        icon: 'folder',
        expanded: false,
        description: 'Manage files and media',
        children: [
          {
            id: 'files-logos',
            label: 'Club Logos',
            icon: 'image',
            route: '/admin/files/logos',
            badge: 89,
            badgeColor: 'primary',
            description: 'Manage club logos'
          },
          {
            id: 'files-upload',
            label: 'Upload Files',
            icon: 'cloud_upload',
            route: '/admin/files/upload',
            description: 'Upload new files'
          },
          {
            id: 'files-gallery',
            label: 'Media Gallery',
            icon: 'photo_library',
            route: '/admin/files/gallery',
            description: 'Browse all media files'
          },
          {
            id: 'files-storage',
            label: 'Storage Usage',
            icon: 'storage',
            route: '/admin/files/storage',
            description: 'Monitor storage usage'
          }
        ]
      },
      {
        id: 'users',
        label: 'User Management',
        icon: 'people',
        expanded: false,
        description: 'Manage system users',
        children: [
          {
            id: 'users-list',
            label: 'All Users',
            icon: 'list',
            route: '/admin/users',
            badge: 12,
            badgeColor: 'primary',
            description: 'View and manage all users'
          },
          {
            id: 'users-create',
            label: 'Add User',
            icon: 'person_add',
            route: '/admin/users/create',
            description: 'Create a new user'
          },
          {
            id: 'users-roles',
            label: 'Roles & Permissions',
            icon: 'security',
            route: '/admin/users/roles',
            description: 'Manage user roles and permissions'
          },
          {
            id: 'users-activity',
            label: 'User Activity',
            icon: 'timeline',
            route: '/admin/users/activity',
            description: 'View user activity logs'
          }
        ]
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'analytics',
        route: '/admin/analytics',
        description: 'View detailed analytics'
      },
      {
        id: 'settings',
        label: 'System Settings',
        icon: 'settings',
        expanded: false,
        description: 'System configuration',
        children: [
          {
            id: 'settings-general',
            label: 'General',
            icon: 'tune',
            route: '/admin/settings/general',
            description: 'General system settings'
          },
          {
            id: 'settings-security',
            label: 'Security',
            icon: 'security',
            route: '/admin/settings/security',
            description: 'Security configuration'
          },
          {
            id: 'settings-backup',
            label: 'Backup & Restore',
            icon: 'backup',
            route: '/admin/settings/backup',
            description: 'Data backup and restore'
          },
          {
            id: 'settings-maintenance',
            label: 'Maintenance',
            icon: 'build',
            route: '/admin/settings/maintenance',
            description: 'System maintenance tools'
          }
        ]
      }
    ];

    this.navigationItems.set(navigationItems);
  }

  /// <summary>
  /// Setup route tracking for active state.
  /// </summary>
  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
        this.updateExpandedStates(event.url);
      });

    // Set initial route
    this.currentRoute.set(this.router.url);
    this.updateExpandedStates(this.router.url);
  }

  /// <summary>
  /// Update expanded states based on current route.
  /// </summary>
  private updateExpandedStates(currentUrl: string): void {
    const items = this.navigationItems();

    items.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child =>
          child.route && currentUrl.startsWith(child.route)
        );
        item.expanded = hasActiveChild;
      }
    });

    this.navigationItems.set([...items]);
  }

  /// <summary>
  /// Load quick statistics.
  /// </summary>
  private async loadQuickStats(): Promise<void> {
    try {
      // TODO: Replace with actual API calls
      // const stats = await this.adminService.getQuickStats();
      // Update quickStats object
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  }

  /// <summary>
  /// Check if route is currently active.
  /// </summary>
  isActive(route?: string): boolean {
    if (!route) return false;
    const currentRoute = this.currentRoute();
    return currentRoute === route || currentRoute.startsWith(route + '/');
  }

  /// <summary>
  /// Toggle expansion state of menu item.
  /// </summary>
  toggleExpansion(item: NavigationItem): void {
    item.expanded = !item.expanded;

    // Update the array to trigger change detection
    const items = this.navigationItems();
    this.navigationItems.set([...items]);
  }

  /// <summary>
  /// Handle navigation item click.
  /// </summary>
  onNavigationClick(item: NavigationItem): void {
    // Track navigation for analytics
    console.log('Navigation clicked:', item.id, item.label);

    // Emit event for parent component (close mobile menu)
    this.navigationClick.emit();
  }
}
