import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';

/// <summary>
/// User model representing authenticated user information
/// </summary>
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
  lastLogin?: Date;
  isActive: boolean;
  preferences?: UserPreferences;
}

/// <summary>
/// User preferences for personalization
/// </summary>
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  accessibility: {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
}

/// <summary>
/// Login credentials for authentication
/// </summary>
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/// <summary>
/// Authentication response from the server
/// </summary>
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/// <summary>
/// Authentication service for managing user authentication and session state.
/// Provides login, logout, token management, and user state management functionality.
/// </summary>
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly tokenKey = 'admin_access_token';
  private readonly refreshTokenKey = 'admin_refresh_token';
  private readonly userKey = 'admin_user';

  // Reactive state using signals
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isAuthenticated = computed(() => this._currentUser() !== null);
  private readonly _isLoading = signal<boolean>(false);

  // Public observables for components
  public readonly currentUser$ = this.currentUserSubject.asObservable();
  public readonly isLoading$ = this.isLoadingSubject.asObservable();

  // Public signals for reactive components
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = this._isAuthenticated;
  public readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.initializeFromStorage();
  }

  /// <summary>
  /// Authenticates user with provided credentials
  /// </summary>
  /// <param name="credentials">Login credentials including username and password</param>
  /// <returns>Observable of authentication response</returns>
  /// <exception cref="Error">Thrown when authentication fails</exception>
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);

    // Simulate API call with mock data
    return this.mockAuthApi(credentials).pipe(
      map(response => {
        this.setAuthenticatedUser(response.user, response.accessToken, response.refreshToken);
        return response;
      }),
      catchError(error => {
        this.clearAuthentication();
        return throwError(() => error);
      }),
      delay(1000) // Simulate network delay
    );
  }

  /// <summary>
  /// Logs out the current user and clears authentication state
  /// </summary>
  logout(): void {
    this.setLoading(true);

    // Clear all stored authentication data
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);

    // Reset state
    this._currentUser.set(null);
    this.currentUserSubject.next(null);
    this.setLoading(false);
  }

  /// <summary>
  /// Refreshes the current authentication token
  /// </summary>
  /// <returns>Observable indicating success of token refresh</returns>
  refreshToken(): Observable<boolean> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) {
      return of(false);
    }

    // Simulate token refresh API call
    return of(true).pipe(
      delay(500),
      map(() => {
        // In real implementation, call refresh token API
        // For now, just return success if refresh token exists
        return true;
      }),
      catchError(() => {
        this.clearAuthentication();
        return of(false);
      })
    );
  }

  /// <summary>
  /// Gets the current access token
  /// </summary>
  /// <returns>Current access token or null if not authenticated</returns>
  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /// <summary>
  /// Checks if user has a specific role
  /// </summary>
  /// <param name="role">Role to check for</param>
  /// <returns>True if user has the role, false otherwise</returns>
  hasRole(role: string): boolean {
    const user = this._currentUser();
    return user?.roles?.includes(role) || false;
  }

  /// <summary>
  /// Checks if user has any of the specified roles
  /// </summary>
  /// <param name="roles">Array of roles to check for</param>
  /// <returns>True if user has any of the roles, false otherwise</returns>
  hasAnyRole(roles: string[]): boolean {
    const user = this._currentUser();
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  }

  /// <summary>
  /// Checks if user has all of the specified roles
  /// </summary>
  /// <param name="roles">Array of roles to check for</param>
  /// <returns>True if user has all of the roles, false otherwise</returns>
  hasAllRoles(roles: string[]): boolean {
    const user = this._currentUser();
    if (!user?.roles) return false;
    return roles.every(role => user.roles.includes(role));
  }

  /// <summary>
  /// Checks if user has a specific permission
  /// </summary>
  /// <param name="permission">Permission to check for</param>
  /// <returns>True if user has the permission, false otherwise</returns>
  hasPermission(permission: string): boolean {
    const user = this._currentUser();
    return user?.permissions?.includes(permission) || false;
  }

  /// <summary>
  /// Checks if user has any of the specified permissions
  /// </summary>
  /// <param name="permissions">Array of permissions to check for</param>
  /// <returns>True if user has any of the permissions, false otherwise</returns>
  hasAnyPermission(permissions: string[]): boolean {
    const user = this._currentUser();
    if (!user?.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /// <summary>
  /// Updates user preferences
  /// </summary>
  /// <param name="preferences">New user preferences</param>
  /// <returns>Observable indicating success of update</returns>
  updatePreferences(preferences: Partial<UserPreferences>): Observable<boolean> {
    const currentUser = this._currentUser();
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    // Update user preferences
    const updatedUser: User = {
      ...currentUser,
      preferences: {
        ...currentUser.preferences,
        ...preferences
      } as UserPreferences
    };

    // Update storage and state
    localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
    this._currentUser.set(updatedUser);
    this.currentUserSubject.next(updatedUser);

    return of(true).pipe(delay(500));
  }

  /// <summary>
  /// Initializes authentication state from localStorage
  /// </summary>
  private initializeFromStorage(): void {
    try {
      const token = localStorage.getItem(this.tokenKey);
      const userJson = localStorage.getItem(this.userKey);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        this._currentUser.set(user);
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error initializing auth from storage:', error);
      this.clearAuthentication();
    }
  }

  /// <summary>
  /// Sets the authenticated user and stores tokens
  /// </summary>
  /// <param name="user">Authenticated user</param>
  /// <param name="accessToken">Access token</param>
  /// <param name="refreshToken">Refresh token</param>
  private setAuthenticatedUser(user: User, accessToken: string, refreshToken: string): void {
    // Store in localStorage
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(user));

    // Update state
    this._currentUser.set(user);
    this.currentUserSubject.next(user);
    this.setLoading(false);
  }

  /// <summary>
  /// Clears all authentication state
  /// </summary>
  private clearAuthentication(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);

    this._currentUser.set(null);
    this.currentUserSubject.next(null);
    this.setLoading(false);
  }

  /// <summary>
  /// Sets loading state
  /// </summary>
  /// <param name="loading">Loading state</param>
  private setLoading(loading: boolean): void {
    this._isLoading.set(loading);
    this.isLoadingSubject.next(loading);
  }

  /// <summary>
  /// Mock authentication API for development
  /// </summary>
  /// <param name="credentials">Login credentials</param>
  /// <returns>Observable of mock authentication response</returns>
  private mockAuthApi(credentials: LoginCredentials): Observable<AuthResponse> {
    // Mock user data - in real app, this comes from the API
    const mockUsers: Record<string, User> = {
      'admin': {
        id: '1',
        username: 'admin',
        email: 'admin@polishfootball.com',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['super_admin', 'admin', 'moderator', 'user'],
        permissions: [
          'users.view', 'users.create', 'users.edit', 'users.delete',
          'clubs.view', 'clubs.create', 'clubs.edit', 'clubs.delete',
          'connections.view', 'connections.create', 'connections.edit', 'connections.delete',
          'files.view', 'files.upload', 'files.delete',
          'system.settings', 'system.health', 'system.logs',
          'analytics.view', 'reports.generate'
        ],
        avatar: 'https://via.placeholder.com/40x40?text=A',
        lastLogin: new Date(),
        isActive: true,
        preferences: {
          theme: 'light',
          language: 'pl',
          timezone: 'Europe/Warsaw',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          accessibility: {
            fontSize: 'normal',
            highContrast: false,
            reducedMotion: false,
            screenReader: false
          }
        }
      },
      'moderator': {
        id: '2',
        username: 'moderator',
        email: 'moderator@polishfootball.com',
        firstName: 'Moderator',
        lastName: 'User',
        roles: ['moderator', 'user'],
        permissions: [
          'users.view', 'users.edit',
          'clubs.view', 'clubs.edit',
          'connections.view', 'connections.edit',
          'files.view', 'files.upload'
        ],
        avatar: 'https://via.placeholder.com/40x40?text=M',
        lastLogin: new Date(),
        isActive: true,
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'Europe/Warsaw',
          notifications: {
            email: true,
            push: false,
            sms: false
          },
          accessibility: {
            fontSize: 'normal',
            highContrast: false,
            reducedMotion: false,
            screenReader: false
          }
        }
      }
    };

    // Simulate authentication logic
    if (credentials.username in mockUsers && credentials.password === 'password123') {
      const user = mockUsers[credentials.username];
      const response: AuthResponse = {
        user,
        accessToken: `mock_token_${user.id}_${Date.now()}`,
        refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      };
      return of(response);
    } else {
      return throwError(() => new Error('Invalid credentials'));
    }
  }
}
