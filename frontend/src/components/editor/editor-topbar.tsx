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
  Eye,
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
import { useAuthStore } from "@/lib/stores/auth-store";

export interface CollaboratorInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
}

export interface EditorTopbarProps {
  title?: string;
  onTitleChange?: (title: string) => void;
  canEdit?: boolean;
  roleTitle?: string;
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
  onlineUsers?: CollaboratorInfo[];
}

export function EditorTopbar({
  title = "Новый документ",
  onTitleChange,
  canEdit = true,
  roleTitle = "Редактор",
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
  onlineUsers = [],
}: EditorTopbarProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuthStore();

  const defaultUsers: CollaboratorInfo[] = [
    {
      id: user?.id || "u-current",
      name: user?.name ? `${user.name} (Вы)` : "Вы",
      avatarUrl: user?.avatarUrl || null,
      color: "bg-primary",
    },
  ];

  const displayUsers = onlineUsers.length > 0 ? onlineUsers : defaultUsers;

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
              readOnly={!canEdit}
              onChange={(e) => onTitleChange?.(e.target.value)}
              className={`text-xs sm:text-sm font-semibold text-foreground bg-transparent rounded px-1.5 py-0.5 truncate max-w-[180px] sm:max-w-xs md:max-w-md transition-colors ${
                canEdit
                  ? "border border-transparent hover:border-border focus:border-primary focus:bg-background/80"
                  : "border-transparent cursor-default"
              }`}
              title={canEdit ? "Нажмите, чтобы переименовать" : "Режим только для чтения"}
            />

            {!canEdit && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border flex items-center gap-1 shrink-0">
                <Eye className="h-3 w-3" />
                {roleTitle || "Читатель"}
              </span>
            )}

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
              onCreateBranch={canEdit ? onCreateBranch : undefined}
            />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Save status badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground pr-1">
            {!canEdit ? (
              <>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Только чтение</span>
              </>
            ) : saveStatus === "saving" ? (
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

          {/* Manual Save Button - only in edit mode */}
          {canEdit && onSave && (
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

          <PresenceAvatars users={displayUsers} />

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

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem onClick={onToggleHistory} className="gap-2 cursor-pointer">
                <History className="h-3.5 w-3.5" />
                <span>История версий (DAG)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleDiff} className="gap-2 cursor-pointer">
                <FileDiff className="h-3.5 w-3.5" />
                <span>Сравнить ветки (Diff)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportMarkdown} className="gap-2 cursor-pointer">
                <FileDown className="h-3.5 w-3.5" />
                <span>Экспорт в Markdown (.md)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPdf} className="gap-2 cursor-pointer">
                <Printer className="h-3.5 w-3.5" />
                <span>Печать / PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Поделиться документом</DialogTitle>
            <DialogDescription className="text-xs">
              Скопируйте прямую ссылку на документ для совместного просмотра и редактирования
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <Input
              readOnly
              value={typeof window !== "undefined" ? window.location.href : ""}
              className="text-xs font-mono bg-muted/40"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyShareLink}
              className="text-xs shrink-0 gap-1.5 cursor-pointer"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
