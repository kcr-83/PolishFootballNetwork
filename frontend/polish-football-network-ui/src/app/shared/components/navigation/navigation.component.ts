import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly route?: string;
  readonly href?: string;
  readonly action?: string;
  readonly badge?: string | number;
  readonly children?: NavigationItem[];
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly roles?: string[];
  readonly exact?: boolean;
}

export interface UserInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
  readonly role: string;
  readonly clubName?: string;
}

/**
 * Standalone navigation component
 * Provides consistent navigation interface for the application
 */
@Component({
  selector: 'pfn-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav
      class="pfn-navigation"
      [class]="getNavigationClasses()"
      [attr.data-testid]="'navigation'"
      role="navigation"
      [attr.aria-label]="ariaLabel || 'Main navigation'"
    >
      <!-- Navigation Header -->
      @if (showHeader) {
        <div class="pfn-nav-header">
          @if (logo) {
            <div class="pfn-nav-logo">
              @if (logo.route) {
                <a [routerLink]="logo.route" class="pfn-nav-logo-link">
                  @if (logo.icon) {
                    <i [class]="logo.icon" aria-hidden="true"></i>
                  }
                  @if (logo.text) {
                    <span class="pfn-nav-logo-text">{{ logo.text }}</span>
                  }
                </a>
              } @else {
                @if (logo.icon) {
                  <i [class]="logo.icon" aria-hidden="true"></i>
                }
                @if (logo.text) {
                  <span class="pfn-nav-logo-text">{{ logo.text }}</span>
                }
              }
            </div>
          }

          @if (showToggle) {
            <button
              type="button"
              class="pfn-nav-toggle"
              (click)="toggleCollapsed()"
              [attr.aria-expanded]="!collapsed()"
              [attr.aria-label]="collapsed() ? 'Expand navigation' : 'Collapse navigation'"
              data-testid="nav-toggle"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                @if (collapsed()) {
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                } @else {
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                }
              </svg>
            </button>
          }
        </div>
      }

      <!-- Navigation Content -->
      <div class="pfn-nav-content">
        @if (!collapsed() || !collapsible) {
          <!-- Navigation Items -->
          @if (items && items.length > 0) {
            <ul class="pfn-nav-list" role="menubar">
              @for (item of visibleItems(); track item.id) {
                <li class="pfn-nav-item" role="none">
                  @if (item.children && item.children.length > 0) {
                    <!-- Parent item with children -->
                    <div class="pfn-nav-group">
                      <button
                        type="button"
                        class="pfn-nav-link pfn-nav-link--parent"
                        [class.pfn-nav-link--expanded]="expandedGroups().has(item.id)"
                        (click)="toggleGroup(item.id)"
                        [attr.aria-expanded]="expandedGroups().has(item.id)"
                        [attr.aria-controls]="'nav-group-' + item.id"
                        [disabled]="item.disabled"
                        role="menuitem"
                        [attr.data-testid]="'nav-item-' + item.id"
                      >
                        @if (item.icon) {
                          <i [class]="item.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                        }
                        <span class="pfn-nav-label">{{ item.label }}</span>
                        @if (item.badge) {
                          <span class="pfn-nav-badge" [attr.aria-label]="item.badge + ' items'">
                            {{ item.badge }}
                          </span>
                        }
                        <svg class="pfn-nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                      </button>

                      @if (expandedGroups().has(item.id)) {
                        <ul
                          class="pfn-nav-sublist"
                          [id]="'nav-group-' + item.id"
                          role="menu"
                          [attr.aria-labelledby]="'nav-item-' + item.id"
                        >
                          @for (child of getVisibleChildren(item); track child.id) {
                            <li class="pfn-nav-subitem" role="none">
                              @if (child.route) {
                                <a
                                  [routerLink]="child.route"
                                  class="pfn-nav-link pfn-nav-link--child"
                                  [class.pfn-nav-link--disabled]="child.disabled"
                                  routerLinkActive="pfn-nav-link--active"
                                  [routerLinkActiveOptions]="{ exact: child.exact || false }"
                                  role="menuitem"
                                  [attr.data-testid]="'nav-child-' + child.id"
                                  (click)="onNavigate(child)"
                                >
                                  @if (child.icon) {
                                    <i [class]="child.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                                  }
                                  <span class="pfn-nav-label">{{ child.label }}</span>
                                  @if (child.badge) {
                                    <span class="pfn-nav-badge" [attr.aria-label]="child.badge + ' items'">
                                      {{ child.badge }}
                                    </span>
                                  }
                                </a>
                              } @else if (child.href) {
                                <a
                                  [href]="child.href"
                                  class="pfn-nav-link pfn-nav-link--child"
                                  [class.pfn-nav-link--disabled]="child.disabled"
                                  role="menuitem"
                                  [attr.data-testid]="'nav-child-' + child.id"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  (click)="onNavigate(child)"
                                >
                                  @if (child.icon) {
                                    <i [class]="child.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                                  }
                                  <span class="pfn-nav-label">{{ child.label }}</span>
                                  @if (child.badge) {
                                    <span class="pfn-nav-badge" [attr.aria-label]="child.badge + ' items'">
                                      {{ child.badge }}
                                    </span>
                                  }
                                </a>
                              } @else {
                                <button
                                  type="button"
                                  class="pfn-nav-link pfn-nav-link--child"
                                  [disabled]="child.disabled"
                                  role="menuitem"
                                  [attr.data-testid]="'nav-child-' + child.id"
                                  (click)="onAction(child)"
                                >
                                  @if (child.icon) {
                                    <i [class]="child.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                                  }
                                  <span class="pfn-nav-label">{{ child.label }}</span>
                                  @if (child.badge) {
                                    <span class="pfn-nav-badge" [attr.aria-label]="child.badge + ' items'">
                                      {{ child.badge }}
                                    </span>
                                  }
                                </button>
                              }
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  } @else {
                    <!-- Single navigation item -->
                    @if (item.route) {
                      <a
                        [routerLink]="item.route"
                        class="pfn-nav-link"
                        [class.pfn-nav-link--disabled]="item.disabled"
                        routerLinkActive="pfn-nav-link--active"
                        [routerLinkActiveOptions]="{ exact: item.exact || false }"
                        role="menuitem"
                        [attr.data-testid]="'nav-item-' + item.id"
                        (click)="onNavigate(item)"
                      >
                        @if (item.icon) {
                          <i [class]="item.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                        }
                        <span class="pfn-nav-label">{{ item.label }}</span>
                        @if (item.badge) {
                          <span class="pfn-nav-badge" [attr.aria-label]="item.badge + ' items'">
                            {{ item.badge }}
                          </span>
                        }
                      </a>
                    } @else if (item.href) {
                      <a
                        [href]="item.href"
                        class="pfn-nav-link"
                        [class.pfn-nav-link--disabled]="item.disabled"
                        role="menuitem"
                        [attr.data-testid]="'nav-item-' + item.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        (click)="onNavigate(item)"
                      >
                        @if (item.icon) {
                          <i [class]="item.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                        }
                        <span class="pfn-nav-label">{{ item.label }}</span>
                        @if (item.badge) {
                          <span class="pfn-nav-badge" [attr.aria-label]="item.badge + ' items'">
                            {{ item.badge }}
                          </span>
                        }
                      </a>
                    } @else {
                      <button
                        type="button"
                        class="pfn-nav-link"
                        [disabled]="item.disabled"
                        role="menuitem"
                        [attr.data-testid]="'nav-item-' + item.id"
                        (click)="onAction(item)"
                      >
                        @if (item.icon) {
                          <i [class]="item.icon" class="pfn-nav-icon" aria-hidden="true"></i>
                        }
                        <span class="pfn-nav-label">{{ item.label }}</span>
                        @if (item.badge) {
                          <span class="pfn-nav-badge" [attr.aria-label]="item.badge + ' items'">
                            {{ item.badge }}
                          </span>
                        }
                      </button>
                    }
                  }
                </li>
              }
            </ul>
          }

          <!-- User Information -->
          @if (userInfo && showUserInfo) {
            <div class="pfn-nav-user">
              <div class="pfn-nav-user-info">
                @if (userInfo.avatar) {
                  <img
                    [src]="userInfo.avatar"
                    [alt]="userInfo.name"
                    class="pfn-nav-user-avatar"
                  >
                } @else {
                  <div class="pfn-nav-user-avatar pfn-nav-user-avatar--default">
                    {{ getUserInitials(userInfo.name) }}
                  </div>
                }

                <div class="pfn-nav-user-details">
                  <div class="pfn-nav-user-name">{{ userInfo.name }}</div>
                  <div class="pfn-nav-user-role">{{ userInfo.role }}</div>
                  @if (userInfo.clubName) {
                    <div class="pfn-nav-user-club">{{ userInfo.clubName }}</div>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>
    </nav>
  `,
  styles: [`
    .pfn-navigation {
      background-color: #ffffff;
      border-right: 1px solid #e9ecef;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      min-width: 250px;
    }

    .pfn-navigation--horizontal {
      flex-direction: row;
      border-right: none;
      border-bottom: 1px solid #e9ecef;
      height: auto;
      width: 100%;
      min-width: auto;
    }

    .pfn-navigation--collapsed {
      min-width: 60px;
    }

    .pfn-navigation--dark {
      background-color: #212529;
      border-color: #495057;
      color: #ffffff;
    }

    .pfn-nav-header {
      padding: 1rem;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pfn-navigation--dark .pfn-nav-header {
      border-color: #495057;
    }

    .pfn-nav-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pfn-nav-logo-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: inherit;
    }

    .pfn-nav-logo-text {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .pfn-nav-toggle {
      background: none;
      border: none;
      padding: 0.25rem;
      color: currentColor;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }

    .pfn-nav-toggle:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .pfn-navigation--dark .pfn-nav-toggle:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .pfn-nav-content {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .pfn-nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .pfn-nav-item {
      margin-bottom: 0.25rem;
    }

    .pfn-nav-group {
      width: 100%;
    }

    .pfn-nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      text-decoration: none;
      color: #495057;
      border-radius: 6px;
      transition: all 0.15s ease;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .pfn-navigation--dark .pfn-nav-link {
      color: #e9ecef;
    }

    .pfn-nav-link:hover:not(:disabled) {
      background-color: #f8f9fa;
      color: #212529;
    }

    .pfn-navigation--dark .pfn-nav-link:hover:not(:disabled) {
      background-color: #495057;
      color: #ffffff;
    }

    .pfn-nav-link--active {
      background-color: #e3f2fd;
      color: #1976d2;
      font-weight: 500;
    }

    .pfn-navigation--dark .pfn-nav-link--active {
      background-color: #1976d2;
      color: #ffffff;
    }

    .pfn-nav-link--disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pfn-nav-link--parent {
      justify-content: space-between;
    }

    .pfn-nav-link--child {
      padding-left: 2.5rem;
      font-size: 0.8125rem;
    }

    .pfn-nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      text-align: center;
    }

    .pfn-nav-label {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pfn-nav-badge {
      background-color: #dc3545;
      color: white;
      font-size: 0.75rem;
      padding: 0.125rem 0.375rem;
      border-radius: 10px;
      min-width: 1.25rem;
      text-align: center;
      line-height: 1;
    }

    .pfn-nav-chevron {
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .pfn-nav-link--expanded .pfn-nav-chevron {
      transform: rotate(90deg);
    }

    .pfn-nav-sublist {
      list-style: none;
      margin: 0.25rem 0 0 0;
      padding: 0;
      border-left: 2px solid #e9ecef;
      margin-left: 1.375rem;
    }

    .pfn-navigation--dark .pfn-nav-sublist {
      border-color: #495057;
    }

    .pfn-nav-subitem {
      margin-bottom: 0.125rem;
    }

    .pfn-nav-user {
      border-top: 1px solid #e9ecef;
      padding: 1rem;
      margin-top: auto;
    }

    .pfn-navigation--dark .pfn-nav-user {
      border-color: #495057;
    }

    .pfn-nav-user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .pfn-nav-user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .pfn-nav-user-avatar--default {
      background-color: #6c757d;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .pfn-nav-user-details {
      min-width: 0;
      flex: 1;
    }

    .pfn-nav-user-name {
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pfn-nav-user-role,
    .pfn-nav-user-club {
      font-size: 0.75rem;
      color: #6c757d;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pfn-navigation--dark .pfn-nav-user-role,
    .pfn-navigation--dark .pfn-nav-user-club {
      color: #adb5bd;
    }

    @media (max-width: 768px) {
      .pfn-navigation {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 1000;
        transform: translateX(-100%);
      }

      .pfn-navigation--mobile-open {
        transform: translateX(0);
      }

      .pfn-navigation--collapsed {
        min-width: 250px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationComponent {
  /**
   * Navigation items to display
   */
  @Input() items: NavigationItem[] = [];

  /**
   * Navigation orientation
   */
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';

  /**
   * Navigation theme
   */
  @Input() theme: 'light' | 'dark' = 'light';

  /**
   * Whether navigation is collapsible
   */
  @Input() collapsible: boolean = true;

  /**
   * Whether to show toggle button
   */
  @Input() showToggle: boolean = true;

  /**
   * Whether to show header section
   */
  @Input() showHeader: boolean = true;

  /**
   * Logo configuration
   */
  @Input() logo?: {
    icon?: string;
    text?: string;
    route?: string;
  };

  /**
   * User information to display
   */
  @Input() userInfo?: UserInfo;

  /**
   * Whether to show user information section
   */
  @Input() showUserInfo: boolean = true;

  /**
   * User roles for permission checking
   */
  @Input() userRoles: string[] = [];

  /**
   * ARIA label for navigation
   */
  @Input() ariaLabel?: string;

  /**
   * Event emitted when navigation item is clicked
   */
  @Output() itemClicked = new EventEmitter<NavigationItem>();

  /**
   * Event emitted when navigation is toggled
   */
  @Output() toggled = new EventEmitter<boolean>();

  // Component state
  collapsed = signal(false);
  expandedGroups = signal(new Set<string>());

  // Computed properties
  visibleItems = computed(() => {
    return this.items.filter(item =>
      !item.hidden && this.hasPermission(item)
    );
  });

  /**
   * Toggle navigation collapsed state
   */
  toggleCollapsed(): void {
    const newState = !this.collapsed();
    this.collapsed.set(newState);
    this.toggled.emit(newState);
  }

  /**
   * Toggle navigation group expanded state
   */
  toggleGroup(groupId: string): void {
    const groups = new Set(this.expandedGroups());
    if (groups.has(groupId)) {
      groups.delete(groupId);
    } else {
      groups.add(groupId);
    }
    this.expandedGroups.set(groups);
  }

  /**
   * Handle navigation item click
   */
  onNavigate(item: NavigationItem): void {
    if (!item.disabled) {
      this.itemClicked.emit(item);
    }
  }

  /**
   * Handle action button click
   */
  onAction(item: NavigationItem): void {
    if (!item.disabled && item.action) {
      this.itemClicked.emit(item);
    }
  }

  /**
   * Get visible children for a navigation item
   */
  getVisibleChildren(item: NavigationItem): NavigationItem[] {
    if (!item.children) return [];

    return item.children.filter(child =>
      !child.hidden && this.hasPermission(child)
    );
  }

  /**
   * Check if user has permission for navigation item
   */
  hasPermission(item: NavigationItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    return item.roles.some(role => this.userRoles.includes(role));
  }

  /**
   * Get navigation CSS classes
   */
  getNavigationClasses(): string {
    const classes = ['pfn-navigation'];

    classes.push(`pfn-navigation--${this.orientation}`);
    classes.push(`pfn-navigation--${this.theme}`);

    if (this.collapsed()) {
      classes.push('pfn-navigation--collapsed');
    }

    return classes.join(' ');
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
