"use client";

import { useState } from "react";
import { GitBranch, Check, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Button } from "@/components/ui/button";

export interface BranchSelectorProps {
  currentBranch?: string;
  branches?: string[];
  onSelectBranch?: (b: string) => void;
  onCreateBranch?: (b: string) => void;
}

export function BranchSelector({
  currentBranch = "main",
  branches = ["main", "dev", "feature/crdt-ordering"],
  onSelectBranch,
  onCreateBranch,
}: BranchSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBranchName.trim().replace(/\s+/g, "-");
    if (clean && onCreateBranch) {
      onCreateBranch(clean);
      setNewBranchName("");
      setCreateOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs font-mono font-normal bg-background/50 border-border hover:bg-muted cursor-pointer"
          >
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span>{currentBranch}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 text-xs">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ветки документа
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {branches.map((b) => (
            <DropdownMenuItem
              key={b}
              onClick={() => onSelectBranch && onSelectBranch(b)}
              className="flex items-center justify-between text-xs font-mono cursor-pointer"
            >
              <span className="truncate">{b}</span>
              {b === currentBranch && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="gap-2 text-xs cursor-pointer text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Создать ветку...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Branch Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Создать новую ветку</DialogTitle>
              <DialogDescription>
                Создайте изолированную ветку от текущего состояния «{currentBranch}»
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="например: feature/new-section"
                required
                autoFocus
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={!newBranchName.trim()}>
                Создать и переключиться
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
