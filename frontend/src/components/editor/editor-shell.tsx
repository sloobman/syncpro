"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorSidebar, type HeadingItem } from "@/components/editor/editor-sidebar";
import { EditorStatusbar } from "@/components/editor/editor-statusbar";
import { TimeTravelSlider } from "@/components/editor/time-travel-slider";
import { MergeBranchDialog } from "@/components/editor/merge-branch-dialog";
import { DiffViewer } from "@/components/editor/diff-viewer";
import { CRDTDocument } from "@/lib/crdt/crdt-doc";
import { formatID } from "@/lib/crdt/id";
import type { BlockNode, BlockType, ID } from "@/lib/crdt/types";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";

const INITIAL_COMMITS: MerkleCommit[] = [
  {
    id: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    documentId: "doc-default",
    parents: [],
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    crdtDeltaStoragePath: "deltas/doc-default/a1b2.bin",
    snapshotStoragePath: "snapshots/doc-default/a1b2.snap.bin",
    stateVector: { 1: 5 },
    message: "feat: начальная структура документа",
    author: { userId: "u1", name: "Алиса", avatarUrl: null },
    timestamp: Date.now() - 3600000 * 2,
    branch: "main",
  },
  {
    id: "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
    documentId: "doc-default",
    parents: ["a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"],
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856",
    crdtDeltaStoragePath: "deltas/doc-default/b2c3.bin",
    snapshotStoragePath: null,
    stateVector: { 1: 12, 2: 4 },
    message: "feat(crdt): интеграция YATA/Fugue text crdt",
    author: { userId: "u2", name: "Боб", avatarUrl: null },
    timestamp: Date.now() - 3600000,
    branch: "feature/crdt-ordering",
  },
  {
    id: "c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef02",
    documentId: "doc-default",
    parents: ["a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"],
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857",
    crdtDeltaStoragePath: "deltas/doc-default/c3d4.bin",
    snapshotStoragePath: null,
    stateVector: { 1: 8, 3: 6 },
    message: "feat(tree): Kleppmann replicated block tree",
    author: { userId: "u3", name: "Вы", avatarUrl: null },
    timestamp: Date.now() - 1800000,
    branch: "dev",
  },
  {
    id: "d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef03",
    documentId: "doc-default",
    parents: [
      "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
      "c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef02",
    ],
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b858",
    crdtDeltaStoragePath: "deltas/doc-default/d4e5.bin",
    snapshotStoragePath: "snapshots/doc-default/d4e5.snap.bin",
    stateVector: { 1: 15, 2: 6, 3: 8 },
    message: "merge: бесконфликтное слияние 3-Way CRDT Merge",
    author: { userId: "u1", name: "Алиса", avatarUrl: null },
    timestamp: Date.now() - 300000,
    branch: "main",
  },
];

interface EditorShellProps {
  documentId?: string;
}

