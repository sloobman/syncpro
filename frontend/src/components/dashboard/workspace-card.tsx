import Link from "next/link";
import { Users, FileText, ArrowRight, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Workspace } from "@/types";
import { formatRelativeTime } from "@/lib/format";

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const role = workspace.currentUserRole;

  return (
    <Link href={`/dashboard/workspace/${workspace.id}`} className="group block">
      <Card className="h-full border-border/70 transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-muted/60 rounded-xl">
              {workspace.iconEmoji || "📁"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {workspace.name}
                </CardTitle>
                {role === "viewer" ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border flex items-center gap-1 shrink-0">
                    <Eye className="h-2.5 w-2.5" />
                    Читатель
                  </span>
                ) : role === "commenter" ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    Комменты
                  </span>
                ) : role === "editor" ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                    Редактор
                  </span>
                ) : null}
              </div>
              <CardDescription className="line-clamp-1 text-xs mt-0.5">
                {workspace.description || "Без описания"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>{workspace.documentCount} документов</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{workspace.memberCount} участников</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 mt-2 py-3">
          <span>Обновлено {formatRelativeTime(workspace.updatedAt)}</span>
          <span className="flex items-center gap-1 font-medium text-primary group-hover:translate-x-0.5 transition-transform">
            Открыть <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
