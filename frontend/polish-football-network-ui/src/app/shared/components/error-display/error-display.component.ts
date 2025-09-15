import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErrorType = 'error' | 'warning' | 'info';

export interface ErrorDetails {
  readonly message: string;
  readonly code?: string;
  readonly details?: string;
  readonly timestamp?: Date;
  readonly correlationId?: string;
}

/**
 * Standalone error display component with retry functionality
 */
@Component({
  selector: 'pfn-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="pfn-error-display"
      [class]="getErrorClasses()"
      [attr.data-testid]="'error-display'"
      role="alert"
    >
      <div class="pfn-error-icon">
        @switch (type) {
          @case ('error') {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          }
          @case ('warning') {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          }
          @case ('info') {
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          }
        }
      </div>

      <div class="pfn-error-content">
        <div class="pfn-error-header">
          <h3 class="pfn-error-title">{{ getErrorTitle() }}</h3>
          @if (error?.timestamp) {
            <span class="pfn-error-timestamp">
              {{ error?.timestamp | date:'short' }}
            </span>
          }
        </div>

        <div class="pfn-error-message">{{ error?.message || message }}</div>

        @if (showDetails && (error?.details || error?.code || error?.correlationId)) {
          <div class="pfn-error-details">
            @if (error?.code) {
              <div class="pfn-error-detail">
                <strong>Error Code:</strong> {{ error?.code }}
              </div>
            }
            @if (error?.details) {
              <div class="pfn-error-detail">
                <strong>Details:</strong> {{ error?.details }}
              </div>
            }
            @if (error?.correlationId) {
              <div class="pfn-error-detail">
                <strong>Correlation ID:</strong>
                <code>{{ error?.correlationId }}</code>
              </div>
            }
          </div>
        }

        <div class="pfn-error-actions">
          @if (showRetry) {
            <button
              type="button"
              class="pfn-error-button pfn-error-button--primary"
              (click)="onRetry()"
              [disabled]="retrying"
            >
              @if (retrying) {
                <span class="pfn-button-spinner"></span>
                Retrying...
              } @else {
                Retry
              }
            </button>
          }

          @if (showDetails && !detailsExpanded && (error?.details || error?.code || error?.correlationId)) {
            <button
              type="button"
              class="pfn-error-button pfn-error-button--secondary"
              (click)="toggleDetails()"
            >
              Show Details
            </button>
          } @else if (showDetails && detailsExpanded && (error?.details || error?.code || error?.correlationId)) {
            <button
              type="button"
              class="pfn-error-button pfn-error-button--secondary"
              (click)="toggleDetails()"
            >
              Hide Details
            </button>
          }

          @if (dismissible) {
            <button
              type="button"
              class="pfn-error-button pfn-error-button--text"
              (click)="onDismiss()"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pfn-error-display {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid;
      background-color: #fff;
    }

    .pfn-error-display--error {
      border-color: #dc3545;
      background-color: #f8d7da;
      color: #721c24;
    }

    .pfn-error-display--warning {
      border-color: #ffc107;
      background-color: #fff3cd;
      color: #856404;
    }

    .pfn-error-display--info {
      border-color: #17a2b8;
      background-color: #d1ecf1;
      color: #0c5460;
    }

    .pfn-error-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }

    .pfn-error-icon svg {
      width: 100%;
      height: 100%;
    }

    .pfn-error-content {
      flex: 1;
      min-width: 0;
    }

    .pfn-error-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .pfn-error-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.25;
    }

    .pfn-error-timestamp {
      font-size: 0.75rem;
      opacity: 0.8;
      white-space: nowrap;
    }

    .pfn-error-message {
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .pfn-error-details {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 0.25rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .pfn-error-detail {
      margin-bottom: 0.5rem;
    }

    .pfn-error-detail:last-child {
      margin-bottom: 0;
    }

    .pfn-error-detail code {
      background-color: rgba(0, 0, 0, 0.1);
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
      font-family: 'Courier New', monospace;
      font-size: 0.8em;
    }

    .pfn-error-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .pfn-error-button {
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      border: 1px solid;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pfn-error-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pfn-error-button--primary {
      background-color: #007bff;
      border-color: #007bff;
      color: white;
    }

    .pfn-error-button--primary:hover:not(:disabled) {
      background-color: #0056b3;
      border-color: #0056b3;
    }

    .pfn-error-button--secondary {
      background-color: transparent;
      border-color: currentColor;
      color: inherit;
    }

    .pfn-error-button--secondary:hover:not(:disabled) {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .pfn-error-button--text {
      background-color: transparent;
      border-color: transparent;
      color: inherit;
      opacity: 0.8;
    }

    .pfn-error-button--text:hover:not(:disabled) {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.05);
    }

    .pfn-button-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorDisplayComponent {
  /**
   * Error type for styling
   */
  @Input() type: ErrorType = 'error';

  /**
   * Simple error message (used if error object not provided)
   */
  @Input() message?: string;

  /**
   * Detailed error object
   */
  @Input() error?: ErrorDetails;

  /**
   * Whether to show retry button
   */
  @Input() showRetry: boolean = true;

  /**
   * Whether error can be dismissed
   */
  @Input() dismissible: boolean = true;

  /**
   * Whether to show error details
   */
  @Input() showDetails: boolean = true;

  /**
   * Whether retry is in progress
   */
  @Input() retrying: boolean = false;

  /**
   * Event emitted when retry is clicked
   */
  @Output() retry = new EventEmitter<void>();

  /**
   * Event emitted when dismiss is clicked
   */
  @Output() dismiss = new EventEmitter<void>();

  /**
   * Whether details are expanded
   */
  detailsExpanded: boolean = false;

  /**
   * Get error title based on type
   */
  getErrorTitle(): string {
    switch (this.type) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Error';
    }
  }

  /**
   * Get CSS classes for error display
   */
  getErrorClasses(): string {
    return `pfn-error-display--${this.type}`;
  }

  /**
   * Handle retry button click
   */
  onRetry(): void {
    this.retry.emit();
  }

  /**
   * Handle dismiss button click
   */
  onDismiss(): void {
    this.dismiss.emit();
  }

  /**
   * Toggle details visibility
   */
  toggleDetails(): void {
    this.detailsExpanded = !this.detailsExpanded;
  }
}
