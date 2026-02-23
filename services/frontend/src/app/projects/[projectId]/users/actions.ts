"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { inviteUser } from "@/services/project-service";
import { createGroup, DuplicateGroupNameError } from "@/services/user-group-service";
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
  const role = formData.get("role") as Role;

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
    await inviteUser(projectId, session.user.id, targetUser.id, role);
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
