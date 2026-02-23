"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createProject } from "@/services/project-service";

export async function createProjectAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const name = formData.get("name") as string;
  if (!name || name.trim().length === 0) {
    return { error: "Project name is required." };
  }

  let projectId: string;
  try {
    const project = await createProject(name.trim(), session.user.id);
    projectId = project.id;
  } catch {
    return { error: "Failed to create project. Please try again." };
  }

  redirect(`/projects/${projectId}/dashboard`);
}
