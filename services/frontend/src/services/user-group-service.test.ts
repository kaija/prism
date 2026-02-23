import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing the service.
// ---------------------------------------------------------------------------
const {
  mockUserGroupCreate,
  mockUserGroupUpdate,
  mockUserGroupFindMany,
  mockUserGroupMemberCreate,
  mockUserGroupMemberDelete,
} = vi.hoisted(() => ({
  mockUserGroupCreate: vi.fn(),
  mockUserGroupUpdate: vi.fn(),
  mockUserGroupFindMany: vi.fn(),
  mockUserGroupMemberCreate: vi.fn(),
  mockUserGroupMemberDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userGroup: {
      create: mockUserGroupCreate,
      update: mockUserGroupUpdate,
      findMany: mockUserGroupFindMany,
    },
    userGroupMember: {
      create: mockUserGroupMemberCreate,
      delete: mockUserGroupMemberDelete,
    },
  },
}));

import {
  createGroup,
  addUserToGroup,
  removeUserFromGroup,
  updateGroupRole,
  getGroupsForProject,
  DuplicateGroupNameError,
} from "./user-group-service";

describe("user-group-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // createGroup
  // -----------------------------------------------------------------------
  describe("createGroup", () => {
    it("creates a group with the given project, name, and role", async () => {
      const group = {
        id: "g1",
        projectId: "p1",
        name: "Editors",
        role: "editor",
      };
      mockUserGroupCreate.mockResolvedValue(group);

      const result = await createGroup("p1", "Editors", "editor");

      expect(mockUserGroupCreate).toHaveBeenCalledWith({
        data: { projectId: "p1", name: "Editors", role: "editor" },
      });
      expect(result).toEqual(group);
    });

    it("throws DuplicateGroupNameError on unique constraint violation", async () => {
      mockUserGroupCreate.mockRejectedValue({ code: "P2002" });

      await expect(createGroup("p1", "Editors", "editor")).rejects.toThrow(
        DuplicateGroupNameError
      );
    });

    it("re-throws non-unique-constraint errors", async () => {
      const otherError = new Error("connection lost");
      mockUserGroupCreate.mockRejectedValue(otherError);

      await expect(createGroup("p1", "Editors", "editor")).rejects.toThrow(
        "connection lost"
      );
    });
  });

  // -----------------------------------------------------------------------
  // addUserToGroup
  // -----------------------------------------------------------------------
  describe("addUserToGroup", () => {
    it("creates a UserGroupMember linking user to group", async () => {
      const member = { id: "m1", userGroupId: "g1", userId: "u1" };
      mockUserGroupMemberCreate.mockResolvedValue(member);

      const result = await addUserToGroup("g1", "u1");

      expect(mockUserGroupMemberCreate).toHaveBeenCalledWith({
        data: { userGroupId: "g1", userId: "u1" },
      });
      expect(result).toEqual(member);
    });
  });

  // -----------------------------------------------------------------------
  // removeUserFromGroup
  // -----------------------------------------------------------------------
  describe("removeUserFromGroup", () => {
    it("deletes the UserGroupMember by composite key", async () => {
      const deleted = { id: "m1", userGroupId: "g1", userId: "u1" };
      mockUserGroupMemberDelete.mockResolvedValue(deleted);

      const result = await removeUserFromGroup("g1", "u1");

      expect(mockUserGroupMemberDelete).toHaveBeenCalledWith({
        where: {
          userGroupId_userId: { userGroupId: "g1", userId: "u1" },
        },
      });
      expect(result).toEqual(deleted);
    });
  });

  // -----------------------------------------------------------------------
  // updateGroupRole
  // -----------------------------------------------------------------------
  describe("updateGroupRole", () => {
    it("updates the role on the UserGroup record", async () => {
      const updated = { id: "g1", role: "admin" };
      mockUserGroupUpdate.mockResolvedValue(updated);

      const result = await updateGroupRole("g1", "admin");

      expect(mockUserGroupUpdate).toHaveBeenCalledWith({
        where: { id: "g1" },
        data: { role: "admin" },
      });
      expect(result).toEqual(updated);
    });
  });

  // -----------------------------------------------------------------------
  // getGroupsForProject
  // -----------------------------------------------------------------------
  describe("getGroupsForProject", () => {
    it("returns all groups for a project with members included", async () => {
      const groups = [
        {
          id: "g1",
          projectId: "p1",
          name: "Admins",
          role: "admin",
          members: [
            {
              id: "m1",
              userGroupId: "g1",
              userId: "u1",
              user: { id: "u1", email: "a@b.com" },
            },
          ],
        },
      ];
      mockUserGroupFindMany.mockResolvedValue(groups);

      const result = await getGroupsForProject("p1");

      expect(mockUserGroupFindMany).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        include: {
          members: {
            include: { user: true },
          },
        },
      });
      expect(result).toEqual(groups);
    });

    it("returns an empty array when no groups exist", async () => {
      mockUserGroupFindMany.mockResolvedValue([]);

      const result = await getGroupsForProject("p1");
      expect(result).toEqual([]);
    });
  });
});
