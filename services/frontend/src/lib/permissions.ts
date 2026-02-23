/**
 * Permission utilities.
 *
 * Re-exports the core RBAC primitives from types/auth.ts and adds
 * route-level permission helpers used by the middleware.
 */

export {
  type Role,
  type PermissionAction,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  hasPermission,
} from "@/types/auth";

import { type Role, ROLE_HIERARCHY } from "@/types/auth";

/**
 * Compare two roles using the hierarchy.
 * Returns true when `userRole` is at or above `requiredRole`.
 */
export function meetsRoleRequirement(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Map of route patterns to the minimum role required to access them.
 * The middleware matches incoming paths against these patterns.
 */
export const ROUTE_PERMISSIONS: Record<string, Role> = {
  "/projects/[projectId]/settings": "admin",
  "/projects/[projectId]/configuration": "admin",
  "/projects/[projectId]/users": "admin",
};
