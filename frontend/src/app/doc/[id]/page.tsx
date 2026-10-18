import { EditorShell } from "@/components/editor/editor-shell";

export default function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  return <EditorShell />;
}
