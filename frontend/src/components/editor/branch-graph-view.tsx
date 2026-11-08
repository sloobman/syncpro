"use client";

import React, { useState } from "react";
import { GitBranch, GitCommit, Check, GitFork, Undo2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

export interface BranchInfo {
  name: string;
  headCommitId: string;
}

interface BranchGraphViewProps {
  commits: MerkleCommit[];
  currentCommitId: string;
  currentBranch?: string;
  branches?: BranchInfo[];
  onSelectCommit: (commitId: string) => void;
  onForkBranch?: (commitId: string) => void;
  onRevertCommit?: (commitId: string) => void;
  onDeleteCommit?: (commitId: string) => void;
  canEdit?: boolean;
  className?: string;
}

export function BranchGraphView({
  commits,
  currentCommitId,
  currentBranch = "main",
  branches = [],
  onSelectCommit,
  onForkBranch,
  onRevertCommit,
  onDeleteCommit,
  canEdit = true,
  className = "",
}: BranchGraphViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [revertTargetId, setRevertTargetId] = useState<string | null>(null);

  // Group branches by head commit ID
  const branchesByCommit = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of branches) {
      const list = map.get(b.headCommitId) || [];
      list.push(b.name);
      map.set(b.headCommitId, list);
    }
    return map;
  }, [branches]);

  const handleDeleteConfirm = () => {
    if (deleteTargetId && onDeleteCommit) {
      onDeleteCommit(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleRevertConfirm = () => {
    if (revertTargetId && onRevertCommit) {
      onRevertCommit(revertTargetId);
      setRevertTargetId(null);
    }
  };

  return (
    <div className={`space-y-3 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
        <span>История версий (DAG)</span>
        <span className="font-mono text-[11px] text-primary">
          #{currentCommitId ? currentCommitId.slice(0, 7) : "HEAD"}
        </span>
      </div>

      <div className="relative border-l-2 border-primary/30 ml-3 space-y-3.5 py-1">
        {commits.map((c) => {
          const isSelected = c.id === currentCommitId;
          const isMerge = c.parents.length > 1;
          const headBranches = branchesByCommit.get(c.id) || [];
          const hasBranchTag = headBranches.length > 0;

          return (
            <div
              key={c.id}
              onClick={() => onSelectCommit(c.id)}
              className={`relative pl-4 cursor-pointer group transition-all rounded-r p-2 ${
                isSelected
                  ? "bg-primary/10 border-l-2 border-primary -ml-[2px]"
                  : "hover:bg-muted/40"
              }`}
            >
              {/* DAG node dot */}
              <span
                className={`absolute -left-[5px] top-3 h-2 w-2 rounded-full transition-transform group-hover:scale-125 ${
                  isSelected
                    ? "bg-primary ring-2 ring-primary/30"
                    : isMerge
                    ? "bg-purple-500 ring-2 ring-purple-500/20"
                    : "bg-muted-foreground"
                }`}
              />

              {/* Header row: Icon + Message + Check */}
              <div className="flex items-start justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isMerge ? (
                    <GitBranch className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                  ) : (
                    <GitCommit className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-xs break-words line-clamp-2 font-medium ${
                      isSelected ? "text-foreground font-semibold" : "text-foreground/90"
                    }`}
                    title={c.message}
                  >
                    {c.message}
                  </p>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
              </div>

              {/* Branch badges tag bar */}
              {(hasBranchTag || c.branch) && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-5">
                  {headBranches.map((bName) => (
                    <Badge
                      key={bName}
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-mono ${
                        bName === currentBranch
                          ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                          : bName === "main"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      <GitBranch className="h-2.5 w-2.5 mr-0.5 inline" />
                      {bName}
                      {bName === currentBranch ? " (HEAD)" : ""}
                    </Badge>
                  ))}
                  {!hasBranchTag && c.branch && c.branch !== "main" && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 font-mono bg-muted text-muted-foreground"
                    >
                      {c.branch}
                    </Badge>
                  )}
                </div>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground pl-5">
                <span className="font-mono text-primary/80">#{c.id.slice(0, 7)}</span>
                <span>•</span>
                <span className="truncate max-w-[90px]">{c.author.name}</span>
                <span>•</span>
                <span>
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Action buttons (Fork / Revert / Delete) */}
              <div className="flex items-center gap-1 mt-2 pl-5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onForkBranch && canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 gap-1 hover:bg-primary/10 text-muted-foreground hover:text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onForkBranch(c.id);
                    }}
                    title="Создать ветку от этого коммита"
                  >
                    <GitFork className="h-2.5 w-2.5" />
                    <span>Ветка</span>
                  </Button>
                )}

                {onRevertCommit && canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 gap-1 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevertTargetId(c.id);
                    }}
                    title="Откатить документ к этой версии"
                  >
                    <Undo2 className="h-2.5 w-2.5" />
                    <span>Откат</span>
                  </Button>
                )}

                {onDeleteCommit && canEdit && commits.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 gap-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(c.id);
                    }}
                    title="Удалить этот коммит из истории"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span>Удалить</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open: boolean) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Удалить коммит?</DialogTitle>
            <DialogDescription>
              Коммит #{deleteTargetId?.slice(0, 7)} будет безвозвратно удален из Merkle-DAG.
              Дочерние коммиты будут автоматически перепривязаны к родительским узлам.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Удалить коммит
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <Dialog open={!!revertTargetId} onOpenChange={(open: boolean) => !open && setRevertTargetId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Откатить документ к выбранной версии?</DialogTitle>
            <DialogDescription>
              Будет создан новый коммит, восстанавливающий полный текст документа из версии #{revertTargetId?.slice(0, 7)}.
              Текущая история не будет потеряна.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRevertTargetId(null)}>
              Отмена
            </Button>
            <Button onClick={handleRevertConfirm}>
              Подтвердить откат
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
