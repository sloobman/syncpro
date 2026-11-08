"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Send,
  GitMerge,
  FileDiff,
  MessageSquare,
  ListTree,
  GitBranch,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BranchGraphView, type BranchInfo } from "@/components/editor/branch-graph-view";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface CommentItem {
  id: string;
  author: string;
  avatarUrl?: string | null;
  time: string;
  text: string;
}

interface EditorSidebarProps {
  open: boolean;
  onToggle: () => void;
  documentId?: string;
  commits?: MerkleCommit[];
  currentCommitId?: string;
  currentBranch?: string;
  branches?: BranchInfo[];
  headings?: HeadingItem[];
  onSelectHeading?: (id: string) => void;
  onSelectCommit?: (id: string) => void;
  onForkBranch?: (commitId: string) => void;
  onRevertCommit?: (commitId: string) => void;
  onDeleteCommit?: (commitId: string) => void;
  onOpenMergeDialog?: () => void;
  onOpenDiffDialog?: () => void;
  canEdit?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Только что";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

export function EditorSidebar({
  open,
  onToggle,
  documentId,
  commits = [],
  currentCommitId = "",
  currentBranch = "main",
  branches = [],
  headings = [],
  onSelectHeading,
  onSelectCommit = () => {},
  onForkBranch,
  onRevertCommit,
  onDeleteCommit,
  onOpenMergeDialog,
  onOpenDiffDialog,
  canEdit = true,
}: EditorSidebarProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  // Load real comments from PostgreSQL API with async cancellation check
  useEffect(() => {
    let active = true;
    if (!documentId) return;

    fetch(`/api/documents/${documentId}/comments`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data.comments)) {
          setComments(
            data.comments.map((c: {
              id: string;
              authorName: string;
              authorAvatarUrl: string | null;
              createdAt: number;
              content: string;
            }) => ({
              id: c.id,
              author: c.authorName || "Пользователь",
              avatarUrl: c.authorAvatarUrl,
              time: formatRelativeTime(c.createdAt),
              text: c.content,
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [documentId]);

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    const trimmedText = commentText.trim();
    setIsSubmitting(true);

    const optimisticComment: CommentItem = {
      id: `temp_${Date.now()}`,
      author: user?.name || "Вы",
      avatarUrl: user?.avatarUrl || null,
      time: "Только что",
      text: trimmedText,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setCommentText("");

    if (documentId) {
      try {
        const res = await fetch(`/api/documents/${documentId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: trimmedText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.comment) {
            setComments((prev) =>
              prev.map((c) =>
                c.id === optimisticComment.id
                  ? {
                      id: data.comment.id,
                      author: data.comment.authorName,
                      avatarUrl: data.comment.authorAvatarUrl,
                      time: "Только что",
                      text: data.comment.content,
                    }
                  : c
              )
            );
          }
        }
      } catch {
        // Optimistic item remains
      }
    }

    setIsSubmitting(false);
  };

  if (!open) {
    return (
      <div className="border-l border-border bg-card/50 flex flex-col items-center py-2 px-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Открыть панель документа"
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
          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Свернуть панель"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
        <div className="px-2 pt-2 border-b border-border">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="toc" className="text-xs px-1 gap-1">
              <ListTree className="h-3 w-3" />
              <span>Оглавление</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs px-1 gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>Комменты ({comments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-1 gap-1">
              <GitBranch className="h-3 w-3" />
              <span>Ветки</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Table of contents */}
        <TabsContent value="toc" className="flex-1 p-0 m-0">
          <ScrollArea className="h-full p-3">
            <div className="space-y-1">
              {headings.length > 0 ? (
                headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onSelectHeading && onSelectHeading(h.id)}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground truncate cursor-pointer ${
                      h.level === 2 ? "pl-5 text-[11px]" : h.level === 3 ? "pl-8 text-[11px]" : "font-medium"
                    }`}
                  >
                    {h.text}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Заголовки не найдены</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Добавьте Заголовок 1 или 2, чтобы сформировать автоматическое оглавление
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments" className="flex-1 flex flex-col p-0 m-0 min-h-0">
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-5 w-5 shrink-0">
                          {c.avatarUrl ? (
                            <AvatarImage src={c.avatarUrl} alt={c.author} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                            {c.author.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {c.author}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {c.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                      {c.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Комментариев пока нет</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Напишите первый комментарий к документу ниже
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendComment} className="p-2.5 border-t border-border flex gap-1.5">
            <Input
              placeholder="Написать комментарий..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!commentText.trim() || isSubmitting}
              className="h-8 w-8 shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
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
                className="flex-1 h-7 text-[11px] gap-1 px-2 cursor-pointer"
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
                className="flex-1 h-7 text-[11px] gap-1 px-2 cursor-pointer"
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
              currentBranch={currentBranch}
              branches={branches}
              onSelectCommit={onSelectCommit}
              onForkBranch={onForkBranch}
              onRevertCommit={onRevertCommit}
              onDeleteCommit={onDeleteCommit}
              canEdit={canEdit}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
