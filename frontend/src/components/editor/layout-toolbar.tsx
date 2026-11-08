"use client";

import React from "react";
import {
  FileText,
  Scissors,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  PageFormat,
  PageMargins,
  PageLayoutConfig,
} from "@/lib/types/page-layout";
import { PAGE_DIMENSIONS, MARGIN_VALUES, DEFAULT_PAGE_LAYOUT } from "@/lib/types/page-layout";

export interface LayoutToolbarProps {
  config: PageLayoutConfig;
  onChangeConfig: (updates: Partial<PageLayoutConfig>) => void;
  onInsertPageBreak?: () => void;
  disabled?: boolean;
}

export function LayoutToolbar({
  config,
  onChangeConfig,
  onInsertPageBreak,
  disabled = false,
}: LayoutToolbarProps) {
  const formatDims = PAGE_DIMENSIONS[config.format] ?? PAGE_DIMENSIONS[DEFAULT_PAGE_LAYOUT.format];
  const currentDim = formatDims[config.orientation] ?? formatDims[DEFAULT_PAGE_LAYOUT.orientation];
  const currentMargin = MARGIN_VALUES[config.margins] ?? MARGIN_VALUES[DEFAULT_PAGE_LAYOUT.margins];

  const handleZoomChange = (delta: number) => {
    const nextZoom = Math.min(1.5, Math.max(0.6, Math.round((config.zoom + delta) * 100) / 100));
    onChangeConfig({ zoom: nextZoom });
  };

  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 border-b border-border bg-card/85 backdrop-blur-md px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none z-10 text-xs">
        {/* Page Format Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Формат:
          </span>
          <Select
            value={config.format}
            onValueChange={(val) => onChangeConfig({ format: val as PageFormat })}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-7 text-xs w-[110px] gap-1 px-2 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4" className="text-xs">
                A4 (210 × 297 мм)
              </SelectItem>
              <SelectItem value="a5" className="text-xs">
                A5 (148 × 210 мм)
              </SelectItem>
              <SelectItem value="letter" className="text-xs">
                Letter (216 × 279 мм)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Orientation Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Ориентация:
          </span>
          <div className="flex items-center rounded-md border border-border/70 p-0.5 bg-muted/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config.orientation === "portrait" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onChangeConfig({ orientation: "portrait" })}
                  disabled={disabled}
                  className="h-6 px-2 text-xs gap-1 cursor-pointer font-medium"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Книжная</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Вертикальная страница (Портрет)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config.orientation === "landscape" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onChangeConfig({ orientation: "landscape" })}
                  disabled={disabled}
                  className="h-6 px-2 text-xs gap-1 cursor-pointer font-medium"
                >
                  <FileText className="h-3.5 w-3.5 rotate-90" />
                  <span>Альбомная</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Горизонтальная страница (Альбом)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Margins Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Поля:
          </span>
          <Select
            value={config.margins}
            onValueChange={(val) => onChangeConfig({ margins: val as PageMargins })}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-7 text-xs w-[130px] gap-1 px-2 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal" className="text-xs">
                Обычные (20 мм)
              </SelectItem>
              <SelectItem value="narrow" className="text-xs">
                Узкие (12.7 мм)
              </SelectItem>
              <SelectItem value="wide" className="text-xs">
                Широкие (25.4 мм)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Insert Page Break */}
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onInsertPageBreak}
                disabled={disabled}
                onMouseDown={preventBlur}
                className="h-7 text-xs gap-1.5 border-border/70 hover:border-primary/60 cursor-pointer font-medium"
              >
                <Scissors className="h-3.5 w-3.5 text-primary" />
                <span>Разрыв страницы</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить разрыв страницы (Ctrl+Enter / Cmd+Enter)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoomChange(-0.15)}
                disabled={disabled || config.zoom <= 0.6}
                onMouseDown={preventBlur}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Уменьшить масштаб</TooltipContent>
          </Tooltip>

          <span className="text-[11px] font-mono font-medium w-11 text-center text-foreground">
            {Math.round(config.zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoomChange(0.15)}
                disabled={disabled || config.zoom >= 1.5}
                onMouseDown={preventBlur}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Увеличить масштаб</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChangeConfig({ zoom: 1.0 })}
                disabled={disabled || config.zoom === 1.0}
                onMouseDown={preventBlur}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>100% масштаб</TooltipContent>
          </Tooltip>
        </div>

        {/* Detailed Page Info Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground ml-auto gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Инфо</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 text-xs space-y-2">
            <div className="font-semibold text-foreground flex items-center justify-between border-b pb-1.5">
              <span>Параметры листа</span>
              <span className="text-primary font-mono">{currentDim.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
              <span>Размеры:</span>
              <span className="text-foreground font-mono text-right">{currentDim.widthPx} × {currentDim.heightPx} px</span>
              <span>Ориентация:</span>
              <span className="text-foreground text-right">{config.orientation === "portrait" ? "Книжная" : "Альбомная"}</span>
              <span>Поля:</span>
              <span className="text-foreground text-right">{currentMargin.label}</span>
              <span>Отступ контента:</span>
              <span className="text-foreground font-mono text-right">{currentMargin.top}px</span>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
