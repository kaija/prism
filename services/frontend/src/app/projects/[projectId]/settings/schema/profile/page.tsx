import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SchemaPropertyManager } from "@/components/schema/schema-property-manager";

export default async function ProfileSchemaPage({
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
        <h1 className="page-title">Profile Schema</h1>
        <p className="page-subtitle">管理 Profile 的屬性定義。</p>
      </div>
      <SchemaPropertyManager projectId={projectId} schemaType="profile" />
    </div>
  );
}
