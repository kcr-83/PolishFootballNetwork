/**
 * Shared Components for the Polish Football Network application
 *
 * These components provide reusable UI elements:
 * - LoadingSpinnerComponent: Loading states with multiple animation types
 * - ErrorDisplayComponent: Error handling with retry functionality
 * - ConfirmationDialogComponent: Modal dialogs for confirmations and warnings
 * - NavigationComponent: Application navigation with role-based access
 */

// Loading and feedback components
export { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
export { ErrorDisplayComponent, type ErrorType, type ErrorDetails } from './error-display/error-display.component';

// Dialog components
export {
  ConfirmationDialogComponent,
  type DialogType,
  type DialogSize,
  type DialogButton,
  type DialogConfig
} from './confirmation-dialog/confirmation-dialog.component';

// Navigation components
export {
  NavigationComponent,
  type NavigationItem,
  type UserInfo
} from './navigation/navigation.component';

/**
 * Array of all shared components for easy import
 * TODO: Import and add components to array as needed
 */
export const SHARED_COMPONENTS = [
  // Add components here when needed for module imports
] as const;
