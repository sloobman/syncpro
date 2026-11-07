"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, FileText, ArrowRight, Eye, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Workspace } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const role = workspace.currentUserRole;
  const isViewer = role === "viewer" || role === "commenter";
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteOpen(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteWorkspace(workspace.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div className="group relative block">
        <Link href={`/dashboard/workspace/${workspace.id}`} className="block">
          <Card className="h-full border-border/70 transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-3xl p-2 bg-muted/60 rounded-xl shrink-0">
                  {workspace.iconEmoji || "📁"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
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

              {!isViewer && (
                <div
                  className="shrink-0 ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Удалить пространство</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
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
      </div>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить рабочее пространство?</DialogTitle>
            <DialogDescription className="text-xs">
              Вы уверены, что хотите удалить рабочее пространство «{workspace.name}»? Все документы в нем будут безвозвратно удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              className="text-xs cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs cursor-pointer"
            >
              Удалить навсегда
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
