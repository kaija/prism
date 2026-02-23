"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { inviteUser } from "@/services/project-service";
import { createGroup, addUserToGroup, removeUserFromGroup, DuplicateGroupNameError } from "@/services/user-group-service";
import type { Role } from "@/types/auth";

interface ActionState {
  error: string | null;
  success: boolean;
}

export async function inviteUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const email = formData.get("email") as string;
  const assignMode = formData.get("assignMode") as string;

  if (!email || !email.includes("@")) {
    return { error: "A valid email is required.", success: false };
  }

  // Find or create the user by email
  let targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: { email },
    });
  }

  try {
    if (assignMode === "group") {
      const groupId = formData.get("groupId") as string;
      if (!groupId) {
        return { error: "Please select a group.", success: false };
      }
      // Fetch the group to get its role for the membership
      const group = await prisma.userGroup.findUnique({ where: { id: groupId } });
      if (!group) {
        return { error: "Selected group not found.", success: false };
      }
      // Create membership with the group's role, then add to group
      await inviteUser(projectId, session.user.id, targetUser.id, group.role as Role);
      await addUserToGroup(groupId, targetUser.id);
    } else {
      const role = formData.get("role") as Role;
      await inviteUser(projectId, session.user.id, targetUser.id, role);
    }

    revalidatePath(`/projects/${projectId}/users`);
    return { error: null, success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to invite user.";
    return { error: message, success: false };
  }
}

export async function createGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const groupName = formData.get("groupName") as string;
  const role = formData.get("role") as Role;

  if (!groupName || groupName.trim().length === 0) {
    return { error: "Group name is required.", success: false };
  }

  try {
    await createGroup(projectId, groupName.trim(), role);
    revalidatePath(`/projects/${projectId}/users`);
    return { error: null, success: true };
  } catch (err) {
    if (err instanceof DuplicateGroupNameError) {
      return { error: err.message, success: false };
    }
    return { error: "Failed to create group.", success: false };
  }
}


export async function addUserToGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const groupId = formData.get("groupId") as string;
  const userId = formData.get("userId") as string;

  if (!groupId || !userId) {
    return { error: "Group and user are required.", success: false };
  }

  try {
    await addUserToGroup(groupId, userId);
    revalidatePath(`/projects/${projectId}/users`);
    return { error: null, success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add user to group.";
    return { error: message, success: false };
  }
}

export async function removeUserFromGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const groupId = formData.get("groupId") as string;
  const userId = formData.get("userId") as string;

  if (!groupId || !userId) {
    return { error: "Group and user are required.", success: false };
  }

  try {
    await removeUserFromGroup(groupId, userId);
    revalidatePath(`/projects/${projectId}/users`);
    return { error: null, success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove user from group.";
    return { error: message, success: false };
  }
}
