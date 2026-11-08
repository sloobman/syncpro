"use client";

import React, { useState } from "react";
import {
  FileText,
  Scissors,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  Settings2,
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
import {
  getPageDimensions,
  getPageMargins,
} from "@/lib/types/page-layout";
import { PageSetupDialog } from "./page-setup-dialog";

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
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);

  const currentDim = getPageDimensions(config);
  const currentMargin = getPageMargins(config);

  const handleZoomChange = (delta: number) => {
    const nextZoom = Math.min(1.5, Math.max(0.6, Math.round((config.zoom + delta) * 100) / 100));
    onChangeConfig({ zoom: nextZoom });
  };

  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 border-b border-border bg-card/85 backdrop-blur-md px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none z-10 text-xs editor-ui-control">
        {/* Page Format Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Формат:
          </span>
          <Select
            value={config.format}
            onValueChange={(val) => {
              if (val === "custom") {
                setIsPageSetupOpen(true);
              } else {
                onChangeConfig({ format: val as PageFormat });
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-7 text-xs w-[115px] gap-1 px-2 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="editor-ui-control">
              <SelectItem value="a4" className="text-xs">
                A4 (210×297 мм)
              </SelectItem>
              <SelectItem value="a5" className="text-xs">
                A5 (148×210 мм)
              </SelectItem>
              <SelectItem value="letter" className="text-xs">
                Letter (216×279 мм)
              </SelectItem>
              <SelectItem value="custom" className="text-xs">
                Произвольный...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orientation Selector */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Ориентация:
          </span>
          <div className="flex items-center rounded-md border border-border/70 p-0.5 bg-background">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config.orientation === "portrait" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onChangeConfig({ orientation: "portrait" })}
                  disabled={disabled}
                  onMouseDown={preventBlur}
                  className="h-6 px-2 text-xs gap-1 cursor-pointer"
                >
                  <FileText className="h-3 w-3" />
                  <span className="hidden md:inline">Книжная</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Книжная ориентация (вертикальная)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config.orientation === "landscape" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onChangeConfig({ orientation: "landscape" })}
                  disabled={disabled}
                  onMouseDown={preventBlur}
                  className="h-6 px-2 text-xs gap-1 cursor-pointer"
                >
                  <FileText className="h-3 w-3 rotate-90" />
                  <span className="hidden md:inline">Альбомная</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Альбомная ориентация (горизонтальная)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Margins Selector */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">
            Поля:
          </span>
          <Select
            value={config.margins}
            onValueChange={(val) => {
              if (val === "custom") {
                setIsPageSetupOpen(true);
              } else {
                onChangeConfig({ margins: val as PageMargins });
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-7 text-xs w-[120px] gap-1 px-2 border-border/70 hover:border-border font-medium cursor-pointer"
              onMouseDown={preventBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="editor-ui-control">
              <SelectItem value="normal" className="text-xs">
                Обычные (20 мм)
              </SelectItem>
              <SelectItem value="narrow" className="text-xs">
                Узкие (12.7 мм)
              </SelectItem>
              <SelectItem value="wide" className="text-xs">
                Широкие (25.4 мм)
              </SelectItem>
              <SelectItem value="custom" className="text-xs">
                Произвольные...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page Setup Dialog Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPageSetupOpen(true)}
              disabled={disabled}
              className="h-7 px-2 text-xs gap-1 border-border/70 hover:border-border cursor-pointer ml-1"
            >
              <Settings2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden lg:inline">Настройка страницы...</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Точная настройка размеров листа и полей в мм</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Insert Page Break */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onInsertPageBreak}
              disabled={disabled || !onInsertPageBreak}
              className="h-7 text-xs gap-1.5 px-2.5 border-dashed border-primary/40 hover:border-primary/80 text-primary font-medium cursor-pointer"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Разрыв страницы</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Вставить разрыв страницы (Ctrl + Enter)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoomChange(-0.1)}
                disabled={disabled || config.zoom <= 0.6}
                onMouseDown={preventBlur}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Уменьшить масштаб</TooltipContent>
          </Tooltip>

          <span className="text-[11px] font-mono font-medium text-muted-foreground px-1 w-10 text-center">
            {Math.round(config.zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoomChange(0.1)}
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
          <PopoverContent className="w-64 p-3 text-xs space-y-2 editor-ui-control">
            <div className="font-semibold text-foreground flex items-center justify-between border-b pb-1.5">
              <span>Параметры листа</span>
              <span className="text-primary font-mono text-[11px]">{currentDim.label}</span>
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

        {/* Page Setup Dialog */}
        <PageSetupDialog
          open={isPageSetupOpen}
          onOpenChange={setIsPageSetupOpen}
          config={config}
          onSave={(newCfg) => onChangeConfig(newCfg)}
        />
      </div>
    </TooltipProvider>
  );
}
