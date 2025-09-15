import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingSize = 'small' | 'medium' | 'large';
export type LoadingType = 'spinner' | 'dots' | 'bars';

/**
 * Standalone loading spinner component with customizable appearance
 */
@Component({
  selector: 'pfn-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="pfn-loading-spinner"
      [class]="getSpinnerClasses()"
      [attr.aria-label]="message || 'Loading'"
      role="status"
      [attr.data-testid]="'loading-spinner'"
    >
      @switch (type) {
        @case ('spinner') {
          <div class="pfn-spinner">
            <div class="pfn-spinner-circle"></div>
          </div>
        }
        @case ('dots') {
          <div class="pfn-dots">
            <div class="pfn-dot"></div>
            <div class="pfn-dot"></div>
            <div class="pfn-dot"></div>
          </div>
        }
        @case ('bars') {
          <div class="pfn-bars">
            <div class="pfn-bar"></div>
            <div class="pfn-bar"></div>
            <div class="pfn-bar"></div>
            <div class="pfn-bar"></div>
            <div class="pfn-bar"></div>
          </div>
        }
      }

      @if (showMessage && message) {
        <div class="pfn-loading-message">{{ message }}</div>
      }
    </div>
  `,
  styles: [`
    .pfn-loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .pfn-loading-spinner--center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .pfn-loading-spinner--overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(2px);
      z-index: 9999;
    }

    /* Spinner Animation */
    .pfn-spinner {
      display: inline-block;
    }

    .pfn-spinner-circle {
      width: var(--spinner-size, 2rem);
      height: var(--spinner-size, 2rem);
      border: 2px solid #f3f3f3;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Dots Animation */
    .pfn-dots {
      display: flex;
      gap: 0.25rem;
    }

    .pfn-dot {
      width: var(--dot-size, 0.5rem);
      height: var(--dot-size, 0.5rem);
      background-color: #007bff;
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite both;
    }

    .pfn-dot:nth-child(1) { animation-delay: -0.32s; }
    .pfn-dot:nth-child(2) { animation-delay: -0.16s; }
    .pfn-dot:nth-child(3) { animation-delay: 0s; }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    /* Bars Animation */
    .pfn-bars {
      display: flex;
      gap: 0.125rem;
      align-items: end;
    }

    .pfn-bar {
      width: var(--bar-width, 0.25rem);
      height: var(--bar-height, 1.5rem);
      background-color: #007bff;
      animation: bars 1.2s ease-in-out infinite;
    }

    .pfn-bar:nth-child(1) { animation-delay: -1.1s; }
    .pfn-bar:nth-child(2) { animation-delay: -1.0s; }
    .pfn-bar:nth-child(3) { animation-delay: -0.9s; }
    .pfn-bar:nth-child(4) { animation-delay: -0.8s; }
    .pfn-bar:nth-child(5) { animation-delay: -0.7s; }

    @keyframes bars {
      0%, 40%, 100% {
        transform: scaleY(0.4);
      }
      20% {
        transform: scaleY(1.0);
      }
    }

    /* Size variants */
    .pfn-loading-spinner--small {
      --spinner-size: 1.25rem;
      --dot-size: 0.375rem;
      --bar-width: 0.1875rem;
      --bar-height: 1rem;
    }

    .pfn-loading-spinner--medium {
      --spinner-size: 2rem;
      --dot-size: 0.5rem;
      --bar-width: 0.25rem;
      --bar-height: 1.5rem;
    }

    .pfn-loading-spinner--large {
      --spinner-size: 3rem;
      --dot-size: 0.75rem;
      --bar-width: 0.375rem;
      --bar-height: 2rem;
    }

    .pfn-loading-message {
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
      max-width: 200px;
    }

    /* Color variants */
    .pfn-loading-spinner--primary .pfn-spinner-circle {
      border-top-color: #007bff;
    }

    .pfn-loading-spinner--primary .pfn-dot,
    .pfn-loading-spinner--primary .pfn-bar {
      background-color: #007bff;
    }

    .pfn-loading-spinner--success .pfn-spinner-circle {
      border-top-color: #28a745;
    }

    .pfn-loading-spinner--success .pfn-dot,
    .pfn-loading-spinner--success .pfn-bar {
      background-color: #28a745;
    }

    .pfn-loading-spinner--warning .pfn-spinner-circle {
      border-top-color: #ffc107;
    }

    .pfn-loading-spinner--warning .pfn-dot,
    .pfn-loading-spinner--warning .pfn-bar {
      background-color: #ffc107;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  /**
   * Type of loading animation
   */
  @Input() type: LoadingType = 'spinner';

  /**
   * Size of the loading spinner
   */
  @Input() size: LoadingSize = 'medium';

  /**
   * Loading message to display
   */
  @Input() message?: string;

  /**
   * Whether to show the message
   */
  @Input() showMessage: boolean = true;

  /**
   * Whether to center the spinner
   */
  @Input() center: boolean = false;

  /**
   * Whether to show as overlay
   */
  @Input() overlay: boolean = false;

  /**
   * Color variant
   */
  @Input() color: 'primary' | 'success' | 'warning' = 'primary';

  /**
   * Get CSS classes for the spinner
   */
  getSpinnerClasses(): string {
    const classes = [`pfn-loading-spinner--${this.size}`];

    if (this.center) {
      classes.push('pfn-loading-spinner--center');
    }

    if (this.overlay) {
      classes.push('pfn-loading-spinner--overlay');
    }

    classes.push(`pfn-loading-spinner--${this.color}`);

    return classes.join(' ');
  }
}
