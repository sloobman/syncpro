"use client";

import Link from "next/link";
import { FileText, GitBranch, ArrowUpRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

export function RecentDocuments() {
  const documents = useWorkspaceStore((state) => state.documents);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const activeDocs = documents.filter((d) => !d.isArchived).slice(0, 8);

  const getWorkspaceName = (wsId: string) => {
    return workspaces.find((w) => w.id === wsId)?.name || "Пространство";
  };

  if (activeDocs.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Недавние документы
        </h2>
        <div className="p-8 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground bg-muted/10">
          Пока нет документов. Создайте свой первый документ выше!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Недавние документы
        </h2>
      </div>

      <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden shadow-sm">
        {activeDocs.map((doc) => (
          <Link
            key={doc.id}
            href={`/doc/${doc.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{getWorkspaceName(doc.workspaceId)}</span>
                  <span>•</span>
                  <span>Изменён {formatRelativeTime(doc.updatedAt)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {doc.defaultBranch}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
