// Feature: analytics-frontend, Property 6: Effective Role Computation from Groups
// Feature: analytics-frontend, Property 7: User Group Creation Persistence

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { type Role, ROLE_HIERARCHY } from "@/types/auth";

/**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * Property 6: Effective Role Computation from Groups
 * For any user who is a member of one or more User_Groups within a project,
 * the effective role should be the maximum of the user's individual role and
 * all group roles. When the user is removed from all groups, the effective
 * role should revert to the individual role.
 *
 * Property 7: User Group Creation Persistence
 * For any valid group name and role, after creating a User_Group, querying
 * the database for that group by project and name should return a matching
 * record with the correct role.
 */

// ---------------------------------------------------------------------------
// Mocks — Prisma client
// ---------------------------------------------------------------------------

const mockMembershipFindUnique = vi.fn();
const mockGroupMemberFindMany = vi.fn();
const mockUserGroupCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    projectMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    },
    userGroupMember: {
      findMany: (...args: unknown[]) => mockGroupMemberFindMany(...args),
    },
    userGroup: {
      create: (...args: unknown[]) => mockUserGroupCreate(...args),
    },
  },
}));

import { getEffectiveRole } from "@/services/user-service";
import { createGroup } from "@/services/user-group-service";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const ALL_ROLES: Role[] = ["viewer", "editor", "admin", "owner"];

/** Generates any valid Role. */
const roleArb = fc.constantFrom<Role>(...ALL_ROLES);

/** Generates a non-empty array of 1–4 group roles. */
const groupRolesArb = fc.array(roleArb, { minLength: 1, maxLength: 4 });

/** Generates a simple alphanumeric ID. */
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

/** Generates a valid group name (alphanumeric with spaces/hyphens). */
const groupNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 \-]{0,29}$/);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the role with the highest hierarchy value from a list. */
function maxRole(roles: Role[]): Role {
  return roles.reduce((max, r) =>
    ROLE_HIERARCHY[r] > ROLE_HIERARCHY[max] ? r : max
  );
}

// ---------------------------------------------------------------------------
// Property 6: Effective Role Computation from Groups
// ---------------------------------------------------------------------------

describe("Property 6: Effective Role Computation from Groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any user with an individual role and one or more group roles, " +
      "getEffectiveRole returns the maximum of all roles",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArb,
          groupRolesArb,
          idArb,
          idArb,
          async (individualRole, groupRoles, userId, projectId) => {
            // Mock: user has a direct membership with individualRole
            mockMembershipFindUnique.mockResolvedValue({ role: individualRole });

            // Mock: user belongs to groups with the generated roles
            mockGroupMemberFindMany.mockResolvedValue(
              groupRoles.map((r) => ({ userGroup: { role: r } }))
            );

            const effective = await getEffectiveRole(userId, projectId);

            const allRoles = [individualRole, ...groupRoles];
            const expected = maxRole(allRoles);

            expect(effective).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "when a user is removed from all groups, getEffectiveRole reverts " +
      "to the individual role",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          roleArb,
          groupRolesArb,
          idArb,
          idArb,
          async (individualRole, groupRoles, userId, projectId) => {
            // Step 1: user has individual role + group memberships
            mockMembershipFindUnique.mockResolvedValue({ role: individualRole });
            mockGroupMemberFindMany.mockResolvedValue(
              groupRoles.map((r) => ({ userGroup: { role: r } }))
            );

            const withGroups = await getEffectiveRole(userId, projectId);
            const expected = maxRole([individualRole, ...groupRoles]);
            expect(withGroups).toBe(expected);

            // Step 2: user removed from all groups (empty group memberships)
            mockMembershipFindUnique.mockResolvedValue({ role: individualRole });
            mockGroupMemberFindMany.mockResolvedValue([]);

            const withoutGroups = await getEffectiveRole(userId, projectId);
            expect(withoutGroups).toBe(individualRole);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "a group role higher than the individual role elevates the effective role",
    async () => {
      // Use pairs where the group role is strictly higher than individual
      const lowerThenHigherArb = fc
        .constantFrom<[Role, Role]>(
          ["viewer", "editor"],
          ["viewer", "admin"],
          ["viewer", "owner"],
          ["editor", "admin"],
          ["editor", "owner"],
          ["admin", "owner"]
        );

      await fc.assert(
        fc.asyncProperty(
          lowerThenHigherArb,
          idArb,
          idArb,
          async ([individualRole, groupRole], userId, projectId) => {
            mockMembershipFindUnique.mockResolvedValue({ role: individualRole });
            mockGroupMemberFindMany.mockResolvedValue([
              { userGroup: { role: groupRole } },
            ]);

            const effective = await getEffectiveRole(userId, projectId);
            expect(effective).toBe(groupRole);
            expect(ROLE_HIERARCHY[effective!]).toBeGreaterThan(
              ROLE_HIERARCHY[individualRole]
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 7: User Group Creation Persistence
// ---------------------------------------------------------------------------

describe("Property 7: User Group Creation Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any valid group name and role, createGroup calls Prisma with " +
      "correct data and the returned record matches the input",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          groupNameArb,
          roleArb,
          async (projectId, name, role) => {
            const fakeGroup = {
              id: `group-${projectId}-${name}`,
              projectId,
              name,
              role,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            mockUserGroupCreate.mockResolvedValue(fakeGroup);

            const result = await createGroup(projectId, name, role);

            // Verify Prisma was called with the correct arguments
            expect(mockUserGroupCreate).toHaveBeenCalledWith({
              data: { projectId, name, role },
            });

            // Verify the returned record matches input
            expect(result.projectId).toBe(projectId);
            expect(result.name).toBe(name);
            expect(result.role).toBe(role);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "for any group name and role, the created group's role matches " +
      "the requested role exactly",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          groupNameArb,
          roleArb,
          async (projectId, name, role) => {
            mockUserGroupCreate.mockImplementation(
              (args: { data: { projectId: string; name: string; role: Role } }) => {
                // Simulate Prisma returning exactly what was stored
                return Promise.resolve({
                  id: "generated-id",
                  ...args.data,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            );

            const result = await createGroup(projectId, name, role);

            expect(result.role).toBe(role);
            expect(result.name).toBe(name);
            expect(result.projectId).toBe(projectId);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
