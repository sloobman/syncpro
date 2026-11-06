"use client";

import React from "react";
import { Clock, RotateCcw, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

interface TimeTravelSliderProps {
  commits: MerkleCommit[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onForkBranch?: (commitId: string) => void;
  onExitTimeTravel?: () => void;
}

export function TimeTravelSlider({
  commits,
  currentIndex,
  onIndexChange,
  onForkBranch,
  onExitTimeTravel,
}: TimeTravelSliderProps) {
  if (commits.length === 0) return null;

  const currentCommit = commits[currentIndex] || commits[commits.length - 1];
  const isHistorical = currentIndex < commits.length - 1;

  return (
    <div className="bg-card/95 border-t border-border px-4 py-2.5 shadow-md flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500 animate-spin-slow" />
          <span className="font-semibold text-foreground">
            {isHistorical ? "Режим Time-Travel (Только чтение)" : "Текущая версия (HEAD)"}
          </span>
          <span className="font-mono text-xs text-primary px-1.5 py-0.5 rounded bg-primary/10">
            {currentCommit.id.slice(0, 7)}
          </span>
          <span className="text-muted-foreground truncate max-w-xs">
            {currentCommit.message}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHistorical && onForkBranch && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => onForkBranch(currentCommit.id)}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Создать ветку отсюда</span>
            </Button>
          )}

          {isHistorical && onExitTimeTravel && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1.5"
              onClick={onExitTimeTravel}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Вернуться в HEAD</span>
            </Button>
          )}
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-muted-foreground">
          {new Date(commits[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <input
          type="range"
          min={0}
          max={commits.length - 1}
          value={currentIndex}
          onChange={(e) => onIndexChange(Number.parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <span className="text-[11px] font-mono text-muted-foreground">
          {new Date(commits[commits.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