export function EditorShell({ documentId = "doc-default" }: EditorShellProps) {
  const { canvasWidth } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commits, setCommits] = useState<MerkleCommit[]>(INITIAL_COMMITS);
  const [currentCommitId, setCurrentCommitId] = useState<string>(
    INITIAL_COMMITS[INITIAL_COMMITS.length - 1].id
  );
  const [timeTravelIndex, setTimeTravelIndex] = useState<number | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([
    "main",
    "dev",
    "feature/crdt-ordering",
  ]);
  const [title, setTitle] = useState("Глава 1: Введение в системы совместного редактирования");
  const [blocksState, setBlocksState] = useState<BlockNode[]>([]);
  const [blockTexts, setBlockTexts] = useState<Record<string, string>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // CRDT Document instance
  const docRef = useRef<CRDTDocument | null>(null);

  // Initialize document with default chapter if first load
  useEffect(() => {
    const doc = new CRDTDocument(1);
    docRef.current = doc;

    const b1 = doc.createBlock(null, "heading1", "a");
    doc.insertText(b1.id, 0, "Глава 1: Введение в системы совместного редактирования");

    const b2 = doc.createBlock(null, "paragraph", "b");
    doc.insertText(
      b2.id,
      0,
      "Совместное редактирование документов в реальном времени является одной из ключевых технологических задач современных распределённых систем. В отличие от традиционных централизованных блокировок, современные архитектуры опираются на бессерверную или гибридную репликацию данных без централизованного арбитра разрешения конфликтов."
    );

    const b3 = doc.createBlock(null, "heading2", "c");
    doc.insertText(b3.id, 0, "1.1. Архитектурный стиль Merkle-CRDT");

    const b4 = doc.createBlock(null, "paragraph", "d");
    doc.insertText(
      b4.id,
      0,
      "Платформа SyncPro совмещает математическое ядро Conflict-free Replicated Data Types (CRDT) на базе алгоритмов YATA и Fugue с графом контроля версий Merkle-DAG. Каждый символ и блок текста идентифицируются неизменяемым кортежем из идентификатора клиента и логических часов Лампорта."
    );

    const refreshBlocks = () => {
      const activeBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
      setBlocksState(activeBlocks);

      const texts: Record<string, string> = {};
      for (const b of activeBlocks) {
        texts[formatID(b.id)] = doc.getBlockText(b.id);
      }
      setBlockTexts(texts);
    };

    doc.onUpdate(() => {
      refreshBlocks();
    });

    refreshBlocks();
  }, [documentId]);

  // Handle text input modification inside a block
  const handleTextChange = useCallback((blockId: ID, newText: string) => {
    const doc = docRef.current;
    if (!doc) return;

    const current = doc.getBlockText(blockId);
    if (newText === current) return;

    if (newText.startsWith(current)) {
      const added = newText.slice(current.length);
      doc.insertText(blockId, current.length, added);
    } else {
      const currentLen = current.length;
      if (currentLen > 0) {
        doc.deleteText(blockId, 0, currentLen);
      }
      if (newText.length > 0) {
        doc.insertText(blockId, 0, newText);
      }
    }
  }, []);

  // Add a new block to the CRDT tree
  const handleAddBlock = useCallback((type: BlockType = "paragraph", initialText?: string) => {
    const doc = docRef.current;
    if (!doc) return;

    const rootBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
    const lastKey = rootBlocks.length > 0 ? rootBlocks[rootBlocks.length - 1].orderKey : null;
    const nextKey = lastKey ? `${lastKey}z` : "m";

    const block = doc.createBlock(null, type, nextKey);
    const defaultText = initialText ?? (type.startsWith("heading") ? "Новый заголовок" : "Новый абзац документа...");
    doc.insertText(block.id, 0, defaultText);
    setActiveBlockId(formatID(block.id));
  }, []);

  // Delete a block from the CRDT tree
  const handleDeleteBlock = useCallback((blockId: ID) => {
    const doc = docRef.current;
    if (!doc) return;
    doc.deleteBlock(blockId);
  }, []);

  // Toolbar action execution
  const handleToolbarAction = useCallback(
    (action: string) => {
      const doc = docRef.current;
      if (!doc) return;

      const activeBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
      if (activeBlocks.length === 0) {
        handleAddBlock("paragraph");
        return;
      }

      // Find targeted block or default to first/last
      const targetBlock = activeBlockId
        ? activeBlocks.find((b) => formatID(b.id) === activeBlockId) || activeBlocks[0]
        : activeBlocks[activeBlocks.length - 1];

      const currentText = doc.getBlockText(targetBlock.id);

      switch (action) {
        case "undo":
          break;
        case "redo":
          break;
        case "bold":
          doc.insertText(targetBlock.id, currentText.length, " **жирный текст**");
          break;
        case "italic":
          doc.insertText(targetBlock.id, currentText.length, " *курсив*");
          break;
        case "underline":
          doc.insertText(targetBlock.id, currentText.length, " <u>подчёркнутый текст</u>");
          break;
        case "strike":
          doc.insertText(targetBlock.id, currentText.length, " ~~зачёркнутый текст~~");
          break;
        case "h1":
          handleAddBlock("heading1", "Новый раздел");
          break;
        case "h2":
          handleAddBlock("heading2", "Подраздел");
          break;
        case "h3":
          handleAddBlock("heading3", "Пункт раздела");
          break;
        case "bullet-list":
          handleAddBlock("paragraph", "• Элемент маркированного списка");
          break;
        case "numbered-list":
          handleAddBlock("paragraph", "1. Элемент нумерованного списка");
          break;
        case "todo-list":
          handleAddBlock("paragraph", "[ ] Новая задача для выполнения");
          break;
        case "quote":
          handleAddBlock("paragraph", "> Важная цитата или примечание команды");
          break;
        case "code":
          handleAddBlock("paragraph", "```ts\n// Код или конфигурация\nconst config = { mode: 'sync' };\n```");
          break;
        case "link":
          doc.insertText(targetBlock.id, currentText.length, " [Ссылка на ресурс](https://syncpro.dev)");
          break;
        case "image":
          doc.insertText(targetBlock.id, currentText.length, " ![Схема](https://syncpro.dev/diagram.png)");
          break;
        case "table":
          handleAddBlock(
            "paragraph",
            "| Параметр | Значение |\n|---|---|\n| Статус | Завершено |\n| Версия | 1.2.0 |"
          );
          break;
      }
    },
    [activeBlockId, handleAddBlock]
  );

  // Export handlers
  const handleExportMarkdown = useCallback(() => {
    const content = Object.values(blockTexts).join("\n\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim().replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [blockTexts, title]);

  const handleExportPdf = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  // Calculate total stats
  const stats = useMemo(() => {
    let words = 0;
    let chars = 0;
    for (const text of Object.values(blockTexts)) {
      chars += text.length;
      words += text.trim().split(/\s+/).filter(Boolean).length;
    }
    return { words, chars };
  }, [blockTexts]);

  // Dynamic headings for TOC
  const headings: HeadingItem[] = useMemo(() => {
    return blocksState
      .filter((b) => b.blockType.startsWith("heading"))
      .map((b) => {
        const text = blockTexts[formatID(b.id)] || "Заголовок";
        const level = b.blockType === "heading1" ? 1 : b.blockType === "heading2" ? 2 : 3;
        return {
          id: formatID(b.id),
          text,
          level,
        };
      });
  }, [blocksState, blockTexts]);

  // Scroll to heading
  const handleScrollToHeading = (id: string) => {
    const el = document.getElementById(`block-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  // Branch management
  const handleSelectBranch = (b: string) => {
    setBranch(b);
  };

  const handleCreateBranch = (b: string) => {
    if (!branches.includes(b)) {
      setBranches((prev) => [...prev, b]);
    }
    setBranch(b);
  };

  // 3-Way Merge handler
  const handleConfirmMerge = async (source: string, target: string) => {
    const mergeId = `merge_${Date.now().toString(16)}`;
    const newCommit: MerkleCommit = {
      id: mergeId,
      documentId,
      parents: [currentCommitId],
      deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b859",
      crdtDeltaStoragePath: `deltas/${documentId}/${mergeId}.bin`,
      snapshotStoragePath: null,
      stateVector: { 1: 20, 2: 15 },
      message: `Merge '${source}' into '${target}' via 3-Way CRDT Merge`,
      author: { userId: "user-current", name: "Вы", avatarUrl: null },
      timestamp: Date.now(),
      branch: target,
    };
    setCommits((prev) => [...prev, newCommit]);
    setCurrentCommitId(newCommit.id);
    setBranch(target);
  };

  const currentDiffBase = useMemo(() => {
    return "Платформа SyncPro совмещает математическое ядро Conflict-free Replicated Data Types (CRDT) на базе алгоритмов YATA и Fugue с графом контроля версий Merkle-DAG.";
  }, []);

  const currentDiffTarget = useMemo(() => {
    return Object.values(blockTexts).join("\n\n") || currentDiffBase;
  }, [blockTexts, currentDiffBase]);

  const canvasWidthClass =
    canvasWidth === "narrow"
      ? "max-w-[700px]"
      : canvasWidth === "wide"
      ? "max-w-[1100px]"
      : "max-w-[850px]";

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <EditorTopbar
        title={title}
        onTitleChange={setTitle}
        currentBranch={branch}
        branches={branches}
        onSelectBranch={handleSelectBranch}
        onCreateBranch={handleCreateBranch}
        onExportMarkdown={handleExportMarkdown}
        onExportPdf={handleExportPdf}
        onToggleHistory={() => setSidebarOpen(true)}
        onToggleDiff={() => setIsDiffOpen(!isDiffOpen)}
      />

      <EditorToolbar onAction={handleToolbarAction} />

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Document canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-8 flex flex-col items-center">
          {/* Diff panel overlay if open */}
          {isDiffOpen && (
            <div className={`w-full ${canvasWidthClass} mb-6`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Анализ расхождений веток (LCA Diff)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDiffOpen(false)}
                  className="h-6 w-6 p-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DiffViewer
                oldText={currentDiffBase}
                newText={currentDiffTarget}
                oldLabel="LCA предок"
                newLabel="Текущая ветка"
              />
            </div>
          )}

          {/* Active document page */}
          <div
            className={`w-full ${canvasWidthClass} min-h-[1050px] bg-card border border-border shadow-xs rounded-2xl p-8 sm:p-14 relative text-foreground space-y-6 transition-all duration-200`}
          >
            {blocksState.map((block) => {
              const bKey = formatID(block.id);
              const text = blockTexts[bKey] ?? "";

              return (
                <div
                  key={bKey}
                  id={`block-${bKey}`}
                  className="group relative flex items-start gap-2.5"
                  onFocus={() => setActiveBlockId(bKey)}
                >
                  <div className="flex-1">
                    {block.blockType.startsWith("heading") ? (
                      <input
                        value={text}
                        onChange={(e) => handleTextChange(block.id, e.target.value)}
                        className={`w-full font-bold tracking-tight bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary focus:outline-none py-1 text-foreground ${
                          block.blockType === "heading1"
                            ? "text-2xl sm:text-3xl"
                            : block.blockType === "heading2"
                            ? "text-xl sm:text-2xl"
                            : "text-lg sm:text-xl"
                        }`}
                        placeholder="Заголовок..."
                      />
                    ) : (
                      <textarea
                        value={text}
                        rows={Math.max(2, Math.ceil(text.length / 80))}
                        onChange={(e) => handleTextChange(block.id, e.target.value)}
                        className="w-full text-sm sm:text-base leading-relaxed bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary focus:outline-none resize-none py-1 text-foreground/90 font-normal"
                        placeholder="Текст абзаца..."
                      />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-1 cursor-pointer"
                    title="Удалить блок"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}

            {/* Quick button to append new blocks */}
            <div className="pt-6 border-t border-dashed border-border/60 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("paragraph")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить абзац</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("heading2")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить заголовок</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right collapsible sidebar */}
        <EditorSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          commits={commits}
          currentCommitId={currentCommitId}
          headings={headings}
          onSelectHeading={handleScrollToHeading}
          onSelectCommit={(id) => {
            setCurrentCommitId(id);
            const idx = commits.findIndex((c) => c.id === id);
            if (idx >= 0) {
              setTimeTravelIndex(idx);
            }
          }}
          onOpenMergeDialog={() => setIsMergeOpen(true)}
          onOpenDiffDialog={() => setIsDiffOpen(!isDiffOpen)}
        />

        {/* Time travel slider bottom dock */}
        {timeTravelIndex !== null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
            <TimeTravelSlider
              commits={commits}
              currentIndex={timeTravelIndex}
              onIndexChange={(idx) => {
                setTimeTravelIndex(idx);
                setCurrentCommitId(commits[idx].id);
              }}
              onExitTimeTravel={() => setTimeTravelIndex(null)}
              onForkBranch={(commitId) => {
                const forkName = `fork-${commitId.slice(0, 6)}`;
                handleCreateBranch(forkName);
                setTimeTravelIndex(null);
              }}
            />
          </div>
        )}
      </div>

      <EditorStatusbar
        wordCount={stats.words}
        charCount={stats.chars}
        activeUsers={3}
        branch={branch}
      />

      {/* 3-Way Merge dialog */}
      <MergeBranchDialog
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        branches={branches}
        currentBranch={branch}
        onConfirmMerge={handleConfirmMerge}
      />
    </div>
  );
}
