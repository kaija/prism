// Feature: analytics-frontend, Property 4: Role Hierarchy Permission Enforcement
// Feature: analytics-frontend, Property 5: Role Change Propagation

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import {
  type Role,
  type PermissionAction,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  hasPermission,
} from "@/types/auth";

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.3**
 *
 * Property 4: Role Hierarchy Permission Enforcement
 * For any user with a given role and any action from the permission matrix,
 * the permission check should return true if and only if the action's minimum
 * required role level is less than or equal to the user's role level in the
 * hierarchy (viewer=0 < editor=1 < admin=2 < owner=3).
 *
 * Property 5: Role Change Propagation
 * For any user whose role is updated from one value to another, the next call
 * to `getEffectiveRole` should return the new role value.
 */

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const ALL_ROLES: Role[] = ["viewer", "editor", "admin", "owner"];
const ALL_ACTIONS: PermissionAction[] = Object.keys(PERMISSION_MATRIX) as PermissionAction[];

/** Generates any valid Role. */
const roleArb = fc.constantFrom<Role>(...ALL_ROLES);

/** Generates any valid PermissionAction. */
const actionArb = fc.constantFrom<PermissionAction>(...ALL_ACTIONS);

// ---------------------------------------------------------------------------
// Property 4: Role Hierarchy Permission Enforcement
// ---------------------------------------------------------------------------

describe("Property 4: Role Hierarchy Permission Enforcement", () => {
  it(
    "for any role and action, hasPermission returns true iff the user's role " +
      "level >= the action's minimum required role level",
    () => {
      fc.assert(
        fc.property(roleArb, actionArb, (userRole, action) => {
          const userLevel = ROLE_HIERARCHY[userRole];
          const requiredRole = PERMISSION_MATRIX[action];
          const requiredLevel = ROLE_HIERARCHY[requiredRole];

          const expected = userLevel >= requiredLevel;
          const actual = hasPermission(userRole, action);

          expect(actual).toBe(expected);
        }),
        { numRuns: 200 }
      );
    }
  );

  it(
    "viewer-level actions are allowed for every role",
    () => {
      const viewerActions = ALL_ACTIONS.filter(
        (a) => PERMISSION_MATRIX[a] === "viewer"
      );

      fc.assert(
        fc.property(roleArb, fc.constantFrom(...viewerActions), (role, action) => {
          expect(hasPermission(role, action)).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "owner-only actions are denied for viewer, editor, and admin",
    () => {
      const ownerActions = ALL_ACTIONS.filter(
        (a) => PERMISSION_MATRIX[a] === "owner"
      );
      const nonOwnerRoles: Role[] = ["viewer", "editor", "admin"];

      fc.assert(
        fc.property(
          fc.constantFrom<Role>(...nonOwnerRoles),
          fc.constantFrom(...ownerActions),
          (role, action) => {
            expect(hasPermission(role, action)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 5: Role Change Propagation
// ---------------------------------------------------------------------------

// Mock Prisma for getEffectiveRole tests
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    projectMembership: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: vi.fn(),
    },
    userGroupMember: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Import after mocks are set up
import { getEffectiveRole } from "@/services/user-service";

describe("Property 5: Role Change Propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any role update (oldRole -> newRole), the next getEffectiveRole call " +
      "returns the new role value when the user has no group memberships",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArb,
          roleArb,
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          async (oldRole, newRole, userId, projectId) => {
            // No group memberships
            mockFindMany.mockResolvedValue([]);

            // First call: user has oldRole
            mockFindUnique.mockResolvedValueOnce({ role: oldRole });
            const before = await getEffectiveRole(userId, projectId);
            expect(before).toBe(oldRole);

            // Simulate role update: next call returns newRole
            mockFindUnique.mockResolvedValueOnce({ role: newRole });
            const after = await getEffectiveRole(userId, projectId);
            expect(after).toBe(newRole);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "for any role update, getEffectiveRole returns the new role even when " +
      "group memberships exist but have lower roles",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArb,
          roleArb,
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          async (_oldRole, newRole, userId, projectId) => {
            // Group memberships with roles strictly below the new role
            const lowerRoles = ALL_ROLES.filter(
              (r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[newRole]
            );

            const groupMemberships = lowerRoles.map((r) => ({
              userGroup: { role: r },
            }));

            mockFindMany.mockResolvedValue(groupMemberships);
            mockFindUnique.mockResolvedValueOnce({ role: newRole });

            const effective = await getEffectiveRole(userId, projectId);
            expect(effective).toBe(newRole);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "for any user with no membership, getEffectiveRole returns null",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          fc.stringMatching(/^[a-z0-9]{8,16}$/),
          async (userId, projectId) => {
            mockFindUnique.mockResolvedValue(null);
            mockFindMany.mockResolvedValue([]);

            const result = await getEffectiveRole(userId, projectId);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
