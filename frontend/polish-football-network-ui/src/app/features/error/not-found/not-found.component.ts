import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * 404 Not Found error page component
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-container">
      <div class="error-content">
        <div class="error-icon">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>

        <div class="error-actions">
          <a routerLink="/dashboard" class="btn btn-primary">
            Go to Dashboard
          </a>
          <button type="button" class="btn btn-secondary" (click)="goBack()">
            Go Back
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
      background: #f5f5f5;
    }

    .error-content {
      max-width: 500px;
    }

    .error-icon {
      font-size: 6rem;
      font-weight: bold;
      color: #f44336;
      margin-bottom: 1rem;
    }

    h1 {
      color: #333;
      margin-bottom: 1rem;
    }

    p {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #1976d2;
      color: white;
    }

    .btn-primary:hover {
      background: #1565c0;
    }

    .btn-secondary {
      background: #666;
      color: white;
    }

    .btn-secondary:hover {
      background: #555;
    }
  `]
})
export class NotFoundComponent {
  /**
   * Navigate back to previous page
   */
  goBack(): void {
    window.history.back();
  }
}
