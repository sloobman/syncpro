"use client";

import React, { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageLayoutConfig,
  PageFormat,
  PageOrientation,
  PageMargins,
  MIN_PAGE_SIZE_MM,
  MAX_PAGE_WIDTH_MM,
  MAX_PAGE_HEIGHT_MM,
  MIN_MARGIN_MM,
  validatePageLayout,
  getPageDimensions,
  pxToMm,
} from "@/lib/types/page-layout";
import { AlertCircle, SlidersHorizontal } from "lucide-react";

interface PageSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PageLayoutConfig;
  onSave: (newConfig: PageLayoutConfig) => void;
}

export function PageSetupDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: PageSetupDialogProps) {
  const [format, setFormat] = useState<PageFormat>(config.format || "a4");
  const [orientation, setOrientation] = useState<PageOrientation>(
    config.orientation || "portrait"
  );
  const [margins, setMargins] = useState<PageMargins>(config.margins || "normal");

  // Custom dimensions state (in mm)
  const [customWidthMm, setCustomWidthMm] = useState<number>(
    config.customDimensions?.widthMm ?? 210
  );
  const [customHeightMm, setCustomHeightMm] = useState<number>(
    config.customDimensions?.heightMm ?? 297
  );

  // Custom margins state (in mm)
  const [topMm, setTopMm] = useState<number>(config.customMargins?.topMm ?? 20);
  const [bottomMm, setBottomMm] = useState<number>(
    config.customMargins?.bottomMm ?? 20
  );
  const [leftMm, setLeftMm] = useState<number>(config.customMargins?.leftMm ?? 20);
  const [rightMm, setRightMm] = useState<number>(config.customMargins?.rightMm ?? 20);

  // Sync state when dialog opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFormat(config.format || "a4");
      setOrientation(config.orientation || "portrait");
      setMargins(config.margins || "normal");
      setCustomWidthMm(config.customDimensions?.widthMm ?? 210);
      setCustomHeightMm(config.customDimensions?.heightMm ?? 297);
      setTopMm(config.customMargins?.topMm ?? 20);
      setBottomMm(config.customMargins?.bottomMm ?? 20);
      setLeftMm(config.customMargins?.leftMm ?? 20);
      setRightMm(config.customMargins?.rightMm ?? 20);
    }
  }

  // Construct draft config
  const draftConfig = useMemo<PageLayoutConfig>(() => {
    return {
      ...config,
      format,
      orientation,
      margins,
      customDimensions:
        format === "custom"
          ? { widthMm: customWidthMm, heightMm: customHeightMm }
          : undefined,
      customMargins:
        margins === "custom"
          ? { topMm, bottomMm, leftMm, rightMm }
          : undefined,
    };
  }, [
    config,
    format,
    orientation,
    margins,
    customWidthMm,
    customHeightMm,
    topMm,
    bottomMm,
    leftMm,
    rightMm,
  ]);

  // Validate draft config
  const validation = useMemo(() => {
    return validatePageLayout(draftConfig);
  }, [draftConfig]);

  // Calculate printable area
  const printableArea = useMemo(() => {
    const dim = getPageDimensions(draftConfig);
    const sheetW = pxToMm(dim.widthPx);
    const sheetH = pxToMm(dim.heightPx);

    let mTop = 20;
    let mBottom = 20;
    let mLeft = 20;
    let mRight = 20;

    if (margins === "narrow") {
      mTop = 12.7;
      mBottom = 12.7;
      mLeft = 12.7;
      mRight = 12.7;
    } else if (margins === "wide") {
      mTop = 25.4;
      mBottom = 25.4;
      mLeft = 25.4;
      mRight = 25.4;
    } else if (margins === "custom") {
      mTop = topMm;
      mBottom = bottomMm;
      mLeft = leftMm;
      mRight = rightMm;
    }

    const printW = Math.max(0, Math.round(sheetW - mLeft - mRight));
    const printH = Math.max(0, Math.round(sheetH - mTop - mBottom));

    return { printW, printH, sheetW, sheetH };
  }, [draftConfig, margins, topMm, bottomMm, leftMm, rightMm]);

  const handleApply = () => {
    if (!validation.valid) return;
    onSave(validation.sanitized);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md editor-ui-control">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Параметры страницы
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Format selection */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <Label className="text-xs text-muted-foreground">Формат листа</Label>
              <Select
                value={format}
                onValueChange={(val) => setFormat(val as PageFormat)}
              >
                <SelectTrigger className="h-8 mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="editor-ui-control">
                  <SelectItem value="a4">A4 (210 × 297 мм)</SelectItem>
                  <SelectItem value="a5">A5 (148 × 210 мм)</SelectItem>
                  <SelectItem value="letter">Letter (216 × 279 мм)</SelectItem>
                  <SelectItem value="custom">Произвольный размер...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Ориентация</Label>
              <Select
                value={orientation}
                onValueChange={(val) => setOrientation(val as PageOrientation)}
              >
                <SelectTrigger className="h-8 mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="editor-ui-control">
                  <SelectItem value="portrait">Книжная (вертикальная)</SelectItem>
                  <SelectItem value="landscape">Альбомная (горизонтальная)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom dimensions if format === custom */}
          {format === "custom" && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Пользовательский размер листа (мм)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Ширина (мм)</Label>
                  <Input
                    type="number"
                    min={MIN_PAGE_SIZE_MM}
                    max={MAX_PAGE_WIDTH_MM}
                    value={customWidthMm}
                    onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Высота (мм)</Label>
                  <Input
                    type="number"
                    min={MIN_PAGE_SIZE_MM}
                    max={MAX_PAGE_HEIGHT_MM}
                    value={customHeightMm}
                    onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Минимум: {MIN_PAGE_SIZE_MM}×{MIN_PAGE_SIZE_MM} мм. Максимум: {MAX_PAGE_WIDTH_MM}×{MAX_PAGE_HEIGHT_MM} мм.
              </p>
            </div>
          )}

          {/* Margins selection */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs text-muted-foreground">Поля страницы</Label>
            <Select
              value={margins}
              onValueChange={(val) => setMargins(val as PageMargins)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="editor-ui-control">
                <SelectItem value="normal">Обычные (20 мм со всех сторон)</SelectItem>
                <SelectItem value="narrow">Узкие (12.7 мм)</SelectItem>
                <SelectItem value="wide">Широкие (25.4 мм)</SelectItem>
                <SelectItem value="custom">Произвольные поля...</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom margins inputs */}
            {margins === "custom" && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 mt-2">
                <span className="text-xs font-semibold text-foreground">
                  Пользовательские отступы полей (мм)
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Верхнее (мм)</Label>
                    <Input
                      type="number"
                      min={MIN_MARGIN_MM}
                      value={topMm}
                      onChange={(e) => setTopMm(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Нижнее (мм)</Label>
                    <Input
                      type="number"
                      min={MIN_MARGIN_MM}
                      value={bottomMm}
                      onChange={(e) => setBottomMm(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Левое (мм)</Label>
                    <Input
                      type="number"
                      min={MIN_MARGIN_MM}
                      value={leftMm}
                      onChange={(e) => setLeftMm(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Правое (мм)</Label>
                    <Input
                      type="number"
                      min={MIN_MARGIN_MM}
                      value={rightMm}
                      onChange={(e) => setRightMm(Number(e.target.value))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Printable area info readout */}
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Печатная область:</span>
            <span className="font-semibold text-primary">
              {printableArea.printW} × {printableArea.printH} мм
            </span>
          </div>

          {/* Validation Error Message */}
          {!validation.valid && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validation.error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs cursor-pointer"
          >
            Отмена
          </Button>
          <Button
            size="sm"
            disabled={!validation.valid}
            onClick={handleApply}
            className="h-8 text-xs cursor-pointer"
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
