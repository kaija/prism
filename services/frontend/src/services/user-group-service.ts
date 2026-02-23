import prisma from "@/lib/prisma";
import type { Role } from "@/types/auth";

/**
 * Error thrown when a group name already exists within a project.
 * Requirement 4.5 — duplicate group name validation.
 */
export class DuplicateGroupNameError extends Error {
  constructor(projectId: string, name: string) {
    super(
      `A user group named "${name}" already exists in project ${projectId}`
    );
    this.name = "DuplicateGroupNameError";
  }
}

/**
 * Create a user group with a name and role for a project.
 *
 * Requirement 4.1 — persist the UserGroup in the database.
 * Requirement 4.5 — reject duplicate group names within the same project.
 */
export async function createGroup(
  projectId: string,
  name: string,
  role: Role
) {
  try {
    return await prisma.userGroup.create({
      data: { projectId, name, role },
    });
  } catch (error: unknown) {
    // Prisma unique constraint violation code
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      throw new DuplicateGroupNameError(projectId, name);
    }
    throw error;
  }
}

/**
 * Add a user to a group.
 *
 * Requirement 4.2 — associate the user with the group; the group role
 * feeds into effective role computation handled by getEffectiveRole.
 */
export async function addUserToGroup(groupId: string, userId: string) {
  return prisma.userGroupMember.create({
    data: { userGroupId: groupId, userId },
  });
}

/**
 * Remove a user from a group.
 *
 * Requirement 4.3 — revoke the group role; effective role reverts to
 * the user's individual role (handled by getEffectiveRole).
 */
export async function removeUserFromGroup(groupId: string, userId: string) {
  return prisma.userGroupMember.delete({
    where: {
      userGroupId_userId: { userGroupId: groupId, userId },
    },
  });
}

/**
 * Update the role of a user group.
 *
 * Requirement 4.4 — cascades to effective role for all members because
 * getEffectiveRole reads the group role at query time.
 */
export async function updateGroupRole(groupId: string, role: Role) {
  return prisma.userGroup.update({
    where: { id: groupId },
    data: { role },
  });
}

/**
 * List all user groups for a project, including their members.
 */
export async function getGroupsForProject(projectId: string) {
  return prisma.userGroup.findMany({
    where: { projectId },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}
