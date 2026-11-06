"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { BlockNode } from "@/lib/crdt/types";
import { formatID } from "@/lib/crdt/id";

interface VirtualDocumentListProps {
  blocks: BlockNode[];
  renderBlock: (block: BlockNode) => React.ReactNode;
  estimatedBlockHeight?: number;
  overscan?: number;
  className?: string;
}

export function VirtualDocumentList({
  blocks,
  renderBlock,
  estimatedBlockHeight = 48,
  overscan = 5,
  className = "",
}: VirtualDocumentListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [blockHeights] = useState<Record<string, number>>({});

  // Track viewport height changes
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Compute positions of each block
  const { blockPositions, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    let currentY = 0;

    for (let i = 0; i < blocks.length; i++) {
      positions.push(currentY);
      const key = formatID(blocks[i].id);
      const measured = blockHeights[key];
      const height = measured ?? estimatedBlockHeight;
      currentY += height;
    }

    return { blockPositions: positions, totalHeight: currentY };
  }, [blocks, estimatedBlockHeight, blockHeights]);

  // Determine which blocks fall inside [scrollTop - overscan, scrollTop + viewportHeight + overscan]
  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (blocks.length === 0) {
      return { startIndex: 0, endIndex: 0, topSpacerHeight: 0, bottomSpacerHeight: 0 };
    }

    let start = 0;
    while (
      start < blocks.length - 1 &&
      blockPositions[start + 1] < Math.max(0, scrollTop - overscan * estimatedBlockHeight)
    ) {
      start++;
    }

    let end = start;
    const bottomThreshold = scrollTop + viewportHeight + overscan * estimatedBlockHeight;
    while (end < blocks.length && blockPositions[end] < bottomThreshold) {
      end++;
    }
    end = Math.min(blocks.length, end + 1);

    const topSpacer = blockPositions[start] ?? 0;
    const endPosition = blockPositions[end] ?? totalHeight;
    const bottomSpacer = Math.max(0, totalHeight - endPosition);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topSpacer,
      bottomSpacerHeight: bottomSpacer,
    };
  }, [blocks.length, blockPositions, scrollTop, viewportHeight, overscan, estimatedBlockHeight, totalHeight]);

  const visibleBlocks = useMemo(() => {
    return blocks.slice(startIndex, endIndex);
  }, [blocks, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`overflow-y-auto h-full w-full relative ${className}`}
    >
      {/* Top geometry spacer for virtualized blocks */}
      {topSpacerHeight > 0 && (
        <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
      )}

      {/* Render only visible window */}
      <div className="space-y-4">
        {visibleBlocks.map((block) => (
          <div key={formatID(block.id)} data-block-id={formatID(block.id)}>
            {renderBlock(block)}
          </div>
        ))}
      </div>

      {/* Bottom geometry spacer for non-rendered bottom blocks */}
      {bottomSpacerHeight > 0 && (
        <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
      )}
    </div>
  );
}
