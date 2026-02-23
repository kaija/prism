import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectMembers } from "@/services/project-service";
import { getGroupsForProject } from "@/services/user-group-service";
import { getEffectiveRole } from "@/services/user-service";
import { ROLE_HIERARCHY } from "@/types/auth";
import { InviteUserForm } from "./invite-user-form";
import { GroupManagement } from "./group-management";

export default async function UsersPage({
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
  const isOwner =
    isSystemAdmin || (userRole && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY["owner"]);

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-title">Team Members</h1>
        <p className="page-subtitle">Manage your project team, invite new members, and configure groups.</p>
      </div>

      <InviteUserForm projectId={projectId} />

      {/* Member Table */}
      <div className="ds-card" style={{ marginBottom: 24 }}>
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

      {isOwner && <GroupManagement projectId={projectId} groups={groups} />}
    </div>
  );
}
