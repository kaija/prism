import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing the service.
// ---------------------------------------------------------------------------
const {
  mockProjectCreate,
  mockProjectDelete,
  mockMembershipCreate,
  mockMembershipFindMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockProjectCreate: vi.fn(),
  mockProjectDelete: vi.fn(),
  mockMembershipCreate: vi.fn(),
  mockMembershipFindMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    project: {
      create: mockProjectCreate,
      delete: mockProjectDelete,
    },
    projectMembership: {
      create: mockMembershipCreate,
      findMany: mockMembershipFindMany,
    },
    $transaction: mockTransaction,
  },
}));

// ---------------------------------------------------------------------------
// Mock getEffectiveRole from user-service.
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
  getProjectsForUser,
  getProjectMembers,
  inviteUser,
  NotProjectOwnerError,
  InsufficientRoleError,
} from "./project-service";

describe("project-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // createProject
  // -----------------------------------------------------------------------
  describe("createProject", () => {
    it("creates a project and assigns the creator as owner in a transaction", async () => {
      const project = { id: "proj1", name: "My Project" };

      mockTransaction.mockImplementation(async (fn: Function) => {
        const tx = {
          project: { create: mockProjectCreate },
          projectMembership: { create: mockMembershipCreate },
        };
        mockProjectCreate.mockResolvedValue(project);
        mockMembershipCreate.mockResolvedValue({
          id: "mem1",
          userId: "user1",
          projectId: "proj1",
          role: "owner",
        });
        return fn(tx);
      });

      const result = await createProject("My Project", "user1");

      expect(result).toEqual(project);
      expect(mockProjectCreate).toHaveBeenCalledWith({
        data: { name: "My Project" },
      });
      expect(mockMembershipCreate).toHaveBeenCalledWith({
        data: { userId: "user1", projectId: "proj1", role: "owner" },
      });
    });
  });

  // -----------------------------------------------------------------------
  // deleteProject
  // -----------------------------------------------------------------------
  describe("deleteProject", () => {
    it("deletes the project when user is owner", async () => {
      mockGetEffectiveRole.mockResolvedValue("owner");
      mockProjectDelete.mockResolvedValue({ id: "proj1" });

      await deleteProject("proj1", "user1");

      expect(mockGetEffectiveRole).toHaveBeenCalledWith("user1", "proj1");
      expect(mockProjectDelete).toHaveBeenCalledWith({
        where: { id: "proj1" },
      });
    });

    it("throws NotProjectOwnerError when user is admin", async () => {
      mockGetEffectiveRole.mockResolvedValue("admin");

      await expect(deleteProject("proj1", "user1")).rejects.toThrow(
        NotProjectOwnerError
      );
      expect(mockProjectDelete).not.toHaveBeenCalled();
    });

    it("throws NotProjectOwnerError when user is viewer", async () => {
      mockGetEffectiveRole.mockResolvedValue("viewer");

      await expect(deleteProject("proj1", "user1")).rejects.toThrow(
        NotProjectOwnerError
      );
    });

    it("throws NotProjectOwnerError when user has no membership", async () => {
      mockGetEffectiveRole.mockResolvedValue(null);

      await expect(deleteProject("proj1", "user1")).rejects.toThrow(
        NotProjectOwnerError
      );
    });
  });

  // -----------------------------------------------------------------------
  // getProjectsForUser
  // -----------------------------------------------------------------------
  describe("getProjectsForUser", () => {
    it("returns projects the user is a member of", async () => {
      const memberships = [
        {
          id: "m1",
          userId: "user1",
          projectId: "p1",
          role: "owner",
          project: { id: "p1", name: "Project A" },
        },
        {
          id: "m2",
          userId: "user1",
          projectId: "p2",
          role: "viewer",
          project: { id: "p2", name: "Project B" },
        },
      ];
      mockMembershipFindMany.mockResolvedValue(memberships);

      const result = await getProjectsForUser("user1");

      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: { userId: "user1" },
        include: { project: true },
      });
      expect(result).toEqual([
        { id: "p1", name: "Project A" },
        { id: "p2", name: "Project B" },
      ]);
    });

    it("returns empty array when user has no memberships", async () => {
      mockMembershipFindMany.mockResolvedValue([]);

      const result = await getProjectsForUser("user1");
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getProjectMembers
  // -----------------------------------------------------------------------
  describe("getProjectMembers", () => {
    it("returns all members of a project with user data", async () => {
      const members = [
        {
          id: "m1",
          userId: "u1",
          projectId: "p1",
          role: "owner",
          user: { id: "u1", email: "owner@test.com" },
        },
        {
          id: "m2",
          userId: "u2",
          projectId: "p1",
          role: "viewer",
          user: { id: "u2", email: "viewer@test.com" },
        },
      ];
      mockMembershipFindMany.mockResolvedValue(members);

      const result = await getProjectMembers("p1");

      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        include: { user: true },
      });
      expect(result).toEqual(members);
    });

    it("returns empty array when project has no members", async () => {
      mockMembershipFindMany.mockResolvedValue([]);

      const result = await getProjectMembers("p1");
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // inviteUser
  // -----------------------------------------------------------------------
  describe("inviteUser", () => {
    it("creates membership when inviter is admin", async () => {
      mockGetEffectiveRole.mockResolvedValue("admin");
      const membership = {
        id: "m1",
        userId: "u2",
        projectId: "p1",
        role: "editor",
      };
      mockMembershipCreate.mockResolvedValue(membership);

      const result = await inviteUser("p1", "u1", "u2", "editor");

      expect(mockGetEffectiveRole).toHaveBeenCalledWith("u1", "p1");
      expect(mockMembershipCreate).toHaveBeenCalledWith({
        data: { userId: "u2", projectId: "p1", role: "editor" },
      });
      expect(result).toEqual(membership);
    });

    it("creates membership when inviter is owner", async () => {
      mockGetEffectiveRole.mockResolvedValue("owner");
      mockMembershipCreate.mockResolvedValue({
        id: "m1",
        userId: "u2",
        projectId: "p1",
        role: "viewer",
      });

      await inviteUser("p1", "u1", "u2", "viewer");

      expect(mockMembershipCreate).toHaveBeenCalled();
    });

    it("throws InsufficientRoleError when inviter is editor", async () => {
      mockGetEffectiveRole.mockResolvedValue("editor");

      await expect(inviteUser("p1", "u1", "u2", "viewer")).rejects.toThrow(
        InsufficientRoleError
      );
      expect(mockMembershipCreate).not.toHaveBeenCalled();
    });

    it("throws InsufficientRoleError when inviter is viewer", async () => {
      mockGetEffectiveRole.mockResolvedValue("viewer");

      await expect(inviteUser("p1", "u1", "u2", "viewer")).rejects.toThrow(
        InsufficientRoleError
      );
    });

    it("throws InsufficientRoleError when inviter has no membership", async () => {
      mockGetEffectiveRole.mockResolvedValue(null);

      await expect(inviteUser("p1", "u1", "u2", "viewer")).rejects.toThrow(
        InsufficientRoleError
      );
    });
  });
});
