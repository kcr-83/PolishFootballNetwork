import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { AccessibilityService } from '../services/accessibility.service';

/// <summary>
/// Interface for keyboard shortcut definition.
/// </summary>
interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
  action?: () => void;
}

/// <summary>
/// Component displaying keyboard shortcuts help dialog.
/// Provides comprehensive list of available shortcuts and accessibility features.
/// </summary>
@Component({
  selector: 'app-keyboard-shortcuts',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <div class="keyboard-shortcuts-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon class="header-icon">keyboard</mat-icon>
        <h2>Keyboard Shortcuts</h2>
        <button 
          mat-icon-button 
          mat-dialog-close
          class="close-button"
          aria-label="Close keyboard shortcuts dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="dialog-content">
        <div class="shortcuts-intro">
          <p>Use these keyboard shortcuts to navigate the admin panel efficiently.</p>
          <p class="accessibility-note">
            <mat-icon>accessibility</mat-icon>
            All shortcuts are screen reader friendly and follow WCAG guidelines.
          </p>
        </div>

        <div class="shortcuts-sections">
          @for (category of categories(); track category) {
            <div class="shortcut-category">
              <h3 class="category-title">{{ category }}</h3>
              <mat-list class="shortcuts-list">
                @for (shortcut of getShortcutsForCategory(category); track shortcut.description) {
                  <mat-list-item class="shortcut-item">
                    <div class="shortcut-content">
                      <div class="shortcut-keys">
                        @for (key of shortcut.keys; track key; let last = $last) {
                          <mat-chip class="key-chip">{{ key }}</mat-chip>
                          @if (!last) {
                            <span class="key-separator">+</span>
                          }
                        }
                      </div>
                      <div class="shortcut-description">
                        {{ shortcut.description }}
                      </div>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
              @if (!$last) {
                <mat-divider></mat-divider>
              }
            </div>
          }
        </div>

        <div class="accessibility-features">
          <h3>Accessibility Features</h3>
          <div class="feature-grid">
            <div class="feature-item">
              <mat-icon>high_quality</mat-icon>
              <div class="feature-content">
                <h4>High Contrast</h4>
                <p>Toggle high contrast mode for better visibility</p>
                <button 
                  mat-stroked-button 
                  (click)="toggleHighContrast()"
                  [class.active]="accessibilityService.highContrastMode()">
                  {{ accessibilityService.highContrastMode() ? 'Disable' : 'Enable' }}
                </button>
              </div>
            </div>

            <div class="feature-item">
              <mat-icon>text_fields</mat-icon>
              <div class="feature-content">
                <h4>Font Size</h4>
                <p>Adjust text size for better readability</p>
                <div class="font-size-buttons">
                  <button 
                    mat-stroked-button 
                    (click)="setFontSize('normal')"
                    [class.active]="accessibilityService.fontSize() === 'normal'">
                    Normal
                  </button>
                  <button 
                    mat-stroked-button 
                    (click)="setFontSize('large')"
                    [class.active]="accessibilityService.fontSize() === 'large'">
                    Large
                  </button>
                  <button 
                    mat-stroked-button 
                    (click)="setFontSize('extra-large')"
                    [class.active]="accessibilityService.fontSize() === 'extra-large'">
                    Extra Large
                  </button>
                </div>
              </div>
            </div>

            <div class="feature-item">
              <mat-icon>motion_photos_off</mat-icon>
              <div class="feature-content">
                <h4>Reduced Motion</h4>
                <p>System setting: {{ accessibilityService.reducedMotion() ? 'Enabled' : 'Disabled' }}</p>
                <small>This is controlled by your system preferences</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close>Close</button>
        <button 
          mat-raised-button 
          color="primary"
          (click)="openAccessibilitySettings()">
          More Accessibility Settings
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./keyboard-shortcuts.component.scss']
})
export class KeyboardShortcutsComponent {
  readonly accessibilityService = inject(AccessibilityService);
  private readonly dialogRef = inject(MatDialogRef<KeyboardShortcutsComponent>);

  readonly shortcuts = signal<KeyboardShortcut[]>([
    // Navigation
    { keys: ['Ctrl', 'B'], description: 'Toggle navigation menu', category: 'Navigation' },
    { keys: ['Ctrl', '/'], description: 'Focus search input', category: 'Navigation' },
    { keys: ['Ctrl', 'H'], description: 'Go to dashboard', category: 'Navigation' },
    { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'Navigation' },
    { keys: ['Esc'], description: 'Close dialog/menu/focus', category: 'Navigation' },
    
    // Content
    { keys: ['Tab'], description: 'Move to next element', category: 'Content' },
    { keys: ['Shift', 'Tab'], description: 'Move to previous element', category: 'Content' },
    { keys: ['Enter'], description: 'Activate button/link', category: 'Content' },
    { keys: ['Space'], description: 'Activate button/checkbox', category: 'Content' },
    { keys: ['↑', '↓'], description: 'Navigate lists', category: 'Content' },
    { keys: ['←', '→'], description: 'Navigate tabs/pagination', category: 'Content' },
    
    // Tables and Grids
    { keys: ['↑', '↓', '←', '→'], description: 'Navigate grid cells', category: 'Tables' },
    { keys: ['Home'], description: 'Go to first cell in row', category: 'Tables' },
    { keys: ['End'], description: 'Go to last cell in row', category: 'Tables' },
    { keys: ['Ctrl', 'Home'], description: 'Go to first cell in table', category: 'Tables' },
    { keys: ['Ctrl', 'End'], description: 'Go to last cell in table', category: 'Tables' },
    { keys: ['Page Up'], description: 'Previous page of data', category: 'Tables' },
    { keys: ['Page Down'], description: 'Next page of data', category: 'Tables' },
    
    // Forms
    { keys: ['Ctrl', 'S'], description: 'Save form', category: 'Forms' },
    { keys: ['Ctrl', 'Enter'], description: 'Submit form', category: 'Forms' },
    { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Forms' },
    { keys: ['Ctrl', 'Y'], description: 'Redo', category: 'Forms' },
    { keys: ['F2'], description: 'Enter edit mode', category: 'Forms' },
    
    // Accessibility
    { keys: ['Alt', 'Shift', 'C'], description: 'Toggle high contrast', category: 'Accessibility' },
    { keys: ['Alt', 'Shift', 'T'], description: 'Increase font size', category: 'Accessibility' },
    { keys: ['Alt', 'Shift', 'R'], description: 'Reset font size', category: 'Accessibility' },
    { keys: ['F1'], description: 'Open help/shortcuts', category: 'Accessibility' },
    
    // Admin Specific
    { keys: ['Ctrl', 'Shift', 'U'], description: 'Go to user management', category: 'Admin' },
    { keys: ['Ctrl', 'Shift', 'C'], description: 'Go to club management', category: 'Admin' },
    { keys: ['Ctrl', 'Shift', 'N'], description: 'Go to connection management', category: 'Admin' },
    { keys: ['Ctrl', 'Shift', 'S'], description: 'Go to system settings', category: 'Admin' },
    { keys: ['Ctrl', 'Shift', 'L'], description: 'View system logs', category: 'Admin' }
  ]);

  readonly categories = signal<string[]>([
    'Navigation',
    'Content',
    'Tables',
    'Forms',
    'Admin',
    'Accessibility'
  ]);

  /// <summary>
  /// Get shortcuts for a specific category.
  /// </summary>
  /// <param name="category">Category name</param>
  /// <returns>Array of shortcuts for the category</returns>
  getShortcutsForCategory(category: string): KeyboardShortcut[] {
    return this.shortcuts().filter(shortcut => shortcut.category === category);
  }

  /// <summary>
  /// Toggle high contrast mode.
  /// </summary>
  toggleHighContrast(): void {
    this.accessibilityService.toggleHighContrast();
  }

  /// <summary>
  /// Set font size preference.
  /// </summary>
  /// <param name="size">Font size setting</param>
  setFontSize(size: 'normal' | 'large' | 'extra-large'): void {
    this.accessibilityService.setFontSize(size);
  }

  /// <summary>
  /// Open accessibility settings dialog.
  /// </summary>
  openAccessibilitySettings(): void {
    // Placeholder for opening detailed accessibility settings
    this.accessibilityService.announce('Accessibility settings dialog would open here');
    this.dialogRef.close();
  }
}