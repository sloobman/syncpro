"use client";

import React, { useState, useMemo } from "react";
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
  headCommitId?: string;
  head_commit_id?: string;
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

const LANE_PALETTES = [
  {
    stroke: "#3b82f6",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    stroke: "#10b981",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    stroke: "#a855f7",
    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    stroke: "#f59e0b",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    stroke: "#f43f5e",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
];

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

  // Group branches by head commit ID supporting both camelCase and snake_case
  const branchesByCommit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of branches) {
      const headId = (b.headCommitId || b.head_commit_id || "").trim();
      if (!headId) continue;
      const list = map.get(headId) || [];
      if (!list.includes(b.name)) list.push(b.name);
      map.set(headId, list);
    }

    // Fallback: If "main" branch is not yet explicitly tagged on any commit in map,
    // tag the latest commit that belongs to "main" (or the root/head commit)
    const hasMainTag = Array.from(map.values()).some((names) => names.includes("main"));
    if (!hasMainTag && commits.length > 0) {
      const mainCommits = commits.filter((c) => !c.branch || c.branch === "main");
      const target = mainCommits.length > 0 ? mainCommits[mainCommits.length - 1] : commits[commits.length - 1];
      if (target) {
        const list = map.get(target.id) || [];
        if (!list.includes("main")) list.push("main");
        map.set(target.id, list);
      }
    }

    // Ensure the current active branch has a visible tag
    if (currentBranch && commits.length > 0) {
      const branchCommits = commits.filter((c) => c.branch === currentBranch);
      const headC = branchCommits.length > 0 ? branchCommits[branchCommits.length - 1] : commits[commits.length - 1];
      if (headC) {
        const list = map.get(headC.id) || [];
        if (!list.includes(currentBranch)) list.push(currentBranch);
        map.set(headC.id, list);
      }
    }

    return map;
  }, [branches, commits, currentBranch]);

  // Map each unique branch name to a distinct lane column index (2D DAG layout)
  const branchLanes = useMemo(() => {
    const lanes = new Map<string, number>();
    lanes.set("main", 0);
    let nextLane = 1;

    for (const c of commits) {
      const b = c.branch || "main";
      if (!lanes.has(b)) {
        lanes.set(b, nextLane++);
      }
    }

    for (const b of branches) {
      if (!lanes.has(b.name)) {
        lanes.set(b.name, nextLane++);
      }
    }

    return lanes;
  }, [commits, branches]);

  const numLanes = Math.max(1, branchLanes.size);
  const trackWidth = Math.max(28, numLanes * 18 + 10);
  const getLaneX = (lane: number) => 10 + lane * 18;

  // Map of commit IDs to their commit objects for fast parent lookups
  const commitMap = useMemo(() => {
    const map = new Map<string, MerkleCommit>();
    for (const c of commits) {
      map.set(c.id, c);
    }
    return map;
  }, [commits]);

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

      <div className="relative space-y-1.5 py-1">
        {commits.map((c, index) => {
          const isSelected = c.id === currentCommitId;
          const isMerge = c.parents.length > 1;
          const headBranches = branchesByCommit.get(c.id) || [];
          const cBranch = c.branch || "main";
          const lane = branchLanes.get(cBranch) || 0;
          const palette = LANE_PALETTES[lane % LANE_PALETTES.length];
          const commitX = getLaneX(lane);
          const commitY = 16;

          // Determine parent lanes for curves
          const parent1 = c.parents[0] ? commitMap.get(c.parents[0]) : null;
          const parent1Lane = parent1 ? (branchLanes.get(parent1.branch || "main") || 0) : lane;
          const parent1X = getLaneX(parent1Lane);

          const parent2 = c.parents[1] ? commitMap.get(c.parents[1]) : null;
          const parent2Lane = parent2 ? (branchLanes.get(parent2.branch || "main") || 0) : null;
          const parent2X = parent2Lane !== null ? getLaneX(parent2Lane) : null;

          const isLastCommit = index === commits.length - 1;

          return (
            <div
              key={c.id}
              onClick={() => onSelectCommit(c.id)}
              className={`flex items-start cursor-pointer group transition-all rounded p-1.5 ${
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/40 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              {/* 2D DAG SVG Branch Tracks Column */}
              <div
                className="relative shrink-0 self-stretch"
                style={{ width: `${trackWidth}px`, minHeight: "44px" }}
              >
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Pass-through lines for other lanes */}
                  {Array.from(branchLanes.values()).map((l) => {
                    if (l === lane) return null;
                    const lx = getLaneX(l);
                    const lColor = LANE_PALETTES[l % LANE_PALETTES.length].stroke;
                    return (
                      <line
                        key={l}
                        x1={lx}
                        y1={0}
                        x2={lx}
                        y2="100%"
                        stroke={lColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.3}
                      />
                    );
                  })}

                  {/* Incoming line from top (from previous commit on same or parent lane) */}
                  {index > 0 && (
                    parent1Lane === lane ? (
                      <line
                        x1={commitX}
                        y1={0}
                        x2={commitX}
                        y2={commitY}
                        stroke={palette.stroke}
                        strokeWidth={2}
                      />
                    ) : (
                      /* Fork bezier curve branching out */
                      <path
                        d={`M ${parent1X} 0 C ${parent1X} 8, ${commitX} 8, ${commitX} ${commitY}`}
                        fill="none"
                        stroke={palette.stroke}
                        strokeWidth={2}
                      />
                    )
                  )}

                  {/* Secondary parent merge curve for merge commits */}
                  {isMerge && parent2X !== null && (
                    <path
                      d={`M ${parent2X} 0 C ${parent2X} 8, ${commitX} 8, ${commitX} ${commitY}`}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth={2}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Outgoing line down to next commit */}
                  {!isLastCommit && (
                    <line
                      x1={commitX}
                      y1={commitY}
                      x2={commitX}
                      y2="100%"
                      stroke={palette.stroke}
                      strokeWidth={2}
                    />
                  )}

                  {/* Commit node circle */}
                  <circle
                    cx={commitX}
                    cy={commitY}
                    r={isSelected ? 5.5 : 4.5}
                    fill={isMerge ? "#a855f7" : palette.stroke}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />

                  {/* Active selection pulse ring */}
                  {isSelected && (
                    <circle
                      cx={commitX}
                      cy={commitY}
                      r={8}
                      fill="none"
                      stroke={palette.stroke}
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                      className="animate-pulse"
                    />
                  )}
                </svg>
              </div>

              {/* Commit Content Card */}
              <div className="flex-1 min-w-0 pl-1">
                {/* Header row: Icon + Message + Checkmark */}
                <div className="flex items-start justify-between gap-1 min-w-0">
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

                {/* Branch badges tag bar with HEAD indicators */}
                {(headBranches.length > 0 || (c.branch && c.branch !== "main")) && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {headBranches.map((bName) => {
                      const bLane = branchLanes.get(bName) || 0;
                      const bPalette = LANE_PALETTES[bLane % LANE_PALETTES.length];
                      const isCurrent = bName === currentBranch;
                      return (
                        <Badge
                          key={bName}
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-mono ${
                            isCurrent
                              ? "bg-primary/20 text-primary border-primary/50 font-bold"
                              : bPalette.badge
                          }`}
                        >
                          <GitBranch className="h-2.5 w-2.5 mr-0.5 inline" />
                          {bName}
                          {isCurrent ? " (HEAD)" : ""}
                        </Badge>
                      );
                    })}

                    {headBranches.length === 0 && c.branch && c.branch !== "main" && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 font-mono ${palette.badge}`}
                      >
                        <GitBranch className="h-2 w-2 mr-0.5 inline" />
                        {c.branch}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Metadata row: Hash • Author • Timestamp */}
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  <span className="font-mono text-primary/80">#{c.id.slice(0, 7)}</span>
                  <span>•</span>
                  <span className="truncate max-w-[85px]">{c.author.name}</span>
                  <span>•</span>
                  <span>
                    {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Action buttons (Fork / Revert / Delete) on hover or selection */}
                <div className={`flex items-center gap-1 mt-1.5 transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
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
