import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, LoginCredentials } from '../shared/services/auth.service';
import { AccessibilityService } from '../shared/services/accessibility.service';

/// <summary>
/// Login component for admin authentication.
/// Provides form-based login with validation and error handling.
/// </summary>
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly _isLoading = signal(false);
  private readonly _showPassword = signal(false);
  private readonly _errorMessage = signal<string | null>(null);

  // Reactive form for login
  public readonly loginForm: FormGroup;

  // Computed properties
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly showPassword = this._showPassword.asReadonly();
  public readonly errorMessage = this._errorMessage.asReadonly();
  public readonly isFormValid = computed(() => this.loginForm?.valid || false);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly accessibilityService: AccessibilityService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {
    this.loginForm = this.createLoginForm();
    this.setupFormValidation();
  }

  /// <summary>
  /// Handles form submission for login
  /// </summary>
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      this.accessibilityService.announceToScreenReader('Please fix the form errors before submitting.');
      return;
    }

    const credentials: LoginCredentials = {
      username: this.loginForm.get('username')?.value,
      password: this.loginForm.get('password')?.value,
      rememberMe: this.loginForm.get('rememberMe')?.value
    };

    this._isLoading.set(true);
    this._errorMessage.set(null);
    this.accessibilityService.announceToScreenReader('Logging in...');

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this._isLoading.set(false);
        this.accessibilityService.announceToScreenReader('Login successful. Redirecting to admin panel.');

        // Show success message
        this.snackBar.open('Login successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Redirect to intended URL or admin dashboard
        const intendedUrl = localStorage.getItem('intended_url');
        if (intendedUrl) {
          localStorage.removeItem('intended_url');
          this.router.navigateByUrl(intendedUrl);
        } else {
          this.router.navigate(['/admin']);
        }
      },
      error: (error) => {
        this._isLoading.set(false);
        const message = error.message || 'Login failed. Please try again.';
        this._errorMessage.set(message);
        this.accessibilityService.announceToScreenReader(`Login failed: ${message}`);

        // Show error message
        this.snackBar.open(message, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /// <summary>
  /// Toggles password visibility
  /// </summary>
  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
    const message = this.showPassword() ? 'Password is now visible' : 'Password is now hidden';
    this.accessibilityService.announceToScreenReader(message);
  }

  /// <summary>
  /// Gets form field error message
  /// </summary>
  /// <param name="fieldName">Name of the form field</param>
  /// <returns>Error message or empty string</returns>
  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (field.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    return 'Invalid input';
  }

  /// <summary>
  /// Gets user-friendly label for form field
  /// </summary>
  /// <param name="fieldName">Name of the form field</param>
  /// <returns>User-friendly label</returns>
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      username: 'Username',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }

  /// <summary>
  /// Creates the reactive form for login
  /// </summary>
  /// <returns>FormGroup for login</returns>
  private createLoginForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  /// <summary>
  /// Sets up form validation and accessibility
  /// </summary>
  private setupFormValidation(): void {
    // Real-time validation announcements
    this.loginForm.statusChanges.subscribe(status => {
      if (status === 'INVALID' && this.loginForm.touched) {
        const errors = this.getFormErrors();
        if (errors.length > 0) {
          this.accessibilityService.announceToScreenReader(`Form has errors: ${errors.join(', ')}`);
        }
      }
    });
  }

  /// <summary>
  /// Gets all form errors as an array of strings
  /// </summary>
  /// <returns>Array of error messages</returns>
  private getFormErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.loginForm.controls).forEach(key => {
      const error = this.getFieldError(key);
      if (error) {
        errors.push(error);
      }
    });
    return errors;
  }

  /// <summary>
  /// Marks all form fields as touched to show validation errors
  /// </summary>
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
