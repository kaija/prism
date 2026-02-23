import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ConfigurationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const sections = [
    {
      title: "Access",
      items: [
        {
          label: "Users",
          desc: "Manage project members and invite new users",
          href: `/projects/${projectId}/settings/users`,
        },
        {
          label: "Groups",
          desc: "Create and manage user groups",
          href: `/projects/${projectId}/settings/groups`,
        },
      ],
    },
    {
      title: "Project",
      items: [
        {
          label: "Settings",
          desc: "Configure feature flags and general options",
          href: `/projects/${projectId}/settings`,
        },
        {
          label: "Timezone",
          desc: "Set the default timezone for your project",
          href: `/projects/${projectId}/settings/timezone`,
        },
        {
          label: "Audit Log",
          desc: "View a history of actions taken in this project",
          href: `/projects/${projectId}/settings/audit-log`,
        },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-title">Configuration</h1>
        <p className="page-subtitle">Manage access, settings, and project configuration.</p>
      </div>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 32 }}>
          <h3 style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            {section.title}
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}>
            {section.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="ds-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="ds-card-header" style={{ color: "var(--primary)", fontWeight: 600 }}>
                  {item.label}
                </div>
                <div className="ds-card-body">
                  <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
