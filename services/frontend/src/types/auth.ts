// types/auth.ts — Role type and permission constants

/**
 * Role levels matching the Prisma Role enum.
 * Hierarchy: viewer (0) < editor (1) < admin (2) < owner (3)
 */
export type Role = "viewer" | "editor" | "admin" | "owner";

/** Numeric weight for each role used in hierarchy comparisons. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
} as const;

/** All actions that can be permission-gated in the application. */
export type PermissionAction =
  | "view_reports"
  | "view_profiles"
  | "edit_reports"
  | "edit_project_config"
  | "invite_users"
  | "manage_feature_flags"
  | "set_timezone"
  | "delete_project"
  | "create_user_groups"
  | "assign_admin_role";

/**
 * Permission matrix mapping each action to the minimum Role required.
 *
 * | Action               | Viewer | Editor | Admin | Owner |
 * |----------------------|--------|--------|-------|-------|
 * | View reports         |   ✓    |   ✓    |   ✓   |   ✓   |
 * | View profiles        |   ✓    |   ✓    |   ✓   |   ✓   |
 * | Edit reports         |   ✗    |   ✓    |   ✓   |   ✓   |
 * | Edit project config  |   ✗    |   ✗    |   ✓   |   ✓   |
 * | Invite users         |   ✗    |   ✗    |   ✓   |   ✓   |
 * | Manage feature flags |   ✗    |   ✗    |   ✓   |   ✓   |
 * | Set timezone         |   ✗    |   ✗    |   ✓   |   ✓   |
 * | Delete project       |   ✗    |   ✗    |   ✗   |   ✓   |
 * | Create user groups   |   ✗    |   ✗    |   ✗   |   ✓   |
 * | Assign admin role    |   ✗    |   ✗    |   ✗   |   ✓   |
 */
export const PERMISSION_MATRIX: Record<PermissionAction, Role> = {
  view_reports: "viewer",
  view_profiles: "viewer",
  edit_reports: "editor",
  edit_project_config: "admin",
  invite_users: "admin",
  manage_feature_flags: "admin",
  set_timezone: "admin",
  delete_project: "owner",
  create_user_groups: "owner",
  assign_admin_role: "owner",
} as const;

/**
 * Check whether a user's role satisfies the minimum role required for an action.
 *
 * @param userRole  - The role the user currently holds
 * @param action    - The action being attempted
 * @returns `true` when the user's role level ≥ the action's minimum role level
 */
export function hasPermission(userRole: Role, action: PermissionAction): boolean {
  const requiredRole = PERMISSION_MATRIX[action];
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
