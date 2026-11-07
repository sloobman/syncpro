"use client";

import { Wifi, Users, GitBranch } from "lucide-react";

export function EditorStatusbar({
  wordCount = 2450,
  charCount = 14380,
  activeUsers = 3,
  branch = "main",
}: {
  wordCount?: number;
  charCount?: number;
  activeUsers?: number;
  branch?: string;
}) {
  return (
    <footer className="h-6 border-t border-border bg-muted/40 px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none z-10">
      <div className="flex items-center gap-3">
        <span>Слова: {wordCount.toLocaleString("ru-RU")}</span>
        <span>•</span>
        <span>Символы: {charCount.toLocaleString("ru-RU")}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <Wifi className="h-3 w-3 text-emerald-500" />
          <span>Онлайн (CRDT Sync)</span>
        </div>

        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{activeUsers}</span>
        </div>

        <div className="flex items-center gap-1 font-mono">
          <GitBranch className="h-3 w-3" />
          <span>{branch}</span>
        </div>
      </div>
    </footer>
  );
}
