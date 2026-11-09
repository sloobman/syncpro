"use client";

import React, { useRef, useMemo } from "react";
import type { BlockNode, BlockType, ID } from "@/lib/crdt/types";
import { formatID } from "@/lib/crdt/id";
import { BlockEditorItem, type RemoteCursorInfo } from "./block-editor-item";
import type { PageLayoutConfig } from "@/lib/types/page-layout";
import {
  getPageDimensions,
  getPageMargins,
  pxToMm,
} from "@/lib/types/page-layout";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PagedCanvasProps {
  blocks: BlockNode[];
  blockTexts: Record<string, string>;
  pageConfig: PageLayoutConfig;
  canEdit: boolean;
  activeBlockId: string | null;
  documentFont: string;
  documentId: string;
  onFocusBlock: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onChangeType: (id: string, type: BlockType) => void;
  onDeleteBlock: (id: string) => void;
  onInsertAfter: (id: string, type?: BlockType) => void;
  onEnter: (id: string) => void;
  onBackspaceEmpty: (id: string) => void;
  onSmartClick?: (pageIndex: number, align: "left" | "center" | "right", afterBlockId?: ID | null) => void;
  onDeletePageBreak?: (breakBlockId: string) => void;
  onAddPage?: () => void;
  onNavigatePrev?: (blockKey: string) => void;
  onNavigateNext?: (blockKey: string) => void;
  onMergeWithPrev?: (blockKey: string, currentText: string) => void;
  remoteCursorsMap?: Record<string, RemoteCursorInfo[]>;
  onDropImage?: (file: File, pageIndex: number) => void;
  selectedBlockIds?: string[];
  onSelectBlockRange?: (startKey: string, endKey: string) => void;
  onClearMultiSelection?: () => void;
}

interface PageGroup {
  pageIndex: number;
  blocks: BlockNode[];
  breakBlockIdBefore?: string;
}

