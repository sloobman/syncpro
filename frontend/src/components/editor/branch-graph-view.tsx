"use client";

import React from "react";
import { GitBranch, GitCommit, Check } from "lucide-react";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

interface BranchGraphViewProps {
  commits: MerkleCommit[];
  currentCommitId: string;
  onSelectCommit: (commitId: string) => void;
  className?: string;
}

export function BranchGraphView({
  commits,
  currentCommitId,
  onSelectCommit,
  className = "",
}: BranchGraphViewProps) {
  return (
    <div className={`space-y-3 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
        <span>История версий (DAG)</span>
        <span className="font-mono text-[11px] text-primary">
          #{currentCommitId.slice(0, 7)}
        </span>
      </div>

      <div className="relative border-l-2 border-primary/30 ml-3 space-y-4 py-1">
        {commits.map((c) => {
          const isSelected = c.id === currentCommitId;
          const isMerge = c.parents.length > 1;

          return (
            <div
              key={c.id}
              onClick={() => onSelectCommit(c.id)}
              className={`relative pl-4 cursor-pointer group transition-all rounded-r p-1.5 ${
                isSelected
                  ? "bg-primary/10 border-l-2 border-primary -ml-[2px]"
                  : "hover:bg-muted/40"
              }`}
            >
              {/* DAG node dot */}
              <span
                className={`absolute -left-[5px] top-2.5 h-2 w-2 rounded-full transition-transform group-hover:scale-125 ${
                  isSelected
                    ? "bg-primary ring-2 ring-primary/30"
                    : isMerge
                    ? "bg-purple-500"
                    : "bg-muted-foreground"
                }`}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isMerge ? (
                    <GitBranch className="h-3 w-3 text-purple-500 shrink-0" />
                  ) : (
                    <GitCommit className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <p
                    className={`text-xs truncate font-medium ${
                      isSelected ? "text-foreground font-semibold" : "text-foreground/90"
                    }`}
                  >
                    {c.message}
                  </p>
                </div>
                {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                <span className="font-mono text-primary/80">{c.id.slice(0, 7)}</span>
                <span>•</span>
                <span>{c.author.name}</span>
                <span>•</span>
                <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
