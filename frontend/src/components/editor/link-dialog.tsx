"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Trash2 } from "lucide-react";

export interface LinkData {
  url: string;
  text: string;
  openInNewTab: boolean;
}

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  initialText?: string;
  initialTarget?: boolean;
  onSave: (linkData: LinkData) => void;
  onRemove?: () => void;
}

export function LinkDialog({
  open,
  onOpenChange,
  initialUrl = "",
  initialText = "",
  initialTarget = true,
  onSave,
  onRemove,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [openInNewTab, setOpenInNewTab] = useState(initialTarget);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUrl(initialUrl || "");
      setText(initialText || "");
      setOpenInNewTab(initialTarget ?? true);
      setError(null);
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setError("Пожалуйста, введите адрес ссылки");
      return;
    }

    // Auto-prepend https:// if no protocol is given
    let formattedUrl = cleanUrl;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Disallow javascript: or vbscript: or data:
    if (/^(?:javascript|vbscript|data:text\/html):/i.test(formattedUrl)) {
      setError("Указан небезопасный протокол ссылки");
      return;
    }

    onSave({
      url: formattedUrl,
      text: text.trim() || formattedUrl,
      openInNewTab,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm editor-ui-control">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <LinkIcon className="h-4 w-4 text-primary" />
            {initialUrl ? "Редактирование ссылки" : "Вставка ссылки"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs">
          <div>
            <Label className="text-[11px] text-muted-foreground">Текст ссылки</Label>
            <Input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Отображаемый текст..."
              className="h-8 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Адрес ссылки (URL)</Label>
            <Input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://example.com"
              className="h-8 text-xs mt-1"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="openInNewTab"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer accent-primary"
            />
            <Label htmlFor="openInNewTab" className="text-xs cursor-pointer select-none">
              Открывать в новой вкладке
            </Label>
          </div>

          {error && (
            <p className="text-[11px] text-destructive">{error}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            {initialUrl && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 mr-auto gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Удалить</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs cursor-pointer"
            >
              {initialUrl ? "Сохранить" : "Вставить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
