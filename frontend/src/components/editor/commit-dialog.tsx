"use client";

import { useState } from "react";
import { GitCommit, GitBranch, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranch: string;
  branches: string[];
  onCommit: (params: { message: string; description?: string; branch: string }) => Promise<void>;
  stats: { words: number; chars: number };
}

export function CommitDialog({
  open,
  onOpenChange,
  currentBranch,
  branches,
  onCommit,
  stats,
}: CommitDialogProps) {
  const { user } = useAuthStore();
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(currentBranch);
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedBranch(currentBranch);
      setIsNewBranch(false);
      setNewBranchName("");
      setMessage("");
      setDescription("");
      setError(null);
      setIsSubmitting(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Укажите заголовок коммита");
      return;
    }

    const branchToUse = isNewBranch ? newBranchName.trim() : selectedBranch;
    if (isNewBranch && !branchToUse) {
      setError("Укажите имя новой ветки");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCommit({
        message: trimmedMessage,
        description: description.trim() || undefined,
        branch: branchToUse,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Ошибка создания коммита");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <GitCommit className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Создать коммит (сохранение версии)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Зафиксируйте изменения в Merkle-DAG истории документа
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Commit Message */}
            <div className="space-y-1.5">
              <Label htmlFor="commit-msg" className="text-xs font-medium">
                Заголовок коммита <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commit-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Например: feat: добавлен раздел архитектуры YATA"
                className="h-8 text-xs"
                autoFocus
                required
              />
            </div>

            {/* Commit Description */}
            <div className="space-y-1.5">
              <Label htmlFor="commit-desc" className="text-xs font-medium text-muted-foreground">
                Подробное описание изменений (опционально)
              </Label>
              <Textarea
                id="commit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите детализацию правок, контекст или ссылки на задачи..."
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            {/* Branch Selection */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  <span>Ветка коммита</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsNewBranch(!isNewBranch)}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  {isNewBranch ? "Выбрать существующую ветку" : "+ Создать новую ветку для коммита"}
                </button>
              </div>

              {isNewBranch ? (
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="Например: feature/new-crdt-ordering"
                  className="h-8 text-xs font-mono"
                />
              ) : (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b} {b === currentBranch ? "(текущая)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Summary info card */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 flex items-center justify-between text-muted-foreground text-[11px]">
              <div>
                <span>Автор: </span>
                <span className="font-medium text-foreground">{user?.name || "Вы"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{stats.words} слов</span>
                <span>•</span>
                <span>{stats.chars} знаков</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !message.trim()}
              className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Фиксация...</span>
                </>
              ) : (
                <>
                  <GitCommit className="h-3.5 w-3.5" />
                  <span>Зафиксировать коммит</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
