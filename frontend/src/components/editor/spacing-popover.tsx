"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlignVerticalSpaceAround, Check } from "lucide-react";

export interface SpacingConfig {
  lineHeight: number | string;
  paragraphSpacing: number; // in px
  letterSpacing: string;
}

interface SpacingPopoverProps {
  currentLineHeight?: number | string;
  currentParagraphSpacing?: number;
  currentLetterSpacing?: string;
  onChangeSpacing: (
    spacing: SpacingConfig,
    applyToAll: boolean
  ) => void;
  disabled?: boolean;
}

const LINE_HEIGHT_PRESETS = [
  { label: "1.0", value: 1.0 },
  { label: "1.15", value: 1.15 },
  { label: "1.5", value: 1.5 },
  { label: "2.0", value: 2.0 },
];

const PARAGRAPH_SPACING_PRESETS = [
  { label: "0px", value: 0 },
  { label: "4px", value: 4 },
  { label: "8px", value: 8 },
  { label: "12px", value: 12 },
  { label: "16px", value: 16 },
];

const LETTER_SPACING_PRESETS = [
  { label: "Обычный", value: "normal" },
  { label: "Узкий (-0.5px)", value: "-0.5px" },
  { label: "Широкий (+1px)", value: "1px" },
  { label: "Очень широкий (+2px)", value: "2px" },
];

export function SpacingPopover({
  currentLineHeight = 1.5,
  currentParagraphSpacing = 8,
  currentLetterSpacing = "normal",
  onChangeSpacing,
  disabled = false,
}: SpacingPopoverProps) {
  const [open, setOpen] = useState(false);
  const [lineHeight, setLineHeight] = useState<number | string>(currentLineHeight);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(currentParagraphSpacing);
  const [letterSpacing, setLetterSpacing] = useState<string>(currentLetterSpacing);
  const [customLineHeight, setCustomLineHeight] = useState<string>(
    typeof currentLineHeight === "number" ? currentLineHeight.toString() : currentLineHeight
  );
  const [customParagraphSpacing, setCustomParagraphSpacing] = useState<number>(currentParagraphSpacing);
  const [customLetterSpacing, setCustomLetterSpacing] = useState<string>(currentLetterSpacing);

  const handleApplyPresetLineHeight = (val: number) => {
    setLineHeight(val);
    setCustomLineHeight(val.toString());
    onChangeSpacing(
      {
        lineHeight: val,
        paragraphSpacing,
        letterSpacing,
      },
      false
    );
  };

  const handleApplyCustomLineHeight = (valStr: string) => {
    setCustomLineHeight(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0.5 && num <= 4.0) {
      setLineHeight(num);
      onChangeSpacing(
        {
          lineHeight: num,
          paragraphSpacing,
          letterSpacing,
        },
        false
      );
    }
  };

  const handleApplyPresetParagraphSpacing = (val: number) => {
    setParagraphSpacing(val);
    setCustomParagraphSpacing(val);
    onChangeSpacing(
      {
        lineHeight,
        paragraphSpacing: val,
        letterSpacing,
      },
      false
    );
  };

  const handleApplyCustomParagraphSpacing = (val: number) => {
    setCustomParagraphSpacing(val);
    if (val >= 0 && val <= 64) {
      setParagraphSpacing(val);
      onChangeSpacing(
        {
          lineHeight,
          paragraphSpacing: val,
          letterSpacing,
        },
        false
      );
    }
  };

  const handleApplyLetterSpacing = (val: string) => {
    setLetterSpacing(val);
    setCustomLetterSpacing(val);
    onChangeSpacing(
      {
        lineHeight,
        paragraphSpacing,
        letterSpacing: val,
      },
      false
    );
  };

  const handleApplyToAll = () => {
    onChangeSpacing(
      {
        lineHeight,
        paragraphSpacing,
        letterSpacing,
      },
      true
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Интервалы</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Междустрочный интервал и отступы абзацев</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-72 p-3 text-xs space-y-3.5 editor-ui-control" align="start">
        <div className="font-semibold text-foreground flex items-center justify-between border-b pb-1.5">
          <span>Настройка интервалов</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            LH: {lineHeight} • P: {paragraphSpacing}px
          </span>
        </div>

        {/* 1. Line Height (междустрочный интервал) */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Междустрочный интервал
          </Label>
          <div className="flex items-center gap-1">
            {LINE_HEIGHT_PRESETS.map((p) => {
              const isActive = lineHeight === p.value;
              return (
                <Button
                  key={p.label}
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleApplyPresetLineHeight(p.value)}
                  className="h-6 flex-1 px-1 text-xs cursor-pointer"
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] text-muted-foreground shrink-0">Свое значение:</span>
            <Input
              type="number"
              step="0.05"
              min="0.8"
              max="3.5"
              value={customLineHeight}
              onChange={(e) => handleApplyCustomLineHeight(e.target.value)}
              className="h-6 text-xs w-20 px-1.5"
              placeholder="1.35"
            />
          </div>
        </div>

        {/* 2. Paragraph Spacing (отступ между абзацами) */}
        <div className="space-y-1.5 border-t pt-2 border-border/50">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Отступ после абзаца (Space After)
          </Label>
          <div className="flex items-center gap-1">
            {PARAGRAPH_SPACING_PRESETS.map((p) => {
              const isActive = paragraphSpacing === p.value;
              return (
                <Button
                  key={p.label}
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleApplyPresetParagraphSpacing(p.value)}
                  className="h-6 flex-1 px-1 text-xs cursor-pointer"
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] text-muted-foreground shrink-0">Свой отступ (px):</span>
            <Input
              type="number"
              step="1"
              min="0"
              max="64"
              value={customParagraphSpacing}
              onChange={(e) => handleApplyCustomParagraphSpacing(Number(e.target.value))}
              className="h-6 text-xs w-20 px-1.5"
              placeholder="8"
            />
          </div>
        </div>

        {/* 3. Letter Spacing (межбуквенный интервал) */}
        <div className="space-y-1.5 border-t pt-2 border-border/50">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Межбуквенный интервал (трекинг)
          </Label>
          <div className="grid grid-cols-2 gap-1">
            {LETTER_SPACING_PRESETS.map((p) => {
              const isActive = letterSpacing === p.value;
              return (
                <Button
                  key={p.label}
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleApplyLetterSpacing(p.value)}
                  className="h-6 px-1.5 text-[11px] justify-start truncate cursor-pointer"
                >
                  {isActive && <Check className="h-3 w-3 mr-1 text-primary shrink-0" />}
                  <span className="truncate">{p.label}</span>
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] text-muted-foreground shrink-0">Свое (px/em):</span>
            <Input
              type="text"
              value={customLetterSpacing}
              onChange={(e) => handleApplyLetterSpacing(e.target.value)}
              className="h-6 text-xs w-24 px-1.5"
              placeholder="0.5px"
            />
          </div>
        </div>

        {/* Action: Apply to all */}
        <div className="border-t pt-2 border-border/50">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApplyToAll}
            className="w-full h-7 text-xs font-medium cursor-pointer"
          >
            Применить ко всему документу
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
