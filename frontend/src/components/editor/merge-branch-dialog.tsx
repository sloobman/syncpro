"use client";

import React, { useState } from "react";
import { GitMerge, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface MergeBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: string[];
  currentBranch: string;
  onConfirmMerge: (sourceBranch: string, targetBranch: string) => Promise<void>;
}

export function MergeBranchDialog({
  open,
  onOpenChange,
  branches,
  currentBranch,
  onConfirmMerge,
}: MergeBranchDialogProps) {
  const [sourceBranch, setSourceBranch] = useState(
    branches.find((b) => b !== currentBranch) || ""
  );
  const [targetBranch, setTargetBranch] = useState(currentBranch);
  const [isMerging, setIsMerging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMerge = async () => {
    if (!sourceBranch || !targetBranch || sourceBranch === targetBranch) return;
    setIsMerging(true);
    try {
      await onConfirmMerge(sourceBranch, targetBranch);
      setSuccessMessage(`Ветка ${sourceBranch} успешно объединена с ${targetBranch} (0 конфликтов)`);
      setTimeout(() => {
        setSuccessMessage(null);
        onOpenChange(false);
      }, 1500);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <GitMerge className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg">
              3-Way CRDT Слияние веток
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1.5">
            Слияние выполняется алгоритмом CRDT на основе общего предка (LCA).
            Все параллельные изменения объединяются автоматически без ручных маркеров конфликтов.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-5 items-center gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Откуда (Source)
                </label>
                <Select value={sourceBranch} onValueChange={setSourceBranch}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Ветка" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b !== targetBranch)
                      .map((b) => (
                        <SelectItem key={b} value={b} className="font-mono text-xs">
                          {b}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 flex justify-center pt-5">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Куда (Target)
                </label>
                <Select value={targetBranch} onValueChange={setTargetBranch}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Ветка" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b} value={b} className="font-mono text-xs">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Статус слияния</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Бесконфликтно (CRDT)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Дельты обеих веток относительно наименьшего общего предка будут рассчитаны и применены в соответствии с правилами математического ядра YATA.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
            className="text-xs"
          >
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleMerge}
            disabled={isMerging || !sourceBranch || sourceBranch === targetBranch}
            className="text-xs gap-1.5"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{isMerging ? "Слияние..." : "Выполнить 3-Way Merge"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
