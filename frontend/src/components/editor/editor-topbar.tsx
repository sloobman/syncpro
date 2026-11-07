"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  UserPlus,
  MoreVertical,
  Cloud,
  FileDown,
  Printer,
  History,
  FileDiff,
  Save,
  Check,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchSelector } from "@/components/editor/branch-selector";
import { PresenceAvatars } from "@/components/editor/presence-avatars";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const mockOnlineUsers = [
  { id: "u1", name: "Алиса", avatarUrl: null, color: "bg-blue-500" },
  { id: "u2", name: "Боб", avatarUrl: null, color: "bg-emerald-500" },
  { id: "u3", name: "Вы", avatarUrl: null, color: "bg-amber-500" },
];

export interface EditorTopbarProps {
  title?: string;
  onTitleChange?: (title: string) => void;
  currentBranch?: string;
  branches?: string[];
  onSelectBranch?: (b: string) => void;
  onCreateBranch?: (b: string) => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onToggleHistory?: () => void;
  onToggleDiff?: () => void;
  saveStatus?: "saved" | "saving" | "unsaved";
  onSave?: () => void;
}

export function EditorTopbar({
  title = "Новый документ",
  onTitleChange,
  currentBranch = "main",
  branches = ["main", "dev", "feature/crdt-ordering"],
  onSelectBranch,
  onCreateBranch,
  onExportMarkdown,
  onExportPdf,
  onToggleHistory,
  onToggleDiff,
  saveStatus = "saved",
  onSave,
}: EditorTopbarProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-border bg-card/85 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 select-none z-20">
        {/* Left controls */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            asChild
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-1.5 min-w-0">
            <input
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-foreground bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background/80 rounded px-1.5 py-0.5 truncate max-w-[180px] sm:max-w-xs md:max-w-md transition-colors"
              title="Нажмите, чтобы переименовать"
            />

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="text-muted-foreground hover:text-amber-500 transition-colors p-0.5 shrink-0 cursor-pointer"
              aria-label="Избранное"
              title={isFavorite ? "В избранном" : "Добавить в избранное"}
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  isFavorite ? "fill-amber-500 text-amber-500" : ""
                }`}
              />
            </button>
          </div>

          <div className="hidden md:flex items-center pl-1">
            <BranchSelector
              currentBranch={currentBranch}
              branches={branches}
              onSelectBranch={onSelectBranch}
              onCreateBranch={onCreateBranch}
            />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Save status badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground pr-1">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                <span className="text-amber-500">Сохранение...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Сохранено</span>
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Не сохранено</span>
              </>
            )}
          </div>

          {/* Manual Save Button */}
          {onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSave}
              className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Сохранить изменения (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Сохранить</span>
            </Button>
          )}

          <PresenceAvatars users={mockOnlineUsers} />

          <ThemeToggle />

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShareOpen(true)}
            className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Поделиться</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground cursor-pointer">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem
                onClick={onExportMarkdown}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5 text-primary" />
                <span>Экспорт в Markdown (.md)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportPdf}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Печать / Сохранить в PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onToggleHistory}
                className="flex items-center gap-2 cursor-pointer"
              >
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span>История коммитов (DAG)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleDiff}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileDiff className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Сравнение веток (Diff)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Поделиться документом</DialogTitle>
            <DialogDescription>
              Любой участник по этой ссылке сможет просматривать и редактировать документ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
                className="text-xs font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShareLink}
                className="shrink-0 gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Копировать
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
