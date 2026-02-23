import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGroupsForProject } from "@/services/user-group-service";
import { getEffectiveRole } from "@/services/user-service";
import { ROLE_HIERARCHY } from "@/types/auth";
import { GroupManagement } from "../../users/group-management";

export default async function GroupsSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [groups, effectiveRole] = await Promise.all([
    getGroupsForProject(projectId),
    getEffectiveRole(session.user.id, projectId),
  ]);

  const isSystemAdmin = (session.user as Record<string, unknown>)
    .isSystemAdmin as boolean | undefined;
  const userRole = effectiveRole ?? (isSystemAdmin ? "owner" : null);
  const isAdmin =
    isSystemAdmin || (userRole && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY["admin"]);

  if (!isAdmin) {
    redirect(`/projects/${projectId}/dashboard`);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-title">Groups</h1>
        <p className="page-subtitle">Create and manage user groups for your project.</p>
      </div>

      <GroupManagement projectId={projectId} groups={groups} />
    </div>
  );
}
