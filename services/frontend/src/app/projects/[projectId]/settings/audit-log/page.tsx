import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">View a history of actions taken in this project.</p>
      </div>
      <div className="ds-card">
        <div className="ds-card-body" style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          Audit log is coming soon.
        </div>
      </div>
    </div>
  );
}
