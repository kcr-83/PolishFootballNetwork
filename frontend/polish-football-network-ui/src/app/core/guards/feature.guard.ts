import { CanActivateFn, CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Interface for components that can have unsaved changes
 */
export interface CanComponentDeactivate {
  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean;
  hasUnsavedChanges?(): boolean;
}

/**
 * Unsaved changes guard - prevents navigation away from forms with unsaved changes
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (component.canDeactivate) {
    return component.canDeactivate();
  }

  // If component doesn't implement canDeactivate, check hasUnsavedChanges
  if (component.hasUnsavedChanges && component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Are you sure you want to leave this page?');
  }

  return true;
};

/**
 * Confirmation guard factory - creates guards that show confirmation dialogs
 */
export function createConfirmationGuard(message: string): CanDeactivateFn<unknown> {
  return () => {
    return confirm(message);
  };
}

/**
 * Feature flag guard factory - creates guards based on feature flags
 */
export function createFeatureGuard(featureName: string): CanActivateFn {
  return () => {
    const notificationService = inject(NotificationService);

    // Placeholder logic - in a real app, this would check feature flags
    // from environment or a feature flag service
    const isFeatureEnabled = true; // Replace with actual feature flag logic

    if (!isFeatureEnabled) {
      notificationService.warning(`This feature is currently not available.`);
      return false;
    }

    return true;
  };
}

/**
 * Maintenance mode guard - blocks access during maintenance
 */
export const maintenanceGuard: CanActivateFn = () => {
  const notificationService = inject(NotificationService);

  // In a real application, this would check a maintenance flag
  const isInMaintenance = false; // This would come from configuration

  if (isInMaintenance) {
    notificationService.warning('The application is currently under maintenance. Please try again later.');
    return false;
  }

  return true;
};

/**
 * Development only guard - restricts access to development-only features
 */
export const devOnlyGuard: CanActivateFn = () => {
  const notificationService = inject(NotificationService);

  // Simple check for development mode
  const isDevelopment = !window.location.hostname.includes('production-domain.com');

  if (!isDevelopment) {
    notificationService.error('This feature is only available in development mode.');
    return false;
  }

  return true;
};
