import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, timer, throwError, Subscription } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { APP_CONSTANTS, ERROR_MESSAGES } from '../constants';
import {
  User,
  AuthRequestDto,
  AuthResponseDto,
  UserRole,
} from '../models';

// Additional DTOs for authentication
export interface LoginDto extends AuthRequestDto {}

export interface RegisterDto {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly firstName?: string;
  readonly lastName?: string;
}

export interface ChangePasswordDto {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export interface ResetPasswordDto {
  readonly token: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface RequestPasswordResetDto {
  readonly email: string;
}

export interface AuthState {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly token: string | null;
}

/**
 * Authentication service with JWT token management and user state
 * Uses modern Angular patterns with signals and inject() function
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  // Private state signals
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(false);

  // Token refresh timer
  private tokenRefreshTimer?: Subscription;

  // Public computed signals
  public readonly user = computed(() => this._user());
  public readonly token = computed(() => this._token());
  public readonly isAuthenticated = computed(() => !!this._user() && !!this._token());
  public readonly isLoading = computed(() => this._isLoading());

  // Role-based computed signals
  public readonly isAdmin = computed(() =>
    this._user()?.role === UserRole.Admin
  );
  public readonly isClubAdmin = computed(() =>
    this._user()?.role === UserRole.ClubAdmin
  );
  public readonly canManageClubs = computed(() =>
    this.isAdmin() || this.isClubAdmin()
  );

  // Auth state as computed signal
  public readonly authState = computed<AuthState>(() => ({
    user: this._user(),
    isAuthenticated: this.isAuthenticated(),
    isLoading: this._isLoading(),
    token: this._token(),
  }));

  constructor() {
    // Initialize auth state from storage
    this.initializeAuthState();

    // Set up token refresh effect
    effect(() => {
      const token = this._token();
      if (token) {
        this.scheduleTokenRefresh(token);
      } else {
        this.clearTokenRefresh();
      }
    });
  }

  /**
   * Login user with credentials
   */
  public login(credentials: LoginDto): Observable<AuthResponseDto> {
    this._isLoading.set(true);

    return this.apiService.post<AuthResponseDto>(APP_CONSTANTS.ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap(response => {
        this.setAuthData(response);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register new user
   */
  public register(userData: RegisterDto): Observable<AuthResponseDto> {
    this._isLoading.set(true);

    return this.apiService.post<AuthResponseDto>('/auth/register', userData).pipe(
      tap(response => {
        this.setAuthData(response);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh authentication token
   */
  public refreshToken(): Observable<AuthResponseDto> {
    const currentToken = this._token();

    if (!currentToken) {
      return throwError(() => new Error(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED));
    }

    return this.apiService.post<AuthResponseDto>(APP_CONSTANTS.ENDPOINTS.AUTH.REFRESH, {
      token: currentToken,
    }).pipe(
      tap(response => {
        this.setAuthData(response);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user and clear auth state
   */
  public logout(): void {
    // Call logout endpoint if token exists
    const currentToken = this._token();
    if (currentToken) {
      this.apiService.post(APP_CONSTANTS.ENDPOINTS.AUTH.LOGOUT, { token: currentToken })
        .subscribe({
          error: () => {
            // Ignore logout errors and continue with local cleanup
          }
        });
    }

    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get current user profile
   */
  public getCurrentUser(): Observable<User> {
    return this.apiService.get<User>('/auth/me').pipe(
      tap(user => {
        this._user.set(user);
        this.saveUserToStorage(user);
      })
    );
  }

  /**
   * Get current JWT token
   */
  public getToken(): string | null {
    return this._token();
  }

  /**
   * Change user password
   */
  public changePassword(passwordData: ChangePasswordDto): Observable<void> {
    return this.apiService.put<void>('/auth/change-password', passwordData);
  }

  /**
   * Request password reset
   */
  public requestPasswordReset(data: RequestPasswordResetDto): Observable<void> {
    return this.apiService.post<void>('/auth/request-password-reset', data);
  }

  /**
   * Reset password with token
   */
  public resetPassword(data: ResetPasswordDto): Observable<void> {
    return this.apiService.post<void>('/auth/reset-password', data);
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: UserRole): boolean {
    return this._user()?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  public hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this._user()?.role;
    return userRole ? roles.includes(userRole as UserRole) : false;
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(): boolean {
    const token = this._token();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiry time
   */
  public getTokenExpiry(): Date | null {
    const token = this._token();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeAuthState(): void {
    const storedToken = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);

    if (storedToken && storedUser && !this.isTokenExpiredStatic(storedToken)) {
      try {
        const user = JSON.parse(storedUser) as User;
        this._token.set(storedToken);
        this._user.set(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuthData();
      }
    } else {
      this.clearAuthData();
    }
  }

  /**
   * Set authentication data
   */
  private setAuthData(authResponse: AuthResponseDto): void {
    this._token.set(authResponse.token);

    // Convert UserDto to User for consistency
    const user: User = {
      ...authResponse.user,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: authResponse.user.lastLoginAt ? new Date(authResponse.user.lastLoginAt) : undefined,
    };

    this._user.set(user);

    // Save to storage
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN, authResponse.token);
    this.saveUserToStorage(user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    this._token.set(null);
    this._user.set(null);
    this.clearTokenRefresh();

    // Clear storage
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
  }

  /**
   * Save user data to storage
   */
  private saveUserToStorage(user: User): void {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(token: string): void {
    this.clearTokenRefresh();

    const expiry = this.getTokenExpiryStatic(token);
    if (!expiry) return;

    // Refresh token 5 minutes before expiry
    const refreshTime = expiry.getTime() - Date.now() - (5 * 60 * 1000);

    if (refreshTime > 0) {
      this.tokenRefreshTimer = timer(refreshTime).subscribe(() => {
        this.refreshToken().subscribe({
          error: () => {
            // Token refresh failed, logout user
            this.logout();
          }
        });
      });
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      this.tokenRefreshTimer.unsubscribe();
      this.tokenRefreshTimer = undefined;
    }
  }

  /**
   * Check if token is expired (static method)
   */
  private isTokenExpiredStatic(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiry time (static method)
   */
  private getTokenExpiryStatic(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }
}
