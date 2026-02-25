import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SegmentRuleEditor } from "@/components/segment/segment-rule-editor";

export default async function NewSegmentPage({
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
      <SegmentRuleEditor projectId={projectId} />
    </div>
  );
}
