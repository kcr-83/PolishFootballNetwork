import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, interval, takeUntil } from 'rxjs';

/// <summary>
/// Interface for dashboard statistics.
/// </summary>
interface DashboardStats {
  totalClubs: number;
  activeClubs: number;
  totalConnections: number;
  pendingConnections: number;
  totalUsers: number;
  activeUsers: number;
  storageUsed: number;
  storageTotal: number;
}

/// <summary>
/// Interface for system health metrics.
/// </summary>
interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  memory: number;
  cpu: number;
  database: 'connected' | 'slow' | 'error';
  lastBackup: Date;
}

/// <summary>
/// Interface for recent activity items.
/// </summary>
interface ActivityItem {
  id: string;
  type: 'club' | 'connection' | 'user' | 'system';
  action: string;
  description: string;
  user: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

/// <summary>
/// Interface for quick action items.
/// </summary>
interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  color: 'primary' | 'accent' | 'warn';
  badge?: number;
}

/// <summary>
/// Admin dashboard component showing overview, statistics, and quick actions.
/// Features system health monitoring, recent activity feed, and analytics charts.
/// </summary>
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatListModule,
    MatBadgeModule
  ],
  template: `
    <div class="admin-dashboard">
      <!-- Dashboard Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">
            <mat-icon class="title-icon">dashboard</mat-icon>
            Admin Dashboard
          </h1>
          <p class="dashboard-subtitle">
            Polish Football Network Administration Overview
          </p>
        </div>

        <!-- System Status Indicator -->
        <div class="system-status" [class]="systemHealth().status">
          <mat-icon class="status-icon">{{ getStatusIcon() }}</mat-icon>
          <div class="status-info">
            <span class="status-text">{{ getStatusText() }}</span>
            <span class="uptime-text">Uptime: {{ systemHealth().uptime }}</span>
          </div>
        </div>
      </header>

      <!-- Statistics Cards -->
      <section class="stats-section" aria-label="System Statistics">
        <div class="stats-grid">
          <!-- Clubs Statistics -->
          <mat-card class="stat-card clubs-card">
            <mat-card-header class="stat-header">
              <mat-icon class="stat-icon clubs-icon">sports_soccer</mat-icon>
              <div class="stat-title">
                <mat-card-title>Clubs</mat-card-title>
                <mat-card-subtitle>Total and Active</mat-card-subtitle>
              </div>
            </mat-card-header>
            <mat-card-content class="stat-content">
              <div class="stat-number">{{ stats().totalClubs }}</div>
              <div class="stat-details">
                <span class="detail-item">
                  <mat-icon class="detail-icon">check_circle</mat-icon>
                  {{ stats().activeClubs }} Active
                </span>
                <span class="detail-item">
                  <mat-icon class="detail-icon">visibility_off</mat-icon>
                  {{ stats().totalClubs - stats().activeClubs }} Inactive
                </span>
              </div>
              <div class="stat-progress">
                <mat-progress-bar
                  mode="determinate"
                  [value]="getActiveClubsPercentage()">
                </mat-progress-bar>
                <span class="progress-text">{{ getActiveClubsPercentage() }}% Active</span>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/admin/clubs">
                View All Clubs
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Connections Statistics -->
          <mat-card class="stat-card connections-card">
            <mat-card-header class="stat-header">
              <mat-icon class="stat-icon connections-icon">account_tree</mat-icon>
              <div class="stat-title">
                <mat-card-title>Connections</mat-card-title>
                <mat-card-subtitle>Network Relations</mat-card-subtitle>
              </div>
            </mat-card-header>
            <mat-card-content class="stat-content">
              <div class="stat-number">{{ stats().totalConnections }}</div>
              <div class="stat-details">
                <span class="detail-item">
                  <mat-icon class="detail-icon">pending</mat-icon>
                  {{ stats().pendingConnections }} Pending
                </span>
                <span class="detail-item">
                  <mat-icon class="detail-icon">verified</mat-icon>
                  {{ stats().totalConnections - stats().pendingConnections }} Verified
                </span>
              </div>
              @if (stats().pendingConnections > 0) {
                <mat-chip-set class="pending-chips">
                  <mat-chip
                    class="pending-chip"
                    [matBadge]="stats().pendingConnections"
                    matBadgeColor="warn">
                    Needs Review
                  </mat-chip>
                </mat-chip-set>
              }
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/admin/connections">
                Manage Connections
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Users Statistics -->
          <mat-card class="stat-card users-card">
            <mat-card-header class="stat-header">
              <mat-icon class="stat-icon users-icon">people</mat-icon>
              <div class="stat-title">
                <mat-card-title>Users</mat-card-title>
                <mat-card-subtitle>System Access</mat-card-subtitle>
              </div>
            </mat-card-header>
            <mat-card-content class="stat-content">
              <div class="stat-number">{{ stats().totalUsers }}</div>
              <div class="stat-details">
                <span class="detail-item">
                  <mat-icon class="detail-icon">online_prediction</mat-icon>
                  {{ stats().activeUsers }} Online
                </span>
                <span class="detail-item">
                  <mat-icon class="detail-icon">admin_panel_settings</mat-icon>
                  {{ getAdminUsersCount() }} Admins
                </span>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/admin/users">
                User Management
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Storage Statistics -->
          <mat-card class="stat-card storage-card">
            <mat-card-header class="stat-header">
              <mat-icon class="stat-icon storage-icon">storage</mat-icon>
              <div class="stat-title">
                <mat-card-title>Storage</mat-card-title>
                <mat-card-subtitle>Files & Media</mat-card-subtitle>
              </div>
            </mat-card-header>
            <mat-card-content class="stat-content">
              <div class="stat-number">{{ getStorageUsedGB() }}GB</div>
              <div class="stat-details">
                <span class="detail-item">
                  <mat-icon class="detail-icon">folder</mat-icon>
                  {{ getStorageTotalGB() }}GB Total
                </span>
                <span class="detail-item">
                  <mat-icon class="detail-icon">image</mat-icon>
                  {{ getLogoCount() }} Logos
                </span>
              </div>
              <div class="stat-progress">
                <mat-progress-bar
                  mode="determinate"
                  [value]="getStoragePercentage()"
                  [color]="getStorageProgressColor()">
                </mat-progress-bar>
                <span class="progress-text">{{ getStoragePercentage() }}% Used</span>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" routerLink="/admin/files">
                File Management
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </section>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- System Health Panel -->
        <mat-card class="health-panel">
          <mat-card-header>
            <mat-icon mat-card-avatar class="health-avatar">
              {{ getHealthIcon() }}
            </mat-icon>
            <mat-card-title>System Health</mat-card-title>
            <mat-card-subtitle>Real-time Monitoring</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="health-metrics">
              <div class="metric-item">
                <span class="metric-label">Memory Usage</span>
                <div class="metric-value">
                  <mat-progress-bar
                    mode="determinate"
                    [value]="systemHealth().memory"
                    [color]="getMetricColor(systemHealth().memory)">
                  </mat-progress-bar>
                  <span class="metric-text">{{ systemHealth().memory }}%</span>
                </div>
              </div>

              <div class="metric-item">
                <span class="metric-label">CPU Usage</span>
                <div class="metric-value">
                  <mat-progress-bar
                    mode="determinate"
                    [value]="systemHealth().cpu"
                    [color]="getMetricColor(systemHealth().cpu)">
                  </mat-progress-bar>
                  <span class="metric-text">{{ systemHealth().cpu }}%</span>
                </div>
              </div>

              <div class="metric-item">
                <span class="metric-label">Database</span>
                <div class="metric-badge">
                  <mat-chip [class]="'db-status-' + systemHealth().database">
                    <mat-icon>{{ getDatabaseIcon() }}</mat-icon>
                    {{ getDatabaseStatus() }}
                  </mat-chip>
                </div>
              </div>

              <div class="metric-item">
                <span class="metric-label">Last Backup</span>
                <div class="metric-text">
                  {{ getLastBackupText() }}
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions Panel -->
        <mat-card class="quick-actions-panel">
          <mat-card-header>
            <mat-icon mat-card-avatar>flash_on</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
            <mat-card-subtitle>Common Tasks</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="actions-grid">
              @for (action of quickActions(); track action.id) {
                <button
                  mat-raised-button
                  [color]="action.color"
                  class="action-button"
                  [routerLink]="action.route"
                  [matTooltip]="action.description"
                  matTooltipPosition="below">
                  <mat-icon class="action-icon">{{ action.icon }}</mat-icon>
                  <span class="action-label">{{ action.label }}</span>
                  @if (action.badge && action.badge > 0) {
                    <span class="action-badge">{{ action.badge }}</span>
                  }
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Activity Panel -->
        <mat-card class="activity-panel">
          <mat-card-header>
            <mat-icon mat-card-avatar>timeline</mat-icon>
            <mat-card-title>Recent Activity</mat-card-title>
            <mat-card-subtitle>Last 24 Hours</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list class="activity-list">
              @for (activity of recentActivities(); track activity.id) {
                <mat-list-item class="activity-item" [class]="'activity-' + activity.status">
                  <mat-icon matListItemIcon class="activity-icon">
                    {{ getActivityIcon(activity.type) }}
                  </mat-icon>
                  <div matListItemTitle class="activity-title">
                    {{ activity.action }}
                  </div>
                  <div matListItemLine class="activity-description">
                    {{ activity.description }}
                  </div>
                  <div matListItemMeta class="activity-meta">
                    <span class="activity-user">{{ activity.user }}</span>
                    <span class="activity-time">{{ getTimeAgo(activity.timestamp) }}</span>
                  </div>
                </mat-list-item>
                @if (!$last) {
                  <mat-divider></mat-divider>
                }
              }
            </mat-list>

            @if (recentActivities().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">timeline</mat-icon>
                <p class="empty-text">No recent activity</p>
              </div>
            }
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/admin/activity">
              View All Activity
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // Component state signals
  readonly stats = signal<DashboardStats>({
    totalClubs: 127,
    activeClubs: 119,
    totalConnections: 340,
    pendingConnections: 15,
    totalUsers: 12,
    activeUsers: 3,
    storageUsed: 2.4 * 1024 * 1024 * 1024, // 2.4GB in bytes
    storageTotal: 10 * 1024 * 1024 * 1024 // 10GB in bytes
  });

  readonly systemHealth = signal<SystemHealth>({
    status: 'healthy',
    uptime: '7d 12h 34m',
    memory: 65,
    cpu: 23,
    database: 'connected',
    lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  });

  readonly recentActivities = signal<ActivityItem[]>([]);
  readonly quickActions = signal<QuickAction[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
    this.initializeQuickActions();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// <summary>
  /// Load dashboard data from services.
  /// </summary>
  private async loadDashboardData(): Promise<void> {
    try {
      // TODO: Replace with actual service calls
      await Promise.all([
        this.loadStatistics(),
        this.loadSystemHealth(),
        this.loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  /// <summary>
  /// Load statistics data.
  /// </summary>
  private async loadStatistics(): Promise<void> {
    // TODO: Replace with actual API call
    // const stats = await this.adminService.getStatistics();
    // this.stats.set(stats);
  }

  /// <summary>
  /// Load system health data.
  /// </summary>
  private async loadSystemHealth(): Promise<void> {
    // TODO: Replace with actual API call
    // const health = await this.adminService.getSystemHealth();
    // this.systemHealth.set(health);
  }

  /// <summary>
  /// Load recent activity data.
  /// </summary>
  private async loadRecentActivity(): Promise<void> {
    // Mock data for demonstration
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'club',
        action: 'Club Created',
        description: 'Legia Warsaw added to the system',
        user: 'Admin User',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'success'
      },
      {
        id: '2',
        type: 'connection',
        action: 'Connection Updated',
        description: 'Rivalry connection between Legia and Wisła verified',
        user: 'Moderator',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        status: 'success'
      },
      {
        id: '3',
        type: 'user',
        action: 'User Login',
        description: 'New admin user logged in',
        user: 'System',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'success'
      },
      {
        id: '4',
        type: 'system',
        action: 'Backup Failed',
        description: 'Scheduled backup encountered an error',
        user: 'System',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'error'
      }
    ];

    this.recentActivities.set(mockActivities);
  }

  /// <summary>
  /// Initialize quick actions.
  /// </summary>
  private initializeQuickActions(): void {
    const actions: QuickAction[] = [
      {
        id: 'add-club',
        label: 'Add Club',
        description: 'Create a new football club',
        icon: 'add_circle',
        route: '/admin/clubs/create',
        color: 'primary'
      },
      {
        id: 'add-connection',
        label: 'Add Connection',
        description: 'Create a new club connection',
        icon: 'add_link',
        route: '/admin/connections/create',
        color: 'primary'
      },
      {
        id: 'review-pending',
        label: 'Review Pending',
        description: 'Review pending connections',
        icon: 'pending_actions',
        route: '/admin/connections/pending',
        color: 'accent',
        badge: this.stats().pendingConnections
      },
      {
        id: 'upload-logos',
        label: 'Upload Logos',
        description: 'Upload club logos and media',
        icon: 'cloud_upload',
        route: '/admin/files/upload',
        color: 'primary'
      },
      {
        id: 'backup-now',
        label: 'Backup System',
        description: 'Create system backup',
        icon: 'backup',
        route: '/admin/settings/backup',
        color: 'warn'
      },
      {
        id: 'view-analytics',
        label: 'Analytics',
        description: 'View detailed analytics',
        icon: 'analytics',
        route: '/admin/analytics',
        color: 'primary'
      }
    ];

    this.quickActions.set(actions);
  }

  /// <summary>
  /// Setup auto refresh for real-time data.
  /// </summary>
  private setupAutoRefresh(): void {
    // Refresh system health every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadSystemHealth();
      });

    // Refresh activity every 2 minutes
    interval(120000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadRecentActivity();
      });
  }

  // Helper methods for template

  getActiveClubsPercentage(): number {
    const total = this.stats().totalClubs;
    const active = this.stats().activeClubs;
    return total > 0 ? Math.round((active / total) * 100) : 0;
  }

  getAdminUsersCount(): number {
    // TODO: Get actual admin count
    return 3;
  }

  getStorageUsedGB(): number {
    return Math.round((this.stats().storageUsed / (1024 * 1024 * 1024)) * 10) / 10;
  }

  getStorageTotalGB(): number {
    return Math.round((this.stats().storageTotal / (1024 * 1024 * 1024)) * 10) / 10;
  }

  getStoragePercentage(): number {
    const used = this.stats().storageUsed;
    const total = this.stats().storageTotal;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  }

  getStorageProgressColor(): string {
    const percentage = this.getStoragePercentage();
    if (percentage > 80) return 'warn';
    if (percentage > 60) return 'accent';
    return 'primary';
  }

  getLogoCount(): number {
    // TODO: Get actual logo count
    return 89;
  }

  getStatusIcon(): string {
    switch (this.systemHealth().status) {
      case 'healthy': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'help';
    }
  }

  getStatusText(): string {
    switch (this.systemHealth().status) {
      case 'healthy': return 'System Healthy';
      case 'warning': return 'System Warning';
      case 'error': return 'System Error';
      default: return 'System Unknown';
    }
  }

  getHealthIcon(): string {
    return this.getStatusIcon();
  }

  getMetricColor(value: number): string {
    if (value > 80) return 'warn';
    if (value > 60) return 'accent';
    return 'primary';
  }

  getDatabaseIcon(): string {
    switch (this.systemHealth().database) {
      case 'connected': return 'check_circle';
      case 'slow': return 'warning';
      case 'error': return 'error';
      default: return 'help';
    }
  }

  getDatabaseStatus(): string {
    switch (this.systemHealth().database) {
      case 'connected': return 'Connected';
      case 'slow': return 'Slow';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  }

  getLastBackupText(): string {
    const diff = Date.now() - this.systemHealth().lastBackup.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours}h ago`;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'club': return 'sports_soccer';
      case 'connection': return 'account_tree';
      case 'user': return 'person';
      case 'system': return 'settings';
      default: return 'info';
    }
  }

  getTimeAgo(timestamp: Date): string {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      return `${hours}h ago`;
    }
  }
}
