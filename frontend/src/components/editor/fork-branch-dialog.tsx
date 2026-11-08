"use client";

import React, { useState } from "react";
import { GitFork, GitCommit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

interface ForkBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCommit: MerkleCommit | null;
  existingBranches?: string[];
  onConfirmFork: (branchName: string, sourceCommitId: string) => void;
}

export function ForkBranchDialog({
  open,
  onOpenChange,
  sourceCommit,
  existingBranches = [],
  onConfirmFork,
}: ForkBranchDialogProps) {
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = branchName.trim().replace(/\s+/g, "-");
    if (!clean) {
      setError("Укажите имя ветки");
      return;
    }
    if (existingBranches.includes(clean)) {
      setError(`Ветка «${clean}» уже существует`);
      return;
    }
    if (!sourceCommit) {
      setError("Базовый коммит не выбран");
      return;
    }

    setError(null);
    onConfirmFork(clean, sourceCommit.id);
    setBranchName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <GitFork className="h-4 w-4" />
              </div>
              <DialogTitle>Создать ветку от коммита</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Создайте новую изолированную ветку истории, начиная с выбранной точки Merkle-DAG.
            </DialogDescription>
          </DialogHeader>

          {sourceCommit && (
            <div className="my-3 p-3 rounded-xl border border-border bg-muted/30 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <GitCommit className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-mono text-primary">#{sourceCommit.id.slice(0, 7)}</span>
                <span className="truncate">{sourceCommit.message}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pl-5">
                Автор: {sourceCommit.author.name} • Ветка источника: {sourceCommit.branch}
              </p>
            </div>
          )}

          <div className="space-y-1.5 py-2">
            <label className="text-xs font-medium text-foreground">
              Название новой ветки
            </label>
            <Input
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="например: feature/new-algorithm"
              required
              autoFocus
              className="font-mono text-xs"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!branchName.trim()}
              className="gap-1.5 cursor-pointer"
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Создать и перейти</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
