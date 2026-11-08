"use client";

import React from "react";
import { Clock, RotateCcw, GitFork, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

interface TimeTravelSliderProps {
  commits: MerkleCommit[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onForkBranch?: (commitId: string) => void;
  onExitTimeTravel?: () => void;
  onRevertCommit?: (commitId: string) => void;
}

export function TimeTravelSlider({
  commits,
  currentIndex,
  onIndexChange,
  onForkBranch,
  onExitTimeTravel,
  onRevertCommit,
}: TimeTravelSliderProps) {
  if (commits.length === 0) return null;

  const currentCommit = commits[currentIndex] || commits[commits.length - 1];
  const isHistorical = currentIndex < commits.length - 1;

  return (
    <div
      data-testid="time-travel-slider"
      className="bg-card/95 border border-border/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-2.5 select-none w-full max-w-2xl mx-auto overflow-hidden"
    >
      {/* Header bar: status & actions with wrapping */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Commit indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground shrink-0 text-xs">
            {isHistorical ? "Time-Travel (чтение)" : "HEAD"}
          </span>
          <span className="font-mono text-[11px] text-primary px-1.5 py-0.5 rounded bg-primary/10 shrink-0">
            #{currentCommit.id.slice(0, 7)}
          </span>
          <span className="text-muted-foreground truncate max-w-[160px] sm:max-w-xs text-xs" title={currentCommit.message}>
            {currentCommit.message}
          </span>
        </div>

        {/* Right: Actions dock */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {isHistorical && onRevertCommit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 px-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              onClick={() => onRevertCommit(currentCommit.id)}
              title="Создать коммит-откат к этой версии"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Откатить сюда</span>
            </Button>
          )}

          {isHistorical && onForkBranch && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 px-2.5 cursor-pointer hover:bg-primary/10"
              onClick={() => onForkBranch(currentCommit.id)}
              title="Создать новую ветку от этого коммита"
            >
              <GitFork className="h-3.5 w-3.5 text-primary" />
              <span>Ветка отсюда</span>
            </Button>
          )}

          {isHistorical && onExitTimeTravel && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1 px-2.5 cursor-pointer shadow-xs"
              onClick={onExitTimeTravel}
              title="Вернуться к актуальному состоянию (HEAD)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>К HEAD</span>
            </Button>
          )}
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="flex items-center gap-3 pt-0.5">
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {commits[0] ? new Date(commits[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>

        <input
          type="range"
          min={0}
          max={commits.length - 1}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number.parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {commits[commits.length - 1]
            ? new Date(commits[commits.length - 1].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""}
        </span>
      </div>
    </div>
  );
}
