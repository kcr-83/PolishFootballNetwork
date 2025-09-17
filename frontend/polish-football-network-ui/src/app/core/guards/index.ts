/**
 * Route Guards for the Polish Football Network application
 *
 * These guards handle route protection and access control:
 * - Authentication guards: Protect routes requiring login
 * - Role-based guards: Restrict access based on user roles
 * - Feature guards: Control access to features and prevent data loss
 */

// Authentication guards
export { authGuard, guestGuard } from './auth.guard';

// Role-based guards
export {
  adminGuard,
  superAdminGuard,
  clubAdminGuard,
  createRoleGuard
} from './role.guard';

// Feature and utility guards
export {
  unsavedChangesGuard,
  createConfirmationGuard,
  createFeatureGuard,
  maintenanceGuard,
  devOnlyGuard,
  type CanComponentDeactivate
} from './feature.guard';

// Import all guards for the Guards object
import { authGuard, guestGuard } from './auth.guard';
import { adminGuard, superAdminGuard, clubAdminGuard } from './role.guard';
import { unsavedChangesGuard, maintenanceGuard, devOnlyGuard } from './feature.guard';

/**
 * Common guard combinations for easy reuse
 */
export const Guards = {
  // Authentication
  auth: authGuard,
  guest: guestGuard,

  // Role-based
  admin: adminGuard,
  superAdmin: superAdminGuard,
  clubAdmin: clubAdminGuard,

  // Feature controls
  unsavedChanges: unsavedChangesGuard,
  maintenance: maintenanceGuard,
  devOnly: devOnlyGuard,
} as const;
