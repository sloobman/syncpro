import { Suspense } from "react";
import { WorkspaceContent } from "@/components/dashboard/workspace-content";

async function WorkspaceLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkspaceContent workspaceId={id} />;
}

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">
          Загрузка рабочего пространства...
        </div>
      }
    >
      <WorkspaceLoader params={params} />
    </Suspense>
  );
}
