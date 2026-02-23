import Link from "next/link";

export default async function AccessDeniedPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      textAlign: "center",
      padding: 40,
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-default)", marginBottom: 8 }}>
        Access Denied
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, maxWidth: 400 }}>
        You don&apos;t have permission to access this page. Contact your project administrator to request access.
      </p>
      <Link
        href={`/projects/${projectId}/dashboard`}
        style={{
          padding: "10px 24px",
          background: "var(--primary)",
          color: "#fff",
          borderRadius: "var(--radius-sm)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
