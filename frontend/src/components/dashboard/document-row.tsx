"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, GitBranch, MoreVertical, FileText, Copy, Trash2, Edit3, ExternalLink, Eye } from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/format";

interface DocumentRowProps {
  document: Document;
  readOnly?: boolean;
  onToggleFavorite?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentRow({
  document,
  readOnly = false,
  onToggleFavorite,
  onRename,
  onDuplicate,
  onDelete,
}: DocumentRowProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(document.title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && onRename && !readOnly) {
      onRename(document.id, newTitle.trim());
      setRenameOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors group border-b border-border last:border-0">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <button
            onClick={() => onToggleFavorite && onToggleFavorite(document.id)}
            className="text-muted-foreground/60 hover:text-amber-500 transition-colors p-1 cursor-pointer"
            aria-label="В избранное"
          >
            <Star
              className={`h-4 w-4 ${
                document.isFavorite ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
          </button>

          <Link href={`/doc/${document.id}`} className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                  {document.title}
                </span>
                {readOnly && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal shrink-0 gap-1 py-0">
                    <Eye className="h-2.5 w-2.5" />
                    Чтение
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{formatRelativeTime(document.updatedAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {document.defaultBranch || "main"}
                </span>
                {document.wordCount !== undefined && document.wordCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{document.wordCount} слов</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem asChild>
                <Link href={`/doc/${document.id}`} className="flex items-center gap-2 cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Открыть</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/doc/${document.id}`);
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Копировать ссылку</span>
              </DropdownMenuItem>

              {!readOnly && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewTitle(document.title);
                      setRenameOpen(true);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Переименовать</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDuplicate && onDuplicate(document.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Дублировать</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Удалить</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rename Dialog */}
      {!readOnly && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleRenameSubmit}>
              <DialogHeader>
                <DialogTitle>Переименовать документ</DialogTitle>
                <DialogDescription>
                  Укажите новое название для выбранного документа
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название документа..."
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={!newTitle.trim() || newTitle === document.title}>
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {!readOnly && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Удалить документ?</DialogTitle>
              <DialogDescription>
                Вы действительно хотите удалить документ «{document.title}»? Это действие необратимо.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (onDelete) onDelete(document.id);
                  setDeleteOpen(false);
                }}
              >
                Удалить навсегда
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
