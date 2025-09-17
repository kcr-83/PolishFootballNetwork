import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/**
 * Login component for user authentication
 * Features reactive forms and basic validation
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Polish Football Network</h1>
          <p>Sign in to your account</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <!-- Email Field -->
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter your email"
              autocomplete="email"
              [class.error]="isFieldInvalid('email')"
            />
            <div class="error-messages" *ngIf="isFieldInvalid('email')">
              <small *ngIf="loginForm.get('email')?.hasError('required')">
                Email is required
              </small>
              <small *ngIf="loginForm.get('email')?.hasError('email')">
                Please enter a valid email address
              </small>
            </div>
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input">
              <input
                id="password"
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                [class.error]="isFieldInvalid('password')"
              />
              <button
                type="button"
                class="toggle-password"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
              >
                {{ hidePassword() ? '👁️' : '🙈' }}
              </button>
            </div>
            <div class="error-messages" *ngIf="isFieldInvalid('password')">
              <small *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </small>
              <small *ngIf="loginForm.get('password')?.hasError('minlength')">
                Password must be at least 6 characters long
              </small>
            </div>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            class="login-button"
            [disabled]="loginForm.invalid || isLoading()"
          >
            @if (isLoading()) {
              <span class="spinner"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="error-banner" role="alert">
              {{ errorMessage() }}
            </div>
          }
        </form>

        <div class="auth-links">
          <a routerLink="/auth/forgot-password">Forgot Password?</a>
          <span>•</span>
          <a routerLink="/auth/register">Create Account</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 1rem;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h1 {
      margin: 0 0 0.5rem;
      color: #1976d2;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .login-header p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-weight: 500;
      color: #333;
      font-size: 0.875rem;
    }

    input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    input.error {
      border-color: #f44336;
    }

    .password-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input input {
      flex: 1;
      padding-right: 3rem;
    }

    .toggle-password {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.25rem;
    }

    .error-messages {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .error-messages small {
      color: #f44336;
      font-size: 0.75rem;
    }

    .login-button {
      padding: 0.75rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .login-button:hover:not(:disabled) {
      background: #1565c0;
    }

    .login-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-banner {
      padding: 0.75rem;
      background: #ffebee;
      border: 1px solid #f44336;
      border-radius: 4px;
      color: #c62828;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .auth-links {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      font-size: 0.875rem;
    }

    .auth-links a {
      color: #1976d2;
      text-decoration: none;
    }

    .auth-links a:hover {
      text-decoration: underline;
    }

    .auth-links span {
      color: #999;
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 0.5rem;
      }

      .login-card {
        padding: 1.5rem;
      }

      .auth-links {
        flex-direction: column;
        gap: 0.25rem;
      }

      .auth-links span {
        display: none;
      }
    }
  `]
})
export class LoginComponent {
  // Component state
  readonly hidePassword = signal(true);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Reactive form
  readonly loginForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Handles form submission and user authentication
   */
  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const { email, password } = this.loginForm.value;

      // Simulate authentication - replace with actual service call
      setTimeout(() => {
        this.isLoading.set(false);

        // Mock successful login
        if (email && password) {
          console.log('Login attempt:', { email, password });
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Invalid credentials. Please try again.');
        }
      }, 1500);
    }
  }

  /**
   * Toggles password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update(hidden => !hidden);
  }

  /**
   * Checks if a form field is invalid and has been touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
