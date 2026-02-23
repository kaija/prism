import prisma from "@/lib/prisma";
import { type Role, ROLE_HIERARCHY } from "@/types/auth";

/**
 * Compute the effective role for a user within a project.
 *
 * The effective role is the **maximum** of:
 *   1. The user's direct ProjectMembership role
 *   2. The roles of every UserGroup the user belongs to in that project
 *
 * If the user has no membership in the project at all, returns `null`.
 *
 * Requirement 3.6 — role changes take effect on the next call.
 * Requirement 4.2 — group role is applied as effective role.
 * Requirement 4.3 — removing from group reverts to individual role.
 * Requirement 4.4 — changing group role updates effective role for members.
 */
export async function getEffectiveRole(
  userId: string,
  projectId: string
): Promise<Role | null> {
  // Fetch the user's direct membership and all group memberships in parallel
  const [directMembership, groupMemberships] = await Promise.all([
    prisma.projectMembership.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
      select: { role: true },
    }),
    prisma.userGroupMember.findMany({
      where: {
        userId,
        userGroup: { projectId },
      },
      select: {
        userGroup: {
          select: { role: true },
        },
      },
    }),
  ]);

  // Collect all applicable roles
  const roles: Role[] = [];

  if (directMembership) {
    roles.push(directMembership.role);
  }

  for (const gm of groupMemberships) {
    roles.push(gm.userGroup.role);
  }

  if (roles.length === 0) {
    return null;
  }

  // Return the role with the highest hierarchy value
  return roles.reduce((max, role) =>
    ROLE_HIERARCHY[role] > ROLE_HIERARCHY[max] ? role : max
  );
}