export function PagedCanvas({
  blocks,
  blockTexts,
  pageConfig,
  canEdit,
  activeBlockId,
  documentFont,
  documentId,
  onFocusBlock,
  onChangeText,
  onChangeType,
  onDeleteBlock,
  onInsertAfter,
  onEnter,
  onBackspaceEmpty,
  onSmartClick,
  onDeletePageBreak,
  onAddPage,
  onNavigatePrev,
  onNavigateNext,
  onMergeWithPrev,
  remoteCursorsMap,
  onDropImage,
  selectedBlockIds,
  onSelectBlockRange,
  onClearMultiSelection,
}: PagedCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dim = getPageDimensions(pageConfig);
  const margins = getPageMargins(pageConfig);
  const availableHeightPx = dim.heightPx - margins.top - margins.bottom;

  /**
   * Distribute blocks across pages based on:
   * 1. Explicit `page-break` blocks
   * 2. Auto-pagination when estimated block heights exceed available page height
   */
  const pages: PageGroup[] = useMemo(() => {
    const result: PageGroup[] = [];
    let currentPageBlocks: BlockNode[] = [];
    let currentHeight = 0;
    let pendingBreakId: string | undefined = undefined;

    const numLineHeight = typeof pageConfig.lineHeight === "number"
      ? pageConfig.lineHeight
      : parseFloat(String(pageConfig.lineHeight || "1.5")) || 1.5;
    const pSpacing = pageConfig.paragraphSpacing ?? 8;

    // Helper to estimate height of a block factoring in custom lineHeight & paragraphSpacing
    const estimateBlockHeight = (block: BlockNode): number => {
      if (block.blockType === "page-break") return 0;
      if (block.blockType === "table") return 160;
      if (block.blockType === "image") return 280;
      if (block.blockType === "code-block") return 100;
      if (block.blockType === "heading1") return 55;
      if (block.blockType === "heading2") return 45;
      if (block.blockType === "heading3") return 38;
      if (block.blockType === "divider") return 24;

      const text = blockTexts[formatID(block.id)] || "";
      const lineCount = Math.max(1, Math.ceil(text.length / 75));
      return Math.round(lineCount * (18 * numLineHeight) + pSpacing + 8);
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Explicit page break block
      if (block.blockType === "page-break") {
        result.push({
          pageIndex: result.length,
          blocks: currentPageBlocks,
          breakBlockIdBefore: pendingBreakId,
        });
        currentPageBlocks = [];
        currentHeight = 0;
        pendingBreakId = formatID(block.id);
        continue;
      }

      const h = estimateBlockHeight(block);

      // Auto-pagination: if adding this block overflows the page, roll over to new page
      if (currentPageBlocks.length > 0 && currentHeight + h > availableHeightPx) {
        result.push({
          pageIndex: result.length,
          blocks: currentPageBlocks,
          breakBlockIdBefore: pendingBreakId,
        });
        currentPageBlocks = [block];
        currentHeight = h;
        pendingBreakId = undefined;
      } else {
        currentPageBlocks.push(block);
        currentHeight += h;
      }
    }

    // Always push remaining or initial empty page
    result.push({
      pageIndex: result.length,
      blocks: currentPageBlocks,
      breakBlockIdBefore: pendingBreakId,
    });

    return result;
  }, [blocks, blockTexts, availableHeightPx, pageConfig.lineHeight, pageConfig.paragraphSpacing]);

  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseDownPosRef.current) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      if (dx > 4 || dy > 4) {
        isDraggingRef.current = true;
      }
    }
  };

  const handleMouseUp = () => {
    mouseDownPosRef.current = null;
    if (isDraggingRef.current) {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  /**
   * Handle Smart Click (Click and Type) on the page sheet
   */
  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    onClearMultiSelection?.();
    // 1. If mouse was dragged during text selection, do not trigger smart click!
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    // 2. If user currently has an active non-collapsed text selection, do NOT create a new block!
    if (typeof window !== "undefined") {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
        return;
      }
    }
    // Only trigger if clicking on the page sheet itself or empty area (not buttons, inputs, controls, or existing blocks)
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[contenteditable="true"]') ||
      target.closest('.editor-canvas-ui') ||
      target.closest('.editor-ui-control') ||
      target.closest('[id^="block-"]') ||
      target.closest('[data-block-id]') ||
      target.closest('img') ||
      target.closest('table') ||
      target.closest('pre') ||
      target.closest('hr') ||
      target.closest('a')
    ) {
      return;
    }

    if (!canEdit || !onSmartClick) return;

    const sheetRect = e.currentTarget.getBoundingClientRect();
    const contentLeft = sheetRect.left + margins.left * pageConfig.zoom;
    const contentWidth = (dim.widthPx - margins.left - margins.right) * pageConfig.zoom;

    const relX = (e.clientX - contentLeft) / contentWidth;
    let align: "left" | "center" | "right" = "left";

    if (relX > 0.65) {
      align = "right";
    } else if (relX > 0.35 && relX <= 0.65) {
      align = "center";
    }

    const thisPage = pages[pageIndex];
    const targetAfterId = thisPage && thisPage.blocks.length > 0
      ? thisPage.blocks[thisPage.blocks.length - 1].id
      : null;

    onSmartClick(pageIndex, align, targetAfterId);
  };

  return (
    <div
      ref={containerRef}
      data-print-style={`${pxToMm(dim.widthPx)}x${pxToMm(dim.heightPx)}`}
      className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8 flex flex-col items-center gap-8 w-full select-text"
      style={{
        fontFamily: documentFont,
      }}
    >
      {/* Zoom scaling wrapper */}
      <div
        className="flex flex-col items-center gap-8 transition-transform duration-150 origin-top"
        style={{
          transform: `scale(${pageConfig.zoom})`,
          width: `${dim.widthPx}px`,
        }}
      >
        {pages.map((page, idx) => {
          
          return (
            <div
              key={`page-${idx}`}
              className="relative group/page"
              style={{ width: `${dim.widthPx}px` }}
            >
              {/* Page Number & Delete Header (outside print area) */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 px-2 select-none print:hidden font-sans">
                <span className="font-medium tracking-wide text-muted-foreground/80">
                  Страница {idx + 1} из {pages.length}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover/page:opacity-100 transition-opacity">
                  {page.breakBlockIdBefore && canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePageBreak?.(page.breakBlockIdBefore!)}
                      className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 cursor-pointer"
                      title="Удалить разрыв страницы и объединить"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Удалить страницу</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Physical Paper Sheet */}
              <div
                id={`document-page-${idx}`}
                onClick={(e) => handleSheetClick(e, idx)}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/") && onDropImage) {
                    onDropImage(file, idx);
                  }
                }}
                className="bg-card text-foreground shadow-md hover:shadow-lg transition-all border border-border/70 rounded-xs relative editor-canvas cursor-text break-words [overflow-wrap:anywhere] overflow-hidden"
                style={{
                  width: `${dim.widthPx}px`,
                  minHeight: `${dim.heightPx}px`,
                  paddingTop: `${margins.top}px`,
                  paddingBottom: `${margins.bottom}px`,
                  paddingLeft: `${margins.left}px`,
                  paddingRight: `${margins.right}px`,
                  boxSizing: "border-box",
                  lineHeight: pageConfig.lineHeight || 1.5,
                  letterSpacing: pageConfig.letterSpacing || "normal",
                }}
              >
                {/* Content Blocks for this Page */}
                <div
                  className="w-full min-w-0 max-w-full block flow-root"
                  style={{
                    lineHeight: "inherit",
                    letterSpacing: "inherit",
                  }}
                >
                  {page.blocks.map((block) => {
                    const bKey = formatID(block.id);
                    const text = blockTexts[bKey] ?? "";
                    const isMultiSelected = selectedBlockIds?.includes(bKey);

                    return (
                      <div
                        key={bKey}
                        id={`block-${bKey}`}
                        style={{
                          marginBottom: `${pageConfig.paragraphSpacing ?? 8}px`,
                        }}
                        className={`transition-all ${
                          isMultiSelected
                            ? "ring-2 ring-primary/60 bg-primary/10 rounded-xl p-1"
                            : ""
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey && activeBlockId) {
                            e.preventDefault();
                            onSelectBlockRange?.(activeBlockId, bKey);
                          }
                        }}
                      >
                        <BlockEditorItem
                          block={block}
                          text={text}
                          canEdit={canEdit}
                          isActive={activeBlockId === bKey}
                          onFocus={() => {
                            if (!selectedBlockIds?.length) {
                              onFocusBlock(bKey);
                            }
                          }}
                          onChangeText={(newText) => onChangeText(bKey, newText)}
                          onChangeType={(newType) => onChangeType(bKey, newType)}
                          onDelete={() => onDeleteBlock(bKey)}
                          onInsertAfter={(type) => onInsertAfter(bKey, type)}
                          onEnter={() => onEnter(bKey)}
                          onBackspaceEmpty={() => onBackspaceEmpty(bKey)}
                          onNavigatePrev={() => onNavigatePrev?.(bKey)}
                          onNavigateNext={() => onNavigateNext?.(bKey)}
                          onMergeWithPrev={(curText) => onMergeWithPrev?.(bKey, curText)}
                          remoteCursors={remoteCursorsMap?.[bKey]}
                          documentId={documentId}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Empty page helper click zone if no blocks */}
                {page.blocks.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground/40 italic text-sm select-none">
                    Кликните здесь, чтобы начать ввод текста на этой странице...
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom Add Page Button */}
        {canEdit && (
          <div className="w-full flex justify-center py-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddPage}
              className="h-8 px-4 text-xs gap-1.5 border-dashed border-border hover:border-primary/70 hover:bg-primary/5 text-muted-foreground hover:text-primary cursor-pointer font-sans"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Добавить страницу</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
