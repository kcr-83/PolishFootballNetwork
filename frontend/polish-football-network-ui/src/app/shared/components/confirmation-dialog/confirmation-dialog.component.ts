import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DialogType = 'confirm' | 'warn' | 'danger' | 'info';
export type DialogSize = 'small' | 'medium' | 'large';

export interface DialogButton {
  readonly label: string;
  readonly action: string;
  readonly type?: 'primary' | 'secondary' | 'danger' | 'text';
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

export interface DialogConfig {
  readonly title: string;
  readonly message: string;
  readonly type?: DialogType;
  readonly size?: DialogSize;
  readonly icon?: string;
  readonly buttons?: DialogButton[];
  readonly showCloseButton?: boolean;
  readonly backdrop?: boolean;
  readonly keyboard?: boolean;
}

/**
 * Standalone confirmation dialog component
 * Provides consistent dialog interface for confirmations, warnings, and information
 */
@Component({
  selector: 'pfn-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div
        class="pfn-dialog-backdrop"
        [class.pfn-dialog-backdrop--no-close]="!backdrop"
        (click)="onBackdropClick()"
        [attr.data-testid]="'dialog-backdrop'"
      >
        <div
          class="pfn-dialog"
          [class]="getDialogClasses()"
          (click)="$event.stopPropagation()"
          role="dialog"
          [attr.aria-labelledby]="'dialog-title-' + dialogId"
          [attr.aria-describedby]="'dialog-content-' + dialogId"
          aria-modal="true"
        >
          <!-- Dialog Header -->
          <div class="pfn-dialog-header">
            @if (config?.icon) {
              <div class="pfn-dialog-icon">
                <i [class]="config?.icon" aria-hidden="true"></i>
              </div>
            } @else {
              <div class="pfn-dialog-icon">
                @switch (config?.type) {
                  @case ('confirm') {
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  }
                  @case ('warn') {
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                  }
                  @case ('danger') {
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                    </svg>
                  }
                  @case ('info') {
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                  }
                }
              </div>
            }

            <div class="pfn-dialog-title-section">
              <h2
                class="pfn-dialog-title"
                [id]="'dialog-title-' + dialogId"
              >
                {{ config?.title || title }}
              </h2>

              @if (config?.showCloseButton !== false && showCloseButton) {
                <button
                  type="button"
                  class="pfn-dialog-close"
                  (click)="onClose()"
                  [attr.aria-label]="'Close dialog'"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              }
            </div>
          </div>

          <!-- Dialog Content -->
          <div class="pfn-dialog-content">
            <div
              class="pfn-dialog-message"
              [id]="'dialog-content-' + dialogId"
            >
              {{ config?.message || message }}
            </div>

            <!-- Custom content slot -->
            <ng-content></ng-content>
          </div>

          <!-- Dialog Actions -->
          <div class="pfn-dialog-actions">
            @if (config && config.buttons && config.buttons.length > 0) {
              @for (button of config.buttons; track button.action) {
                <button
                  type="button"
                  [class]="getButtonClasses(button)"
                  [disabled]="button.disabled || button.loading"
                  (click)="onButtonClick(button.action)"
                  [attr.data-testid]="'dialog-button-' + button.action"
                >
                  @if (button.loading) {
                    <span class="pfn-button-spinner"></span>
                  }
                  {{ button.label }}
                </button>
              }
            } @else {
              <!-- Default buttons -->
              @if (type === 'confirm') {
                <button
                  type="button"
                  class="pfn-dialog-button pfn-dialog-button--secondary"
                  (click)="onCancel()"
                  [disabled]="loading"
                  data-testid="dialog-cancel-button"
                >
                  {{ cancelText }}
                </button>
                <button
                  type="button"
                  class="pfn-dialog-button pfn-dialog-button--primary"
                  (click)="onConfirm()"
                  [disabled]="loading"
                  data-testid="dialog-confirm-button"
                >
                  @if (loading) {
                    <span class="pfn-button-spinner"></span>
                  }
                  {{ confirmText }}
                </button>
              } @else {
                <button
                  type="button"
                  class="pfn-dialog-button pfn-dialog-button--primary"
                  (click)="onConfirm()"
                  [disabled]="loading"
                  data-testid="dialog-ok-button"
                >
                  @if (loading) {
                    <span class="pfn-button-spinner"></span>
                  }
                  OK
                </button>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .pfn-dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: pfn-backdrop-enter 0.15s ease-out;
      backdrop-filter: blur(2px);
    }

    .pfn-dialog-backdrop--no-close {
      pointer-events: none;
    }

    .pfn-dialog-backdrop--no-close .pfn-dialog {
      pointer-events: all;
    }

    @keyframes pfn-backdrop-enter {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .pfn-dialog {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: pfn-dialog-enter 0.2s ease-out;
      margin: 1rem;
    }

    @keyframes pfn-dialog-enter {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .pfn-dialog--small {
      width: 100%;
      max-width: 400px;
    }

    .pfn-dialog--medium {
      width: 100%;
      max-width: 500px;
    }

    .pfn-dialog--large {
      width: 100%;
      max-width: 700px;
    }

    .pfn-dialog--confirm .pfn-dialog-icon {
      color: #17a2b8;
    }

    .pfn-dialog--warn .pfn-dialog-icon {
      color: #ffc107;
    }

    .pfn-dialog--danger .pfn-dialog-icon {
      color: #dc3545;
    }

    .pfn-dialog--info .pfn-dialog-icon {
      color: #17a2b8;
    }

    .pfn-dialog-header {
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      border-bottom: 1px solid #e9ecef;
    }

    .pfn-dialog-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      margin-top: 0.125rem;
    }

    .pfn-dialog-icon svg {
      width: 100%;
      height: 100%;
    }

    .pfn-dialog-title-section {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      min-width: 0;
    }

    .pfn-dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.3;
      color: #212529;
    }

    .pfn-dialog-close {
      background: none;
      border: none;
      padding: 0.25rem;
      color: #6c757d;
      cursor: pointer;
      border-radius: 4px;
      margin-left: 1rem;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .pfn-dialog-close:hover {
      color: #495057;
      background-color: #f8f9fa;
    }

    .pfn-dialog-close:focus {
      outline: 2px solid #0d6efd;
      outline-offset: 2px;
    }

    .pfn-dialog-content {
      padding: 1rem 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .pfn-dialog-message {
      line-height: 1.5;
      color: #495057;
      margin-bottom: 1rem;
    }

    .pfn-dialog-message:last-child {
      margin-bottom: 0;
    }

    .pfn-dialog-actions {
      padding: 1rem 1.5rem 1.5rem 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      border-top: 1px solid #e9ecef;
    }

    .pfn-dialog-button {
      padding: 0.5rem 1rem;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 80px;
      justify-content: center;
    }

    .pfn-dialog-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pfn-dialog-button--primary {
      background-color: #0d6efd;
      color: white;
      border-color: #0d6efd;
    }

    .pfn-dialog-button--primary:hover:not(:disabled) {
      background-color: #0b5ed7;
      border-color: #0a58ca;
    }

    .pfn-dialog-button--secondary {
      background-color: #6c757d;
      color: white;
      border-color: #6c757d;
    }

    .pfn-dialog-button--secondary:hover:not(:disabled) {
      background-color: #5c636a;
      border-color: #565e64;
    }

    .pfn-dialog-button--danger {
      background-color: #dc3545;
      color: white;
      border-color: #dc3545;
    }

    .pfn-dialog-button--danger:hover:not(:disabled) {
      background-color: #c82333;
      border-color: #bd2130;
    }

    .pfn-dialog-button--text {
      background-color: transparent;
      color: #6c757d;
      border-color: transparent;
    }

    .pfn-dialog-button--text:hover:not(:disabled) {
      color: #495057;
      background-color: #f8f9fa;
    }

    .pfn-button-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: pfn-spin 1s linear infinite;
    }

    @keyframes pfn-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 576px) {
      .pfn-dialog {
        margin: 0.5rem;
        max-height: 95vh;
      }

      .pfn-dialog-header {
        padding: 1rem 1rem 0.75rem 1rem;
      }

      .pfn-dialog-content {
        padding: 0.75rem 1rem;
      }

      .pfn-dialog-actions {
        padding: 0.75rem 1rem 1rem 1rem;
        flex-direction: column-reverse;
      }

      .pfn-dialog-button {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationDialogComponent {
  /**
   * Whether the dialog is visible
   */
  @Input() visible: boolean = false;

  /**
   * Dialog title (used if config not provided)
   */
  @Input() title: string = 'Confirm';

  /**
   * Dialog message (used if config not provided)
   */
  @Input() message: string = 'Are you sure?';

  /**
   * Dialog type for styling
   */
  @Input() type: DialogType = 'confirm';

  /**
   * Dialog size
   */
  @Input() size: DialogSize = 'medium';

  /**
   * Complete dialog configuration
   */
  @Input() config?: DialogConfig;

  /**
   * Whether to show close button
   */
  @Input() showCloseButton: boolean = true;

  /**
   * Whether clicking backdrop closes dialog
   */
  @Input() backdrop: boolean = true;

  /**
   * Whether escape key closes dialog
   */
  @Input() keyboard: boolean = true;

  /**
   * Whether dialog action is in progress
   */
  @Input() loading: boolean = false;

  /**
   * Confirm button text
   */
  @Input() confirmText: string = 'Confirm';

  /**
   * Cancel button text
   */
  @Input() cancelText: string = 'Cancel';

  /**
   * Event emitted when dialog is confirmed
   */
  @Output() confirmed = new EventEmitter<void>();

  /**
   * Event emitted when dialog is cancelled
   */
  @Output() cancelled = new EventEmitter<void>();

  /**
   * Event emitted when dialog is closed
   */
  @Output() closed = new EventEmitter<void>();

  /**
   * Event emitted when custom button is clicked
   */
  @Output() buttonClicked = new EventEmitter<string>();

  /**
   * Unique dialog identifier for accessibility
   */
  readonly dialogId: string = Math.random().toString(36).substr(2, 9);

  /**
   * Handle backdrop click
   */
  onBackdropClick(): void {
    if (this.backdrop) {
      this.onCancel();
    }
  }

  /**
   * Handle confirm action
   */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Handle close action
   */
  onClose(): void {
    this.closed.emit();
  }

  /**
   * Handle custom button click
   */
  onButtonClick(action: string): void {
    this.buttonClicked.emit(action);
  }

  /**
   * Get dialog CSS classes
   */
  getDialogClasses(): string {
    const classes = ['pfn-dialog'];

    const dialogType = this.config?.type || this.type;
    const dialogSize = this.config?.size || this.size;

    classes.push(`pfn-dialog--${dialogSize}`);
    classes.push(`pfn-dialog--${dialogType}`);

    return classes.join(' ');
  }

  /**
   * Get button CSS classes
   */
  getButtonClasses(button: DialogButton): string {
    const classes = ['pfn-dialog-button'];

    const buttonType = button.type || 'primary';
    classes.push(`pfn-dialog-button--${buttonType}`);

    return classes.join(' ');
  }
}
