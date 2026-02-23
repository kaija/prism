import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportBuilder } from "../report-builder";
import { FeatureGate } from "@/components/feature-gate";

export default async function CohortReportPage({
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
        <h1 className="page-title">Cohort Report</h1>
        <p className="page-subtitle">Analyze user retention and behavior across cohorts.</p>
      </div>
      <FeatureGate
        projectId={projectId}
        flagKey="reports"
        fallback={
          <div className="ds-card">
            <div className="ds-card-body" style={{ color: "var(--text-muted)" }}>
              The reports feature is not enabled for this project.
            </div>
          </div>
        }
      >
        <ReportBuilder projectId={projectId} initialType="cohort" />
      </FeatureGate>
    </div>
  );
}
