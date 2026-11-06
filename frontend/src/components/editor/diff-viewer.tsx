"use client";

import React, { useMemo } from "react";
import { computeCharacterDiff, groupDiffItems } from "@/lib/merkle-dag/diff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
}

export function DiffViewer({
  oldText,
  newText,
  oldLabel = "Базовая версия",
  newLabel = "Новая версия",
  className = "",
}: DiffViewerProps) {
  const groups = useMemo(() => {
    const raw = computeCharacterDiff(oldText, newText);
    return groupDiffItems(raw);
  }, [oldText, newText]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const g of groups) {
      if (g.type === "added") added += g.text.length;
      if (g.type === "removed") removed += g.text.length;
    }
    return { added, removed };
  }, [groups]);

  return (
    <div className={`border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* Header with stats */}
      <div className="h-10 px-4 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium">
          <span>Сравнение изменений:</span>
          <span className="text-muted-foreground">{oldLabel} → {newLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30 text-[11px]">
            +{stats.added} симв.
          </Badge>
          <Badge variant="outline" className="text-rose-600 bg-rose-500/10 border-rose-500/30 text-[11px]">
            -{stats.removed} симв.
          </Badge>
        </div>
      </div>

      {/* Diff body */}
      <ScrollArea className="p-4 sm:p-6 max-h-[450px]">
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
          {groups.map((group, idx) => {
            if (group.type === "added") {
              return (
                <span
                  key={idx}
                  className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 px-0.5 rounded-sm font-medium"
                >
                  {group.text}
                </span>
              );
            }
            if (group.type === "removed") {
              return (
                <span
                  key={idx}
                  className="bg-rose-500/20 text-rose-800 dark:text-rose-200 line-through px-0.5 rounded-sm opacity-70"
                >
                  {group.text}
                </span>
              );
            }
            return <span key={idx} className="text-foreground">{group.text}</span>;
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
