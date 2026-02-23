import prisma from "@/lib/prisma";
import { type Role, ROLE_HIERARCHY } from "@/types/auth";
import { getEffectiveRole } from "@/services/user-service";

/**
 * Error thrown when a non-owner attempts to delete a project.
 * Requirement 6.3 — prevent non-Owner deletion.
 */
export class NotProjectOwnerError extends Error {
  constructor(userId: string, projectId: string) {
    super(
      `User ${userId} is not an owner of project ${projectId} and cannot delete it`
    );
    this.name = "NotProjectOwnerError";
  }
}

/**
 * Error thrown when a user without admin+ role attempts to invite.
 * Requirement 3.3 — Admin role required to invite users.
 */
export class InsufficientRoleError extends Error {
  constructor(userId: string, projectId: string, requiredRole: Role) {
    super(
      `User ${userId} requires at least ${requiredRole} role in project ${projectId}`
    );
    this.name = "InsufficientRoleError";
  }
}

/**
 * Create a new project and assign the creator as Owner.
 *
 * Uses a Prisma transaction to atomically create the project and
 * the owner membership.
 *
 * Requirement 5.1 — persist project with unique identifier.
 */
export async function createProject(name: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: { name },
    });

    await tx.projectMembership.create({
      data: {
        userId: ownerId,
        projectId: project.id,
        role: "owner",
      },
    });

    return project;
  });
}

/**
 * Delete a project. Only users with the Owner role may delete.
 *
 * Requirement 6.2 — remove project and all associated data.
 * Requirement 6.3 — non-Owner users are denied.
 * Cascade delete handles memberships and user groups via schema.
 */
export async function deleteProject(projectId: string, userId: string) {
  const effectiveRole = await getEffectiveRole(userId, projectId);

  if (effectiveRole !== "owner") {
    throw new NotProjectOwnerError(userId, projectId);
  }

  await prisma.project.delete({
    where: { id: projectId },
  });
}

/**
 * List all projects a user has membership in.
 *
 * Requirement 5.2 — load only data belonging to the user's projects.
 * Requirement 5.4 — users without access cannot see projects.
 */
export async function getProjectsForUser(userId: string) {
  const memberships = await prisma.projectMembership.findMany({
    where: { userId },
    include: { project: true },
  });

  return memberships.map((m) => m.project);
}

/**
 * List all members of a project with their roles.
 */
export async function getProjectMembers(projectId: string) {
  return prisma.projectMembership.findMany({
    where: { projectId },
    include: { user: true },
  });
}

/**
 * Invite a user to a project with a specified role.
 *
 * The inviter must have at least Admin role in the project.
 * Requirement 3.3 — Admin can invite users.
 */
export async function inviteUser(
  projectId: string,
  inviterId: string,
  userId: string,
  role: Role
) {
  const inviterRole = await getEffectiveRole(inviterId, projectId);

  if (!inviterRole || ROLE_HIERARCHY[inviterRole] < ROLE_HIERARCHY["admin"]) {
    throw new InsufficientRoleError(inviterId, projectId, "admin");
  }

  return prisma.projectMembership.create({
    data: {
      userId,
      projectId,
      role,
    },
  });
}
