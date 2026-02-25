import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SegmentListClient } from "./segment-list-client";

export default async function SegmentListPage({
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
      <SegmentListClient projectId={projectId} />
    </div>
  );
}
