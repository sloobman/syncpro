import { Suspense } from "react";
import { EditorShell } from "@/components/editor/editor-shell";

async function DocumentLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorShell documentId={id} />;
}

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-sm">
          Загрузка редактора SyncPro...
        </div>
      }
    >
      <DocumentLoader params={params} />
    </Suspense>
  );
}
