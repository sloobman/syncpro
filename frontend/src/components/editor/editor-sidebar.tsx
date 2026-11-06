"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Send,
  GitMerge,
  FileDiff,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { BranchGraphView } from "@/components/editor/branch-graph-view";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

const mockHeadings = [
  { id: "h1", text: "1. Концепция и цель проекта", level: 1 },
  { id: "h2", text: "1.1. Архитектурный стиль", level: 2 },
  { id: "h3", text: "1.2. Распределенная сходимость", level: 2 },
  { id: "h4", text: "2. Спецификация Merkle-CRDT", level: 1 },
  { id: "h5", text: "2.1. Формат дельт и RLE", level: 2 },
];

const mockComments = [
  {
    id: "c1",
    author: "Алиса",
    time: "10 мин назад",
    text: "Нужно уточнить размер буфера Redis Streams для синхронизации.",
  },
  {
    id: "c2",
    author: "Боб",
    time: "1 час назад",
    text: "Добавил спецификацию 3-Way CRDT Merge в секцию 2.",
  },
];

interface EditorSidebarProps {
  open: boolean;
  onToggle: () => void;
  commits?: MerkleCommit[];
  currentCommitId?: string;
  onSelectCommit?: (id: string) => void;
  onOpenMergeDialog?: () => void;
  onOpenDiffDialog?: () => void;
}

export function EditorSidebar({
  open,
  onToggle,
  commits = [],
  currentCommitId = "",
  onSelectCommit = () => {},
  onOpenMergeDialog,
  onOpenDiffDialog,
}: EditorSidebarProps) {
  const [commentText, setCommentText] = useState("");

  if (!open) {
    return (
      <div className="border-l border-border bg-card/50 flex flex-col items-center py-2 px-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-full z-10 shadow-sm select-none">
      <div className="flex items-center justify-between px-3 h-10 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Панель документа
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
        <div className="px-2 pt-2 border-b border-border">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="toc" className="text-xs px-1">
              Оглавление
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs px-1">
              Комменты
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-1">
              Ветки (DAG)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Table of contents */}
        <TabsContent value="toc" className="flex-1 p-0 m-0">
          <ScrollArea className="h-full p-3">
            <div className="space-y-1">
              {mockHeadings.map((h) => (
                <button
                  key={h.id}
                  className={`w-full text-left text-xs py-1.5 px-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground truncate ${
                    h.level === 2 ? "pl-5 text-[11px]" : "font-medium"
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments" className="flex-1 flex flex-col p-0 m-0 min-h-0">
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {mockComments.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {c.author}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-2.5 border-t border-border flex gap-1.5">
            <Input
              placeholder="Написать комментарий..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="icon" className="h-8 w-8 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>

        {/* Version control / branches */}
        <TabsContent value="history" className="flex-1 flex flex-col p-0 m-0 min-h-0">
          {/* Quick action buttons for 3-Way Merge & Diff */}
          <div className="p-2.5 border-b border-border flex gap-1.5 bg-muted/20">
            {onOpenMergeDialog && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenMergeDialog}
                className="flex-1 h-7 text-[11px] gap-1 px-2"
              >
                <GitMerge className="h-3 w-3 text-primary" />
                <span>3-Way Merge</span>
              </Button>
            )}
            {onOpenDiffDialog && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDiffDialog}
                className="flex-1 h-7 text-[11px] gap-1 px-2"
              >
                <FileDiff className="h-3 w-3 text-amber-500" />
                <span>Diff правок</span>
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 p-3">
            <BranchGraphView
              commits={commits}
              currentCommitId={currentCommitId}
              onSelectCommit={onSelectCommit}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
