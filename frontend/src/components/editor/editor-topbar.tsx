"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Star,
  UserPlus,
  MoreVertical,
  Cloud,
  FileDown,
  FileUp,
  Printer,
  History,
  FileDiff,
  GitCommit,
  Check,
  Copy,
  Loader2,
  Eye,
  Trash2,
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
  DialogFooter,
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
  onExportMarkdownZip?: () => void;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
  onExportOdt?: () => void;
  onExportTxt?: () => void;
  onImportFile?: (file: File) => void;
  onImportMarkdown?: (content: string, filename?: string) => void;
  onDeleteDocument?: () => void;
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
  onExportMarkdownZip,
  onExportPdf,
  onExportDocx,
  onExportOdt,
  onExportTxt,
  onImportFile,
  onImportMarkdown,
  onDeleteDocument,
  onToggleHistory,
  onToggleDiff,
  saveStatus = "saved",
  onSave,
  onlineUsers = [],
}: EditorTopbarProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onImportFile) {
      onImportFile(file);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === "string" && onImportMarkdown) {
        onImportMarkdown(content, file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      {/* Hidden file input for document import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".docx,.odt,.doc,.txt,.md,.markdown"
        className="hidden"
        onChange={handleFileChange}
      />

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
                <span className="text-amber-500">Автосохранение...</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Черновик сохранён</span>
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Не сохранено</span>
              </>
            )}
          </div>

          {/* Commit Button (Meaningful Commit Dialog) - only in edit mode */}
          {canEdit && onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSave}
              className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Создать осмысленный коммит (Ctrl+S)"
            >
              <GitCommit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Закоммитить</span>
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
              {canEdit && (onImportFile || onImportMarkdown) && (
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 cursor-pointer text-primary focus:text-primary font-medium"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  <span>Импортировать (.docx, .odt, .doc, .txt, .md)</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onExportDocx && (
                <DropdownMenuItem onClick={onExportDocx} className="gap-2 cursor-pointer">
                  <FileDown className="h-3.5 w-3.5 text-blue-500" />
                  <span>Экспорт в Word (.docx)</span>
                </DropdownMenuItem>
              )}
              {onExportOdt && (
                <DropdownMenuItem onClick={onExportOdt} className="gap-2 cursor-pointer">
                  <FileDown className="h-3.5 w-3.5 text-amber-500" />
                  <span>Экспорт в OpenDocument (.odt)</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onExportMarkdown} className="gap-2 cursor-pointer">
                <FileDown className="h-3.5 w-3.5" />
                <span>Экспорт в Markdown (.md)</span>
              </DropdownMenuItem>
              {onExportMarkdownZip && (
                <DropdownMenuItem onClick={onExportMarkdownZip} className="gap-2 cursor-pointer">
                  <FileDown className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Экспорт в Markdown ZIP с медиа (.zip)</span>
                </DropdownMenuItem>
              )}
              {onExportTxt && (
                <DropdownMenuItem onClick={onExportTxt} className="gap-2 cursor-pointer">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Экспорт в Текст (.txt)</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onExportPdf} className="gap-2 cursor-pointer">
                <Printer className="h-3.5 w-3.5" />
                <span>Печать / Сохранить как PDF</span>
              </DropdownMenuItem>

              {canEdit && onDeleteDocument && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Удалить документ</span>
                  </DropdownMenuItem>
                </>
              )}
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

      {/* Delete Document Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить документ?</DialogTitle>
            <DialogDescription className="text-xs">
              Вы действительно хотите удалить документ «{title}»? Все ветки, история коммитов и данные будут безвозвратно удалены.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteConfirmOpen(false);
                onDeleteDocument?.();
              }}
              className="text-xs cursor-pointer"
            >
              Удалить навсегда
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
