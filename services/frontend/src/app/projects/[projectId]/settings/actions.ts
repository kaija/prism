"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackendAPIClient } from "@/lib/api-client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

interface ActionState {
  error: string | null;
  success: boolean;
}

export async function updateTimezoneAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const timezone = formData.get("timezone") as string;

  if (!timezone) {
    return { error: "Timezone is required.", success: false };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { timezone },
    });
    revalidatePath(`/projects/${projectId}/settings`);
    return { error: null, success: true };
  } catch {
    return { error: "Failed to update timezone.", success: false };
  }
}

export async function toggleFeatureFlagAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projectId = formData.get("projectId") as string;
  const flagKey = formData.get("flagKey") as string;
  const flagValue = formData.get("flagValue") as string;

  if (!flagKey) {
    return { error: "Flag key is required.", success: false };
  }

  try {
    const api = new BackendAPIClient();
    await api.setFeatureFlag(projectId, flagKey, flagValue);
    revalidatePath(`/projects/${projectId}/settings`);
    return { error: null, success: true };
  } catch {
    return { error: "Failed to update feature flag.", success: false };
  }
}
