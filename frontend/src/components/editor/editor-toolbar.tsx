"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Undo2,
  Redo2,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BUILT_IN_FONTS, type FontItem, normalizeFontFamily, matchFontFamily, FontManager } from "@/lib/fonts/font-manager";
import { CustomFontDialog } from "@/components/editor/custom-font-dialog";

export interface EditorToolbarProps {
  onAction?: (action: string, value?: string) => void;
  disabled?: boolean;
  workspaceId?: string;
  currentFont?: string;
  currentSize?: string;
  onFontChange?: (font: string) => void;
  onSizeChange?: (size: string) => void;
  onColorChange?: (color: string) => void;
  onHighlightChange?: (color: string) => void;
  onAlignChange?: (align: "left" | "center" | "right" | "justify") => void;
}

const TEXT_COLORS = [
  { name: "Стандартный", value: "inherit", bg: "bg-foreground" },
  { name: "Серый", value: "#64748b", bg: "bg-slate-500" },
  { name: "Тёмно-серый", value: "#334155", bg: "bg-slate-700" },
  { name: "Красный", value: "#ef4444", bg: "bg-red-500" },
  { name: "Оранжевый", value: "#f97316", bg: "bg-orange-500" },
  { name: "Янтарный", value: "#f59e0b", bg: "bg-amber-500" },
  { name: "Изумрудный", value: "#10b981", bg: "bg-emerald-500" },
  { name: "Зелёный", value: "#16a34a", bg: "bg-green-600" },
  { name: "Голубой", value: "#0ea5e9", bg: "bg-sky-500" },
  { name: "Синий", value: "#3b82f6", bg: "bg-blue-500" },
  { name: "Индиго", value: "#6366f1", bg: "bg-indigo-500" },
  { name: "Фиолетовый", value: "#8b5cf6", bg: "bg-violet-500" },
  { name: "Пурпурный", value: "#d946ef", bg: "bg-fuchsia-500" },
  { name: "Розовый", value: "#ec4899", bg: "bg-pink-500" },
  { name: "Бордовый", value: "#be123c", bg: "bg-rose-700" },
  { name: "Коричневый", value: "#78350f", bg: "bg-amber-900" },
];

