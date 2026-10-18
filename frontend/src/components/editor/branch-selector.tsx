"use client";

import { useState } from "react";
import { GitBranch, Check, Plus, GitFork } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const mockBranches = [
  { name: "main", commit: "9f83c18b", current: true },
  { name: "feature/dag-sync", commit: "e3b0c442", current: false },
  { name: "editorial-review", commit: "4a28c9f1", current: false },
];

export function BranchSelector() {
  const [branches, setBranches] = useState(mockBranches);
  const currentBranch = branches.find((b) => b.current)?.name || "main";

  const handleSelect = (name: string) => {
    setBranches(
      branches.map((b) => ({
        ...b,
        current: b.name === name,
      }))
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs font-mono font-normal bg-background/50 border-border hover:bg-muted"
        >
          <GitBranch className="h-3.5 w-3.5 text-primary" />
          <span>{currentBranch}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ветки документа
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem
            key={b.name}
            onClick={() => handleSelect(b.name)}
            className="flex items-center justify-between text-xs font-mono cursor-pointer"
          >
            <span className="truncate">{b.name}</span>
            {b.current && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-primary">
          <Plus className="h-3.5 w-3.5" />
          <span>Создать ветку</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
