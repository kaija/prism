import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackendAPIClient } from "@/lib/api-client";
import { TimezoneForm } from "./timezone-form";

const COMMON_TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "Australia/Sydney", "Pacific/Auckland",
];

export default async function TimezonePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  let timezone = "UTC";
  try {
    const api = new BackendAPIClient();
    const config = await api.getConfig(projectId);
    timezone = config.timezone ?? "UTC";
  } catch {
    // Backend may be unavailable; use defaults
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Timezone</h1>
        <p className="page-subtitle">Configure the default timezone for your project.</p>
      </div>
      <TimezoneForm
        projectId={projectId}
        currentTimezone={timezone}
        timezones={COMMON_TIMEZONES}
      />
    </div>
  );
}
