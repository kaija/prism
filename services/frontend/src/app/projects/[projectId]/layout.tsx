import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectiveRole } from "@/services/user-service";
import type { Role } from "@/types/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isSystemAdmin = (session.user as Record<string, unknown>)
    .isSystemAdmin as boolean | undefined;

  const effectiveRole = await getEffectiveRole(session.user.id, projectId);

  if (!effectiveRole && !isSystemAdmin) {
    redirect("/projects");
  }

  const userRole: Role = effectiveRole ?? "owner"; // system admins get full access

  return (
    <AppShell
      projectId={projectId}
      userRole={userRole}
      user={{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
