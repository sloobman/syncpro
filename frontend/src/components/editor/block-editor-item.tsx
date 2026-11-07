"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { BlockNode, BlockType } from "@/lib/crdt/types";
import { RichTextRenderer } from "./rich-text-renderer";
import {
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  CheckSquare,
  List,
  ListOrdered,
  Code,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Plus,
  Trash2,
  Copy,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface BlockEditorItemProps {
  block: BlockNode;
  text: string;
  canEdit: boolean;
  isActive: boolean;
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onChangeType: (newType: BlockType) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
}

// Table Markdown parser & serializer
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: ["Параметр", "Значение"],
      rows: [
        ["Статус", "В процессе"],
        ["Приоритет", "Высокий"],
      ],
    };
  }

  const tableLines = lines.filter((l) => !/^\|?\s*[-:]+[-| :]*\|?$/.test(l));

  const splitCells = (line: string): string[] => {
    let clean = line;
    if (clean.startsWith("|")) clean = clean.slice(1);
    if (clean.endsWith("|")) clean = clean.slice(0, -1);
    return clean.split("|").map((c) => c.trim());
  };

  const headers = splitCells(tableLines[0] || "");
  const rows = tableLines.slice(1).map(splitCells);

  if (headers.length === 0) {
    return {
      headers: ["Колонка 1", "Колонка 2"],
      rows: [["", ""]],
    };
  }

  // Ensure all rows match header length
  const normalizedRows = rows.map((row) => {
    const r = [...row];
    while (r.length < headers.length) r.push("");
    return r.slice(0, headers.length);
  });

  return { headers, rows: normalizedRows };
}

