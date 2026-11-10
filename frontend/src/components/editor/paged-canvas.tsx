"use client";

import React, { useRef } from "react";
import type { PageLayoutConfig } from "@/lib/types/page-layout";
import { getPageDimensions, getPageMargins } from "@/lib/types/page-layout";
import { EditorErrorBoundary } from "./editor-error-boundary";

export interface PagedCanvasProps {
  children?: React.ReactNode;
  pageConfig: PageLayoutConfig;
  onPageConfigChange?: (updates: Partial<PageLayoutConfig>) => void;
  canEdit?: boolean;
  onDropImage?: (file: File) => void;
  documentTitle?: string;
  className?: string;
}

export function PagedCanvas({
  children,
  pageConfig,
  canEdit = true,
  onDropImage,
  className = "",
}: PagedCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dim = getPageDimensions(pageConfig);
  const margins = getPageMargins(pageConfig);
  const isPageless = !!pageConfig.pageless;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/") && onDropImage) {
      onDropImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEdit) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  return (
    <EditorErrorBoundary>
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto overflow-x-auto flex flex-col items-center p-4 sm:p-8 bg-muted/30 select-text ${className}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Zoom scaling wrapper */}
        <div
          className={`flex flex-col items-center transition-transform duration-150 origin-top print:transform-none print:w-full print:p-0 ${
            isPageless ? "w-full max-w-4xl" : ""
          }`}
          style={{
            transform: isPageless ? undefined : `scale(${pageConfig.zoom})`,
            width: isPageless ? "100%" : `${dim.widthPx}px`,
          }}
        >
          {isPageless ? (
            /* Pageless Canvas (Continuous Google Docs Flow) */
            <div
              className="w-full bg-card text-foreground rounded-xl border border-border/70 shadow-sm p-6 sm:p-12 min-h-[900px] cursor-text break-words [overflow-wrap:anywhere] overflow-hidden print:border-none print:p-0 print:shadow-none"
              style={{
                boxSizing: "border-box",
                lineHeight: pageConfig.lineHeight || 1.5,
                letterSpacing: pageConfig.letterSpacing || "normal",
              }}
            >
              {children}
            </div>
          ) : (
            /* Paged Canvas (A4 / Letter with Margins & Page Numbers) */
            <div className="flex flex-col items-center gap-6 w-full print:gap-0">
              {/* Page Information Tag */}
              <div className="w-full flex items-center justify-between px-1 text-[11px] text-muted-foreground font-medium select-none print:hidden">
                <span>Страница 1 • {dim.label}</span>
                <span>Поля: {margins.label}</span>
              </div>

              {/* Physical Paper Sheet */}
              <div
                id="document-page-0"
                className="bg-card text-foreground shadow-md hover:shadow-lg transition-all border border-border/70 rounded-xs relative editor-canvas cursor-text overflow-hidden break-words [overflow-wrap:anywhere] print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:overflow-visible"
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
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    </EditorErrorBoundary>
  );
}
