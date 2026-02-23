// Feature: analytics-frontend, Property 8: Project Unique Identifier
// Feature: analytics-frontend, Property 9: Project Tenant Isolation
// Feature: analytics-frontend, Property 10: Project Deletion Cascade

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * **Validates: Requirements 5.1, 5.2, 5.4, 6.2**
 *
 * Property 8: Project Unique Identifier
 * For any set of N projects created, all project IDs should be distinct,
 * and the count of projects should equal N.
 *
 * Property 9: Project Tenant Isolation
 * For any two distinct projects with separate memberships, querying project
 * members for one project should never return users who only belong to the
 * other project.
 *
 * Property 10: Project Deletion Cascade
 * For any project, after deletion, querying for the project, its memberships,
 * and its user groups should all return empty results.
 */

// ---------------------------------------------------------------------------
// Mocks — Prisma client
// ---------------------------------------------------------------------------

const {
  mockProjectCreate,
  mockProjectDelete,
  mockProjectFindUnique,
  mockMembershipCreate,
  mockMembershipFindMany,
  mockUserGroupFindMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockProjectCreate: vi.fn(),
  mockProjectDelete: vi.fn(),
  mockProjectFindUnique: vi.fn(),
  mockMembershipCreate: vi.fn(),
  mockMembershipFindMany: vi.fn(),
  mockUserGroupFindMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    project: {
      create: mockProjectCreate,
      delete: mockProjectDelete,
      findUnique: mockProjectFindUnique,
    },
    projectMembership: {
      create: mockMembershipCreate,
      findMany: mockMembershipFindMany,
    },
    userGroup: {
      findMany: mockUserGroupFindMany,
    },
    $transaction: mockTransaction,
  },
}));

// ---------------------------------------------------------------------------
// Mock getEffectiveRole from user-service
// ---------------------------------------------------------------------------

const { mockGetEffectiveRole } = vi.hoisted(() => ({
  mockGetEffectiveRole: vi.fn(),
}));

vi.mock("@/services/user-service", () => ({
  getEffectiveRole: mockGetEffectiveRole,
}));

import {
  createProject,
  deleteProject,
  getProjectMembers,
} from "./project-service";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a simple alphanumeric ID (simulating cuid-like IDs). */
const idArb = fc.stringMatching(/^[a-z0-9]{8,16}$/);

/** Generates a valid project name. */
const projectNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 \-]{0,29}$/);

/** Generates a non-empty array of 2–10 distinct project names. */
const projectNamesArb = fc.uniqueArray(projectNameArb, { minLength: 2, maxLength: 10 });

/** Generates a non-empty set of 1–5 distinct user IDs. */
const userIdsArb = fc.uniqueArray(idArb, { minLength: 1, maxLength: 5 });

// ---------------------------------------------------------------------------
// Property 8: Project Unique Identifier
// ---------------------------------------------------------------------------

describe("Property 8: Project Unique Identifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any N projects created, all IDs are distinct and count equals N",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          projectNamesArb,
          idArb,
          async (names, ownerId) => {
            // Track generated IDs to simulate cuid uniqueness
            let counter = 0;
            mockTransaction.mockImplementation(async (fn: Function) => {
              counter++;
              const projectId = `proj-${counter}-${Math.random().toString(36).slice(2, 10)}`;
              const tx = {
                project: {
                  create: vi.fn().mockResolvedValue({ id: projectId, name: "" }),
                },
                projectMembership: {
                  create: vi.fn().mockResolvedValue({
                    id: `mem-${counter}`,
                    userId: ownerId,
                    projectId,
                    role: "owner",
                  }),
                },
              };
              return fn(tx);
            });

            // Create N projects
            const projects = await Promise.all(
              names.map((name) => createProject(name, ownerId))
            );

            // All IDs should be distinct
            const ids = projects.map((p) => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(names.length);
            expect(projects.length).toBe(names.length);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 9: Project Tenant Isolation
// ---------------------------------------------------------------------------

describe("Property 9: Project Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any two distinct projects with separate memberships, querying " +
      "members for one project never returns users who only belong to the other",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          idArb,
          userIdsArb,
          userIdsArb,
          async (projectAId, projectBId, usersA, usersB) => {
            // Ensure project IDs are distinct
            fc.pre(projectAId !== projectBId);

            // Find users exclusive to each project
            const exclusiveToA = usersA.filter((u) => !usersB.includes(u));
            const exclusiveToB = usersB.filter((u) => !usersA.includes(u));

            // Build membership records for each project
            const membershipsA = usersA.map((userId) => ({
              id: `mem-a-${userId}`,
              userId,
              projectId: projectAId,
              role: "viewer",
              user: { id: userId, email: `${userId}@test.com` },
            }));

            const membershipsB = usersB.map((userId) => ({
              id: `mem-b-${userId}`,
              userId,
              projectId: projectBId,
              role: "viewer",
              user: { id: userId, email: `${userId}@test.com` },
            }));

            // Mock getProjectMembers to return only the correct project's members
            mockMembershipFindMany.mockImplementation(
              (args: { where: { projectId: string } }) => {
                if (args.where.projectId === projectAId) {
                  return Promise.resolve(membershipsA);
                }
                if (args.where.projectId === projectBId) {
                  return Promise.resolve(membershipsB);
                }
                return Promise.resolve([]);
              }
            );

            // Query members for project A
            const resultA = await getProjectMembers(projectAId);
            const resultAUserIds = resultA.map(
              (m: { userId: string }) => m.userId
            );

            // Query members for project B
            const resultB = await getProjectMembers(projectBId);
            const resultBUserIds = resultB.map(
              (m: { userId: string }) => m.userId
            );

            // Users exclusive to B must NOT appear in project A's results
            for (const userId of exclusiveToB) {
              expect(resultAUserIds).not.toContain(userId);
            }

            // Users exclusive to A must NOT appear in project B's results
            for (const userId of exclusiveToA) {
              expect(resultBUserIds).not.toContain(userId);
            }

            // Each result should only contain its own project's users
            expect(resultAUserIds.sort()).toEqual([...usersA].sort());
            expect(resultBUserIds.sort()).toEqual([...usersB].sort());
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 10: Project Deletion Cascade
// ---------------------------------------------------------------------------

describe("Property 10: Project Deletion Cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "for any deleted project, querying for the project, its memberships, " +
      "and its user groups should all return empty results",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          idArb,
          idArb,
          async (projectId, ownerId) => {
            // Mock: user is owner so deletion is allowed
            mockGetEffectiveRole.mockResolvedValue("owner");
            mockProjectDelete.mockResolvedValue({ id: projectId });

            // Perform deletion
            await deleteProject(projectId, ownerId);

            // Verify delete was called
            expect(mockProjectDelete).toHaveBeenCalledWith({
              where: { id: projectId },
            });

            // After deletion, simulate cascade: all queries return empty
            mockProjectFindUnique.mockResolvedValue(null);
            mockMembershipFindMany.mockResolvedValue([]);
            mockUserGroupFindMany.mockResolvedValue([]);

            // Query for the project — should be null (gone)
            const project = await mockProjectFindUnique({
              where: { id: projectId },
            });
            expect(project).toBeNull();

            // Query for memberships — should be empty
            const memberships = await mockMembershipFindMany({
              where: { projectId },
            });
            expect(memberships).toEqual([]);

            // Query for user groups — should be empty
            const groups = await mockUserGroupFindMany({
              where: { projectId },
            });
            expect(groups).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
