import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/// <summary>
/// Interface for breadcrumb items.
/// </summary>
interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  isActive: boolean;
}

/// <summary>
/// Breadcrumb navigation component.
/// Displays hierarchical navigation path with clickable links.
/// </summary>
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <nav class="breadcrumb-navigation" role="navigation" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        @for (item of items; track item.label; let i = $index) {
          <li class="breadcrumb-item" [class.active]="item.isActive">
            @if (!item.isActive && item.url) {
              <!-- Clickable breadcrumb -->
              <button
                mat-button
                class="breadcrumb-link"
                (click)="navigateTo(item.url)"
                [matTooltip]="getTooltip(item)"
                matTooltipPosition="below"
                [attr.aria-label]="'Navigate to ' + item.label">

                @if (item.icon && i === 0) {
                  <mat-icon class="breadcrumb-icon">{{ item.icon }}</mat-icon>
                }
                <span class="breadcrumb-text">{{ item.label }}</span>
              </button>
            } @else {
              <!-- Current page (non-clickable) -->
              <span class="breadcrumb-current" [attr.aria-current]="'page'">
                @if (item.icon && i === 0) {
                  <mat-icon class="breadcrumb-icon">{{ item.icon }}</mat-icon>
                }
                <span class="breadcrumb-text">{{ item.label }}</span>
              </span>
            }

            @if (!item.isActive && i < items.length - 1) {
              <mat-icon class="breadcrumb-separator" aria-hidden="true">
                chevron_right
              </mat-icon>
            }
          </li>
        }
      </ol>

      <!-- Quick Actions -->
      <div class="breadcrumb-actions">
        <button
          mat-icon-button
          class="action-button"
          (click)="goBack()"
          matTooltip="Go back"
          matTooltipPosition="below"
          aria-label="Go back to previous page">
          <mat-icon>arrow_back</mat-icon>
        </button>

        <button
          mat-icon-button
          class="action-button"
          (click)="refresh()"
          matTooltip="Refresh page"
          matTooltipPosition="below"
          aria-label="Refresh current page">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </nav>
  `,
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];

  private readonly router = inject(Router);

  /// <summary>
  /// Navigate to specified URL.
  /// </summary>
  navigateTo(url: string): void {
    this.router.navigate([url]);
  }

  /// <summary>
  /// Go back to previous page.
  /// </summary>
  goBack(): void {
    window.history.back();
  }

  /// <summary>
  /// Refresh current page.
  /// </summary>
  refresh(): void {
    window.location.reload();
  }

  /// <summary>
  /// Get tooltip text for breadcrumb item.
  /// </summary>
  getTooltip(item: BreadcrumbItem): string {
    return `Navigate to ${item.label}`;
  }
}