const HIGHLIGHT_COLORS = [
  { name: "Без подсветки", value: "transparent", bg: "border border-dashed border-border" },
  { name: "Жёлтый", value: "#fef08a", bg: "bg-yellow-200" },
  { name: "Зелёный", value: "#bbf7d0", bg: "bg-green-200" },
  { name: "Голубой", value: "#bae6fd", bg: "bg-sky-200" },
  { name: "Розовый", value: "#fbcfe8", bg: "bg-pink-200" },
  { name: "Оранжевый", value: "#fed7aa", bg: "bg-orange-200" },
  { name: "Лавандовый", value: "#e9d5ff", bg: "bg-purple-200" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"];

export function EditorToolbar({
  onAction,
  disabled = false,
  workspaceId,
  currentFont = "Inter, sans-serif",
  currentSize = "16px",
  onFontChange,
  onSizeChange,
  onColorChange,
  onHighlightChange,
  onAlignChange,
}: EditorToolbarProps) {
  const [customFonts, setCustomFonts] = useState<FontItem[]>([]);
  const [isFontDialogOpen, setIsFontDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("inherit");
    const [selectedHighlight, setSelectedHighlight] = useState<string>("transparent");

  useEffect(() => {
    let isMounted = true;
    async function loadWorkspaceFonts() {
      try {
        const url = workspaceId ? `/api/fonts?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/fonts";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.fonts)) {
          const items: FontItem[] = data.fonts.map((f: {
            id?: string;
            family_name: string;
            display_name?: string;
            source_type: "google" | "custom_file" | "system";
            file_url?: string;
          }) => ({
            id: f.id || `custom_${f.family_name.toLowerCase().replace(/\s+/g, "_")}`,
            name: f.display_name || f.family_name,
            family: f.source_type === "google"
              ? `${f.family_name}, system-ui, -apple-system, sans-serif`
              : `'${f.family_name}', system-ui, -apple-system, sans-serif`,
            category: "custom",
            sourceType: f.source_type,
            fileUrl: f.file_url,
          }));
          items.forEach((item) => FontManager.loadFont(item));
          setCustomFonts((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const item of items) {
              if (!ids.has(item.id)) {
                merged.push(item);
                ids.add(item.id);
              }
            }
            return merged;
          });
        }
      } catch {}
    }
    loadWorkspaceFonts();
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const allFonts = useMemo(() => {
    const list = [...BUILT_IN_FONTS, ...customFonts];
    const norm = normalizeFontFamily(currentFont);
    if (norm && !list.some((f) => normalizeFontFamily(f.family) === norm)) {
      const rawName = currentFont.split(",")[0].replace(/['"]/g, "").trim();
      list.push({
        id: `detected_${norm}`,
        name: rawName,
        family: currentFont,
        category: "custom",
        sourceType: "system",
      });
    }
    return list;
  }, [customFonts, currentFont]);

  const matchedFontValue = useMemo(() => {
    return matchFontFamily(currentFont, allFonts);
  }, [currentFont, allFonts]);

  if (disabled) {
    return (
      <div className="h-10 border-b border-border bg-muted/40 backdrop-blur-md px-4 flex items-center justify-between text-xs text-muted-foreground select-none z-10">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">Режим только для чтения</span>
          <span className="hidden sm:inline">
            — у вас роль «Читатель». Редактирование текста и структуры документа отключено.
          </span>
        </div>
      </div>
    );
  }

  const trigger = (action: string, value?: string) => {
    if (onAction) {
      onAction(action, value);
    }
  };

  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleFontSelect = (family: string) => {
    if (family === "__add_font__") {
      setIsFontDialogOpen(true);
      return;
    }
    if (onFontChange) {
      onFontChange(family);
    } else {
      trigger("fontName", family);
    }
  };

  const handleSizeSelect = (size: string) => {
    if (onSizeChange) {
      onSizeChange(size);
    } else {
      trigger("fontSize", size);
    }
  };

  const handleApplyColor = (color: string) => {
    setSelectedColor(color);
    if (onColorChange) {
      onColorChange(color);
    } else {
      trigger("foreColor", color);
    }
  };

  const handleApplyHighlight = (color: string) => {
    setSelectedHighlight(color);
    if (onHighlightChange) {
      onHighlightChange(color);
    } else {
      trigger("hiliteColor", color);
    }
  };

  const handleAlign = (align: "left" | "center" | "right" | "justify") => {
    if (onAlignChange) {
      onAlignChange(align);
    } else {
      trigger(`align-${align}`);
    }
  };



  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 border-b border-border bg-card/85 backdrop-blur-md px-3 flex items-center gap-1 overflow-x-auto no-scrollbar select-none z-10">
        {/* Undo / Redo */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("undo")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Отменить (Cmd+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("redo")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Повторить (Cmd+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Font Family Selector */}
        <div className="flex items-center shrink-0">
          <Select value={matchedFontValue} onValueChange={handleFontSelect}>
            <SelectTrigger
              className="h-7 text-xs w-[130px] sm:w-[145px] gap-1 px-2 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue placeholder="Шрифт" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectGroup>
                <SelectLabel className="text-[10px] text-muted-foreground uppercase">Без засечек (Sans)</SelectLabel>
                {allFonts
                  .filter((f) => f.category === "sans")
                  .map((f) => (
                    <SelectItem key={f.id} value={f.family} style={{ fontFamily: f.family }} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
              </SelectGroup>

              <SelectSeparator />

              <SelectGroup>
                <SelectLabel className="text-[10px] text-muted-foreground uppercase">С засечками (Serif)</SelectLabel>
                {allFonts
                  .filter((f) => f.category === "serif")
                  .map((f) => (
                    <SelectItem key={f.id} value={f.family} style={{ fontFamily: f.family }} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
              </SelectGroup>

              <SelectSeparator />

              <SelectGroup>
                <SelectLabel className="text-[10px] text-muted-foreground uppercase">Моноширинные (Mono)</SelectLabel>
                {allFonts
                  .filter((f) => f.category === "mono")
                  .map((f) => (
                    <SelectItem key={f.id} value={f.family} style={{ fontFamily: f.family }} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
              </SelectGroup>

              {customFonts.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-[10px] text-muted-foreground uppercase">Пользовательские</SelectLabel>
                    {customFonts.map((f) => (
                      <SelectItem key={f.id} value={f.family} style={{ fontFamily: f.family }} className="text-xs">
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}

              <SelectSeparator />

              <SelectItem value="__add_font__" className="text-xs text-primary font-medium focus:text-primary cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3 w-3" />
                  <span>Добавить шрифт...</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center shrink-0">
          <Select value={currentSize} onValueChange={handleSizeSelect}>
            <SelectTrigger
              className="h-7 text-xs w-[68px] px-1.5 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue placeholder="Кегль" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Text formatting (Bold, Italic, Underline, Strike) */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("bold")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer font-bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Жирный (Ctrl+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("italic")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Курсив (Ctrl+I)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("underline")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Подчёркнутый (Ctrl+U)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("strike")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Зачёркнутый</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Text Color Picker Popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseDown={preventBlur}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="font-serif font-bold text-xs leading-none">A</span>
                  <div
                    className="h-0.5 w-3.5 rounded-full"
                    style={{ backgroundColor: selectedColor === "inherit" ? "currentColor" : selectedColor }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Цвет текста</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">Цвет текста</div>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleApplyColor(c.value)}
                  title={c.name}
                  className="h-6 w-full rounded flex items-center justify-center hover:scale-110 transition-transform border border-border/50 cursor-pointer"
                  style={{ backgroundColor: c.value === "inherit" ? undefined : c.value }}
                >
                  {c.value === "inherit" && <span className="text-[10px] font-mono">Авто</span>}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-6 mt-2 text-muted-foreground"
              onClick={() => handleApplyColor("inherit")}
            >
              Сбросить цвет
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight Color Picker Popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseDown={preventBlur}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  <div
                    className="h-0.5 w-3.5 rounded-full"
                    style={{ backgroundColor: selectedHighlight === "transparent" ? "transparent" : selectedHighlight }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Цвет маркера (выделение)</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">Цвет маркера</div>
            <div className="grid grid-cols-3 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleApplyHighlight(c.value)}
                  title={c.name}
                  className={`h-6 w-full rounded flex items-center justify-center hover:scale-110 transition-transform ${c.bg} cursor-pointer`}
                >
                  {c.value === "transparent" && <span className="text-[9px] text-muted-foreground">Нет</span>}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Text Alignment (Left, Center, Right, Justify) */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => handleAlign("left")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>По левому краю</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => handleAlign("center")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>По центру</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => handleAlign("right")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>По правому краю</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => handleAlign("justify")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>По ширине</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Headings */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("h1")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 1</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("h2")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 2</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("h3")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 3</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Lists & Tasks */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("bullet-list")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Маркированный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("numbered-list")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Нумерованный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("todo")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ListTodo className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Список задач</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Media & Structures */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("quote")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Quote className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Цитата</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("code")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Блок кода</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("table")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Table className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить таблицу</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("image")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить изображение</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={preventBlur}
                onClick={() => trigger("link")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить ссылку</TooltipContent>
          </Tooltip>
        </div>

        {/* Custom Font Dialog */}
        <CustomFontDialog
          open={isFontDialogOpen}
          onOpenChange={setIsFontDialogOpen}
          workspaceId={workspaceId}
          onFontAdded={(newFont) => {
            setCustomFonts((prev) => [...prev, newFont]);
            handleFontSelect(newFont.family);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
