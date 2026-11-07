import Link from "next/link";
import { FileText, GitBranch, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mockRecent = [
  {
    id: "doc_1",
    title: "Глава 1: Введение в системы совместного редактирования",
    workspace: "Мой проект",
    branch: "main",
    updated: "2 часа назад",
    collaborators: [
      { name: "Алиса", color: "bg-blue-500" },
      { name: "Боб", color: "bg-emerald-500" },
    ],
  },
  {
    id: "doc_2",
    title: "Архитектура и протокол Merkle-CRDT",
    workspace: "Команда разработки",
    branch: "feature/dag-sync",
    updated: "Вчера",
    collaborators: [{ name: "Алексей", color: "bg-purple-500" }],
  },
  {
    id: "doc_3",
    title: "Roadmap Q4 2026 и этапы развертывания",
    workspace: "Мой проект",
    branch: "main",
    updated: "3 дня назад",
    collaborators: [],
  },
];

export function RecentDocuments() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Недавние документы
        </h2>
      </div>

      <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden shadow-sm">
        {mockRecent.map((doc) => (
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
                  <span>{doc.workspace}</span>
                  <span>•</span>
                  <span>Изменён {doc.updated}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {doc.branch}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {doc.collaborators.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden hidden sm:flex">
                  {doc.collaborators.map((c) => (
                    <Avatar
                      key={c.name}
                      className="inline-block h-6 w-6 ring-2 ring-background"
                    >
                      <AvatarFallback className="text-[10px] bg-muted font-medium">
                        {c.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
