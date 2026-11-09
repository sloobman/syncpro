"use client";

import React, { useState, useMemo } from "react";
import { computeCharacterDiff, groupDiffItems } from "@/lib/merkle-dag/diff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
}

function cleanHtmlTags(str: string): string {
  if (!str) return "";
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n");
}

export function DiffViewer({
  oldText,
  newText,
  oldLabel = "Базовая версия",
  newLabel = "Новая версия",
  className = "",
}: DiffViewerProps) {
  const [showRawSource, setShowRawSource] = useState(false);

  const processedOld = useMemo(() => {
    return showRawSource ? oldText : cleanHtmlTags(oldText);
  }, [oldText, showRawSource]);

  const processedNew = useMemo(() => {
    return showRawSource ? newText : cleanHtmlTags(newText);
  }, [newText, showRawSource]);

  const groups = useMemo(() => {
    const raw = computeCharacterDiff(processedOld, processedNew);
    return groupDiffItems(raw);
  }, [processedOld, processedNew]);

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
      {/* Header with stats and mode toggle */}
      <div className="h-10 px-4 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium">
          <span>Сравнение изменений:</span>
          <span className="text-muted-foreground">{oldLabel} → {newLabel}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRawSource((v) => !v)}
            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            title={showRawSource ? "Показать чистый текст без тегов" : "Показать исходную разметку"}
          >
            {showRawSource ? (
              <>
                <Eye className="h-3 w-3" />
                <span>Чистый текст</span>
              </>
            ) : (
              <>
                <Code className="h-3 w-3" />
                <span>Исходный код</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30 text-[11px]">
              +{stats.added} симв.
            </Badge>
            <Badge variant="outline" className="text-rose-600 bg-rose-500/10 border-rose-500/30 text-[11px]">
              -{stats.removed} симв.
            </Badge>
          </div>
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
