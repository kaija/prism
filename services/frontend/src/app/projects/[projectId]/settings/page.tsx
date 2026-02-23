import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { BackendAPIClient } from "@/lib/api-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  let featureFlags: Record<string, string> = {};
  try {
    const api = new BackendAPIClient();
    featureFlags = await api.getFeatureFlags(projectId);
  } catch {
    // Backend may be unavailable; use defaults
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Project Settings</h1>
        <p className="page-subtitle">Configure feature flags and general project options.</p>
      </div>
      <SettingsForm
        projectId={projectId}
        featureFlags={featureFlags}
      />
    </div>
  );
}
