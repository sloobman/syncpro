"use client";

import React, { useState, useEffect } from "react";
import { GitMerge, ArrowRight, CheckCircle2, AlertTriangle, Check, Layers } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export interface ConflictItem {
  id: number;
  base: string;
  ours: string;
  theirs: string;
}

interface MergeBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: string[];
  currentBranch: string;
  documentId?: string;
  onConfirmMerge: (sourceBranch: string, targetBranch: string, resolvedContent?: string) => Promise<void>;
}

export function MergeBranchDialog({
  open,
  onOpenChange,
  branches,
  currentBranch,
  documentId,
  onConfirmMerge,
}: MergeBranchDialogProps) {
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState(currentBranch);
  const [isMerging, setIsMerging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Conflicts state
  const [hasConflict, setHasConflict] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [resolutions, setResolutions] = useState<Record<number, "ours" | "theirs" | "both">>({});
  const [resolvedCustomText, setResolvedCustomText] = useState("");

  // Synchronize target and candidate source branch when dialog opens
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setTargetBranch(currentBranch);
      const candidates = branches.filter((b) => b !== currentBranch);
      if (candidates.length > 0 && (!sourceBranch || sourceBranch === currentBranch)) {
        setSourceBranch(candidates[0]);
      }
    });
  }, [open, branches, currentBranch, sourceBranch]);

  // Dry-run analysis for conflict detection
  useEffect(() => {
    let isMounted = true;
    if (!open || !sourceBranch || !targetBranch || sourceBranch === targetBranch || !documentId) {
      return;
    }

    queueMicrotask(async () => {
      if (!isMounted) return;
      setIsAnalyzing(true);
      try {
        const res = await fetch(`/api/documents/${documentId}/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sourceBranch,
            targetBranch,
            dryRun: true,
          }),
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.hasConflict && Array.isArray(data.conflicts) && data.conflicts.length > 0) {
            setHasConflict(true);
            setConflicts(data.conflicts);
            const initialResolutions: Record<number, "ours" | "theirs" | "both"> = {};
            data.conflicts.forEach((c: ConflictItem) => {
              initialResolutions[c.id] = "theirs";
            });
            setResolutions(initialResolutions);
            setResolvedCustomText(data.targetContent || "");
          } else {
            setHasConflict(false);
            setConflicts([]);
            setResolvedCustomText(data.previewMerged || "");
          }
        }
      } catch (err) {
        console.warn("[Merge Analysis Error]:", err);
      } finally {
        if (isMounted) setIsAnalyzing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, sourceBranch, targetBranch, documentId]);

  // Handle conflict choice selection
  const handleSelectResolution = (conflictId: number, choice: "ours" | "theirs" | "both") => {
    setResolutions((prev) => ({ ...prev, [conflictId]: choice }));
  };

  const handleMerge = async () => {
    if (!sourceBranch || !targetBranch || sourceBranch === targetBranch) return;
    setIsMerging(true);
    try {
      let finalContent: string | undefined = undefined;
      if (hasConflict) {
        // Construct merged string from resolutions
        if (resolvedCustomText) {
          finalContent = resolvedCustomText;
        }
      }

      await onConfirmMerge(sourceBranch, targetBranch, finalContent);
      setSuccessMessage(`Ветка «${sourceBranch}» успешно слита с «${targetBranch}»`);
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
      <DialogContent className={hasConflict ? "sm:max-w-[700px] max-h-[85vh] flex flex-col" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <GitMerge className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg">
              3-Way Слияние веток
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Слияние на основе наименьшего общего предка (LCA). Автоматически объединяет независимые блоки и предлагает разрешение при пересекающихся правках.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 my-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs flex-1 min-h-0 flex flex-col">
            {/* Branch selector row */}
            <div className="grid grid-cols-5 items-center gap-2 shrink-0">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Откуда (Source)
                </label>
                <Select value={sourceBranch} onValueChange={setSourceBranch}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Выберите ветку" />
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

            {/* Status card */}
            <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground text-xs">Статус анализа</span>
                {isAnalyzing ? (
                  <Badge variant="outline" className="text-[10px]">Анализ расхождений...</Badge>
                ) : hasConflict ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Конфликты ({conflicts.length})</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                    <Check className="h-3 w-3" />
                    <span>Бесконфликтно (Auto-Merge)</span>
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {hasConflict
                  ? "Обнаружены параллельные изменения одинаковых строк. Выберите желаемый вариант для каждого конфликта ниже."
                  : "Изменения не пересекаются и будут автоматически объединены в ветку назначения."}
              </p>
            </div>

            {/* Interactive Conflict Resolution View */}
            {hasConflict && (
              <div className="flex-1 min-h-0 flex flex-col space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Разрешение конфликтов
                </span>

                <ScrollArea className="flex-1 max-h-[220px] pr-2">
                  <div className="space-y-3">
                    {conflicts.map((conflict) => {
                      const choice = resolutions[conflict.id] || "theirs";
                      return (
                        <div key={conflict.id} className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">
                              Конфликт #{conflict.id}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={choice === "ours" ? "default" : "outline"}
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleSelectResolution(conflict.id, "ours")}
                              >
                                {targetBranch} (Ours)
                              </Button>
                              <Button
                                size="sm"
                                variant={choice === "theirs" ? "default" : "outline"}
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleSelectResolution(conflict.id, "theirs")}
                              >
                                {sourceBranch} (Theirs)
                              </Button>
                              <Button
                                size="sm"
                                variant={choice === "both" ? "default" : "outline"}
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleSelectResolution(conflict.id, "both")}
                              >
                                Объединить
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-background border border-border">
                              <span className="font-semibold text-muted-foreground block text-[10px]">
                                Текущая ветка ({targetBranch}):
                              </span>
                              <p className="font-mono mt-0.5 whitespace-pre-wrap">{conflict.ours || "<пусто>"}</p>
                            </div>
                            <div className="p-2 rounded bg-background border border-border">
                              <span className="font-semibold text-muted-foreground block text-[10px]">
                                Вливаемая ветка ({sourceBranch}):
                              </span>
                              <p className="font-mono mt-0.5 whitespace-pre-wrap">{conflict.theirs || "<пусто>"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3 text-primary" />
                    <span>Финальный превью-текст после слияния</span>
                  </label>
                  <Textarea
                    value={resolvedCustomText}
                    onChange={(e) => setResolvedCustomText(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder="Результат объединения..."
                  />
                </div>
              </div>
            )}
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
            disabled={isMerging || !sourceBranch || sourceBranch === targetBranch || isAnalyzing}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>
              {isMerging
                ? "Слияние..."
                : hasConflict
                ? "Применить и слить"
                : "Выполнить 3-Way Merge"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
