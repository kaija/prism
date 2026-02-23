import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma before importing the service.
// vi.hoisted ensures the fns are available when vi.mock's factory runs
// (vi.mock is hoisted to the top of the file by Vitest).
// ---------------------------------------------------------------------------
const { mockFindUnique, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    projectMembership: { findUnique: mockFindUnique },
    userGroupMember: { findMany: mockFindMany },
  },
}));

import { getEffectiveRole } from "./user-service";

describe("getEffectiveRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user has no membership and no groups", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBeNull();
  });

  it("returns the direct role when user has no group memberships", async () => {
    mockFindUnique.mockResolvedValue({ role: "editor" });
    mockFindMany.mockResolvedValue([]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("editor");
  });

  it("returns the group role when it is higher than the direct role", async () => {
    mockFindUnique.mockResolvedValue({ role: "viewer" });
    mockFindMany.mockResolvedValue([
      { userGroup: { role: "admin" } },
    ]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("admin");
  });

  it("returns the direct role when it is higher than all group roles", async () => {
    mockFindUnique.mockResolvedValue({ role: "admin" });
    mockFindMany.mockResolvedValue([
      { userGroup: { role: "viewer" } },
      { userGroup: { role: "editor" } },
    ]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("admin");
  });

  it("returns the highest group role when user has no direct membership", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      { userGroup: { role: "viewer" } },
      { userGroup: { role: "editor" } },
    ]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("editor");
  });

  it("returns owner when any source grants owner", async () => {
    mockFindUnique.mockResolvedValue({ role: "editor" });
    mockFindMany.mockResolvedValue([
      { userGroup: { role: "viewer" } },
      { userGroup: { role: "owner" } },
    ]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("owner");
  });

  it("picks the max across multiple groups", async () => {
    mockFindUnique.mockResolvedValue({ role: "viewer" });
    mockFindMany.mockResolvedValue([
      { userGroup: { role: "viewer" } },
      { userGroup: { role: "editor" } },
      { userGroup: { role: "admin" } },
      { userGroup: { role: "editor" } },
    ]);

    const result = await getEffectiveRole("user1", "project1");
    expect(result).toBe("admin");
  });

  it("queries with the correct userId and projectId", async () => {
    mockFindUnique.mockResolvedValue({ role: "viewer" });
    mockFindMany.mockResolvedValue([]);

    await getEffectiveRole("usr_abc", "proj_xyz");

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: "usr_abc", projectId: "proj_xyz" } },
      select: { role: true },
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: "usr_abc",
        userGroup: { projectId: "proj_xyz" },
      },
      select: {
        userGroup: { select: { role: true } },
      },
    });
  });
});
