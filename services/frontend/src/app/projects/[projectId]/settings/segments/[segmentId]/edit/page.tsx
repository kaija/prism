import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SegmentRuleEditor } from "@/components/segment/segment-rule-editor";

export default async function EditSegmentPage({
  params,
}: {
  params: Promise<{ projectId: string; segmentId: string }>;
}) {
  const { projectId, segmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <SegmentRuleEditor projectId={projectId} segmentId={segmentId} />
    </div>
  );
}
