import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectMembers } from "@/services/project-service";
import { getGroupsForProject } from "@/services/user-group-service";
import { getEffectiveRole } from "@/services/user-service";
import { ROLE_HIERARCHY } from "@/types/auth";
import { InviteUserForm } from "../../users/invite-user-form";

export default async function UsersSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [members, groups, effectiveRole] = await Promise.all([
    getProjectMembers(projectId),
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
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage project members and invite new users.</p>
      </div>

      <InviteUserForm projectId={projectId} groups={groups.map((g) => ({ id: g.id, name: g.name, role: g.role }))} />

      <div className="ds-card">
        <div className="ds-card-header">Members</div>
        <div style={{ overflowX: "auto" }}>
          <table className="ds-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.user.name ?? "—"}</td>
                  <td>{member.user.email}</td>
                  <td><span className="ds-badge ds-badge-role">{member.role}</span></td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