function serializeMarkdownTable(headers: string[], rows: string[][]): string {
  const h = headers.map((x) => x.trim() || "Колонка");
  const headerLine = `| ${h.join(" | ")} |`;
  const sepLine = `| ${h.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map(
    (row) => `| ${h.map((_, i) => (row[i] || "").trim()).join(" | ")} |`
  );
  return [headerLine, sepLine, ...rowLines].join("\n");
}

// Image Markdown parser & serializer
function parseMarkdownImage(text: string): { caption: string; url: string } {
  const match = text.match(/^!\[(.*?)\]\((.*?)\)$/);
  if (match) {
    return { caption: match[1] || "", url: match[2] || "" };
  }
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) {
    return { caption: "Изображение", url: text.trim() };
  }
  return { caption: "", url: "" };
}

function serializeMarkdownImage(caption: string, url: string): string {
  if (!url) return "";
  return `![${caption.trim() || "Изображение"}](${url.trim()})`;
}

// Todo item parser & serializer
function parseTodo(text: string): { done: boolean; task: string } {
  if (text.startsWith("[x] ") || text.startsWith("[X] ")) {
    return { done: true, task: text.slice(4) };
  }
  if (text.startsWith("[ ] ")) {
    return { done: false, task: text.slice(4) };
  }
  return { done: false, task: text };
}

export function BlockEditorItem({
  block,
  text,
  canEdit,
  isActive,
  onFocus,
  onChangeText,
  onChangeType,
  onDelete,
  onInsertAfter,
  onEnter,
  onBackspaceEmpty,
}: BlockEditorItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);

  const parsedImage = useMemo(() => parseMarkdownImage(text), [text]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageCaptionInput, setImageCaptionInput] = useState("");

  const handleOpenImageEditor = () => {
    setImageUrlInput(parsedImage.url);
    setImageCaptionInput(parsedImage.caption);
    setIsEditingImage(true);
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text, isActive]);

  // Focus textarea when activated
  useEffect(() => {
    if (isActive && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  // Wrap text selection with formatting markdown
  const applyInlineFormat = useCallback(
    (prefix: string, suffix: string = prefix, defaultPlaceholder = "текст") => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const current = text;

      if (start === end) {
        // No selection: insert placeholder
        const insertion = `${prefix}${defaultPlaceholder}${suffix}`;
        const newText = current.slice(0, start) + insertion + current.slice(end);
        onChangeText(newText);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(
              start + prefix.length,
              start + prefix.length + defaultPlaceholder.length
            );
          }
        }, 10);
      } else {
        const selected = current.slice(start, end);
        // Check if already wrapped
        if (
          current.slice(start - prefix.length, start) === prefix &&
          current.slice(end, end + suffix.length) === suffix
        ) {
          // Unwrap
          const newText =
            current.slice(0, start - prefix.length) +
            selected +
            current.slice(end + suffix.length);
          onChangeText(newText);
        } else {
          // Wrap
          const newText =
            current.slice(0, start) +
            `${prefix}${selected}${suffix}` +
            current.slice(end);
          onChangeText(newText);
        }
      }
    },
    [onChangeText, text]
  );

  // Handle keyboard shortcuts inside block
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyInlineFormat("**", "**", "жирный текст");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyInlineFormat("*", "*", "курсив");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      applyInlineFormat("<u>", "</u>", "подчёркнутый текст");
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      // Enter on standard blocks creates a new block below
      if (
        block.blockType === "paragraph" ||
        block.blockType.startsWith("heading") ||
        block.blockType === "todo" ||
        block.blockType === "bullet-list" ||
        block.blockType === "numbered-list"
      ) {
        e.preventDefault();
        onEnter?.();
        return;
      }
    }

    if (e.key === "Backspace" && text === "") {
      e.preventDefault();
      onBackspaceEmpty?.();
      return;
    }
  };

  // Block type icon helper
  const renderTypeIcon = (type: BlockType) => {
    switch (type) {
      case "heading1":
        return <Heading1 className="h-3.5 w-3.5" />;
      case "heading2":
        return <Heading2 className="h-3.5 w-3.5" />;
      case "heading3":
        return <Heading3 className="h-3.5 w-3.5" />;
      case "quote":
        return <Quote className="h-3.5 w-3.5" />;
      case "todo":
        return <CheckSquare className="h-3.5 w-3.5" />;
      case "bullet-list":
      case "list-item":
        return <List className="h-3.5 w-3.5" />;
      case "numbered-list":
        return <ListOrdered className="h-3.5 w-3.5" />;
      case "code-block":
        return <Code className="h-3.5 w-3.5" />;
      case "table":
        return <TableIcon className="h-3.5 w-3.5" />;
      case "image":
        return <ImageIcon className="h-3.5 w-3.5" />;
      case "divider":
        return <Minus className="h-3.5 w-3.5" />;
      default:
        return <Pilcrow className="h-3.5 w-3.5" />;
    }
  };

  // Quick switch dropdown
  const blockTypeDropdown = canEdit && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity cursor-pointer shrink-0"
          title="Сменить тип блока"
        >
          {renderTypeIcon(block.blockType)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 text-xs">
        <DropdownMenuItem onClick={() => onChangeType("paragraph")} className="gap-2 cursor-pointer">
          <Pilcrow className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Текст / Абзац</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading1")} className="gap-2 cursor-pointer font-bold">
          <Heading1 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 1 (H1)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading2")} className="gap-2 cursor-pointer font-semibold">
          <Heading2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 2 (H2)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading3")} className="gap-2 cursor-pointer font-medium">
          <Heading3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 3 (H3)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChangeType("quote")} className="gap-2 cursor-pointer">
          <Quote className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Цитата / Сноска</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("todo")} className="gap-2 cursor-pointer">
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Список задач (Todo)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("bullet-list")} className="gap-2 cursor-pointer">
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Маркированный список</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("numbered-list")} className="gap-2 cursor-pointer">
          <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Нумерованный список</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChangeType("code-block")} className="gap-2 cursor-pointer">
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Блок кода</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("table")} className="gap-2 cursor-pointer">
          <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Таблица</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("image")} className="gap-2 cursor-pointer">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Изображение</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("divider")} className="gap-2 cursor-pointer">
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Разделитель</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onInsertAfter("paragraph")} className="gap-2 cursor-pointer text-primary">
          <Plus className="h-3.5 w-3.5" />
          <span>Вставить блок ниже</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Floating inline formatting bar when active
  const floatingFormattingBar = isActive && canEdit && (
    <div className="absolute -top-9 left-6 z-20 flex items-center gap-0.5 bg-popover/95 text-popover-foreground border border-border/80 shadow-md backdrop-blur-md rounded-lg p-0.5 animate-in fade-in zoom-in-95 duration-100">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("**", "**", "жирный")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Жирный (Ctrl+B)"
      >
        <Bold className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("*", "*", "курсив")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Курсив (Ctrl+I)"
      >
        <Italic className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("<u>", "</u>", "подчёркнутый")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Подчёркнутый (Ctrl+U)"
      >
        <Underline className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("~~", "~~", "зачёркнутый")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Зачёркнутый"
      >
        <Strikethrough className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("`", "`", "код")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Код"
      >
        <Code className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyInlineFormat("[", "](https://syncpro.dev)", "Название ссылки")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Ссылка"
      >
        <LinkIcon className="h-3 w-3" />
      </Button>
    </div>
  );

  // 1. RENDER DIVIDER BLOCK
  if (block.blockType === "divider") {
    return (
      <div className="group relative my-4 flex items-center" onFocus={onFocus}>
        <div className="absolute -left-7 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>
        <hr className="w-full border-t border-border/80 my-2" />
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer ml-2 shrink-0"
            title="Удалить разделитель"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 2. RENDER TABLE BLOCK
  if (block.blockType === "table") {
    const { headers, rows } = parseMarkdownTable(text);

    const updateTable = (newHeaders: string[], newRows: string[][]) => {
      const serialized = serializeMarkdownTable(newHeaders, newRows);
      onChangeText(serialized);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
      const newRows = rows.map((r, rIdx) =>
        rIdx === rowIndex ? r.map((c, cIdx) => (cIdx === colIndex ? val : c)) : [...r]
      );
      updateTable(headers, newRows);
    };

    const handleHeaderChange = (colIndex: number, val: string) => {
      const newHeaders = headers.map((h, i) => (i === colIndex ? val : h));
      updateTable(newHeaders, rows);
    };

    const addRow = () => {
      const newRows = [...rows, headers.map(() => "")];
      updateTable(headers, newRows);
    };

    const addCol = () => {
      const newHeaders = [...headers, `Колонка ${headers.length + 1}`];
      const newRows = rows.map((r) => [...r, ""]);
      updateTable(newHeaders, newRows);
    };

    const deleteRow = (rowIndex: number) => {
      if (rows.length <= 1) return;
      const newRows = rows.filter((_, i) => i !== rowIndex);
      updateTable(headers, newRows);
    };

    return (
      <div className="group relative my-4 space-y-2" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border shadow-xs bg-card/60 backdrop-blur-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {headers.map((h, colIdx) => (
                  <th key={colIdx} className="p-2.5 font-semibold text-foreground border-r border-border/50 last:border-r-0 min-w-[120px]">
                    {canEdit ? (
                      <input
                        value={h}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        className="w-full bg-transparent font-semibold text-xs focus:outline-none focus:bg-background/80 rounded px-1"
                        placeholder={`Заголовок ${colIdx + 1}`}
                      />
                    ) : (
                      <span>{h}</span>
                    )}
                  </th>
                ))}
                {canEdit && <th className="w-8 p-1 text-center" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/40 hover:bg-muted/20 transition-colors group/row">
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="p-2 border-r border-border/40 last:border-r-0 min-w-[120px]">
                      {canEdit ? (
                        <input
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          className="w-full bg-transparent text-xs text-foreground focus:outline-none focus:bg-background/80 rounded px-1"
                          placeholder="..."
                        />
                      ) : (
                        <RichTextRenderer content={cell} />
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="w-8 p-1 text-center">
                      <button
                        onClick={() => deleteRow(rowIdx)}
                        className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer p-1"
                        title="Удалить строку"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={addRow} className="h-6 text-[11px] gap-1 px-2 cursor-pointer">
              <Plus className="h-3 w-3" />
              <span>Строка</span>
            </Button>
            <Button variant="outline" size="sm" onClick={addCol} className="h-6 text-[11px] gap-1 px-2 cursor-pointer">
              <Plus className="h-3 w-3" />
              <span>Колонка</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer ml-auto"
              title="Удалить таблицу"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 3. RENDER IMAGE BLOCK
  if (block.blockType === "image") {
    const { caption, url } = parsedImage;

    const handleSaveImage = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!imageUrlInput.trim()) return;
      const serialized = serializeMarkdownImage(imageCaptionInput, imageUrlInput);
      onChangeText(serialized);
      setIsEditingImage(false);
    };

    return (
      <div className="group relative my-4 space-y-2" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        {url && !isEditingImage ? (
          <div className="flex flex-col items-center group/img relative rounded-2xl border border-border overflow-hidden bg-card/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || "Изображение"}
              className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://placehold.co/600x400/e2e8f0/475569?text=Изображение+не+найдено";
              }}
            />
            {caption && (
              <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
                {caption}
              </p>
            )}

            {canEdit && (
              <div className="absolute top-4 right-4 opacity-0 group-hover/img:opacity-100 transition-opacity flex gap-1.5 bg-background/80 backdrop-blur-md p-1 rounded-lg border border-border shadow-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenImageEditor}
                  className="h-7 text-xs px-2 cursor-pointer"
                >
                  Изменить URL
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSaveImage}
            className="p-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Вставка изображения</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="URL изображения (https://...)"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Подпись / Alt текст"
                value={imageCaptionInput}
                onChange={(e) => setImageCaptionInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageUrlInput("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80");
                    setImageCaptionInput("Архитектурная схема компонентов");
                  }}
                  className="h-6 text-[11px] cursor-pointer"
                >
                  Пример схемы
                </Button>
              </div>
              <div className="flex gap-1.5">
                {url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingImage(false)}
                    className="h-7 text-xs cursor-pointer"
                  >
                    Отмена
                  </Button>
                )}
                <Button type="submit" size="sm" className="h-7 text-xs cursor-pointer">
                  Сохранить
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    );
  }

  // 4. RENDER CODE BLOCK
  if (block.blockType === "code-block") {
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
      <div className="group relative my-3" onFocus={onFocus}>
        <div className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/80 bg-zinc-900/60 text-[11px] text-zinc-400">
            <span className="font-mono uppercase font-semibold">Скрипт / Конфигурация</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 text-[10px] gap-1 px-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCode ? "Скопировано" : "Копировать"}</span>
            </Button>
          </div>

          <div className="p-3">
            {canEdit ? (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => onChangeText(e.target.value)}
                className="w-full bg-transparent font-mono text-xs sm:text-sm text-zinc-200 focus:outline-none resize-none leading-relaxed"
                placeholder="// Вставьте код..."
                rows={Math.max(3, text.split("\n").length)}
              />
            ) : (
              <pre className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-zinc-200">
                {text}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. RENDER TODO BLOCK
  if (block.blockType === "todo") {
    const { done, task } = parseTodo(text);

    const toggleDone = (checked: boolean) => {
      onChangeText(`${checked ? "[x]" : "[ ]"} ${task}`);
    };

    const handleTaskChange = (newTask: string) => {
      onChangeText(`${done ? "[x]" : "[ ]"} ${newTask}`);
    };

    return (
      <div className="group relative flex items-start gap-2.5 my-1.5" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="pt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={done}
            disabled={!canEdit}
            onChange={(e) => toggleDone(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        </div>

        <div className="flex-1">
          {canEdit ? (
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(e) => handleTaskChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={`w-full bg-transparent border-0 focus:outline-none text-sm sm:text-base resize-none py-0.5 leading-relaxed ${
                done ? "line-through text-muted-foreground" : "text-foreground font-normal"
              }`}
              placeholder="Новая задача..."
            />
          ) : (
            <p className={`text-sm sm:text-base leading-relaxed ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              <RichTextRenderer content={task} />
            </p>
          )}
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
            title="Удалить задачу"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 6. RENDER QUOTE BLOCK
  if (block.blockType === "quote") {
    return (
      <div className="group relative my-2" onFocus={onFocus}>
        <div className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="relative border-l-4 border-primary/70 bg-primary/5 dark:bg-primary/10 rounded-r-xl p-3 sm:p-4">
          {floatingFormattingBar}
          <div className="flex items-start gap-2">
            <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-80" />
            <div className="flex-1">
              {canEdit ? (
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => onChangeText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-0 focus:outline-none italic text-sm sm:text-base text-foreground resize-none leading-relaxed font-serif"
                  placeholder="Важная цитата или формулировка..."
                  rows={Math.max(2, Math.ceil(text.length / 80))}
                />
              ) : (
                <p className="italic text-sm sm:text-base text-foreground font-serif leading-relaxed">
                  <RichTextRenderer content={text} />
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 7. RENDER LIST ITEMS (Bullet & Numbered)
  if (block.blockType === "bullet-list" || block.blockType === "list-item" || block.blockType === "numbered-list") {
    const isNumbered = block.blockType === "numbered-list";

    return (
      <div className="group relative flex items-start gap-2.5 my-1" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="pt-1.5 shrink-0 flex items-center justify-center w-5">
          {isNumbered ? (
            <span className="text-xs font-semibold text-primary">1.</span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </div>

        <div className="flex-1 relative">
          {floatingFormattingBar}
          {canEdit ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onChangeText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-0 focus:outline-none text-sm sm:text-base text-foreground resize-none py-0.5 leading-relaxed font-normal"
              placeholder="Элемент списка..."
              rows={1}
            />
          ) : (
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              <RichTextRenderer content={text} />
            </p>
          )}
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 8. RENDER HEADINGS & STANDARD PARAGRAPHS
  const isH1 = block.blockType === "heading1";
  const isH2 = block.blockType === "heading2";
  const isH3 = block.blockType === "heading3";

  const typographyClass = isH1
    ? "text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
    : isH2
    ? "text-xl sm:text-2xl font-bold tracking-tight text-foreground"
    : isH3
    ? "text-lg sm:text-xl font-semibold tracking-tight text-foreground"
    : "text-sm sm:text-base text-foreground/90 font-normal leading-relaxed";

  return (
    <div className="group relative flex items-start gap-2.5 my-1.5" onFocus={onFocus}>
      {/* Block gutter controls */}
      <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        {blockTypeDropdown}
      </div>

      <div className="flex-1 relative">
        {floatingFormattingBar}

        {canEdit ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={isH1 || isH2 || isH3 ? 1 : Math.max(1, Math.ceil(text.length / 85))}
            className={`w-full bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary/80 focus:outline-none py-1 resize-none ${typographyClass}`}
            placeholder={
              isH1
                ? "Заголовок 1..."
                : isH2
                ? "Заголовок 2..."
                : isH3
                ? "Заголовок 3..."
                : "Текст абзаца (введите текст, выделите для форматирования)..."
            }
          />
        ) : (
          <div className={`py-1 ${typographyClass}`}>
            <RichTextRenderer content={text} placeholder="Пустой блок" />
          </div>
        )}
      </div>

      {/* Delete block button */}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0 mt-1"
          title="Удалить блок"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
