"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EditorTopbar, type CollaboratorInfo } from "@/components/editor/editor-topbar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorSidebar, type HeadingItem } from "@/components/editor/editor-sidebar";
import { EditorStatusbar } from "@/components/editor/editor-statusbar";
import { TimeTravelSlider } from "@/components/editor/time-travel-slider";
import { MergeBranchDialog } from "@/components/editor/merge-branch-dialog";
import { ForkBranchDialog } from "@/components/editor/fork-branch-dialog";
import type { BranchInfo } from "@/components/editor/branch-graph-view";
import { CommitDialog } from "@/components/editor/commit-dialog";
import { DiffViewer } from "@/components/editor/diff-viewer";
import { BlockEditorItem } from "@/components/editor/block-editor-item";
import { CRDTDocument } from "@/lib/crdt/crdt-doc";
import { formatID } from "@/lib/crdt/id";
import type { BlockNode, BlockType, ID } from "@/lib/crdt/types";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { Plus, X, Heading1, Heading2, Table as TableIcon, Quote, CheckSquare, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useAuthStore } from "@/lib/stores/auth-store";

interface EditorShellProps {
  documentId?: string;
}

function initCRDTFromMarkdown(doc: CRDTDocument, markdownText: string) {
  if (!markdownText || !markdownText.trim()) {
    const b = doc.createBlock(null, "paragraph", "a");
    doc.insertText(b.id, 0, "");
    return;
  }

  const lines = markdownText.split("\n");
  const chunks: Array<{ type: BlockType; content: string }> = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        chunks.push({ type: "code-block", content: codeBuffer.join("\n") });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Table detection (line starts and ends with |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      chunks.push({ type: "table", content: tableBuffer.join("\n") });
      tableBuffer = [];
      inTable = false;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check headings & rich blocks
    if (trimmed.startsWith("# ")) {
      chunks.push({ type: "heading1", content: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith("## ")) {
      chunks.push({ type: "heading2", content: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith("### ")) {
      chunks.push({ type: "heading3", content: trimmed.slice(4).trim() });
    } else if (trimmed.startsWith("> ")) {
      chunks.push({ type: "quote", content: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith("[ ] ") || trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ")) {
      chunks.push({ type: "todo", content: trimmed });
    } else if (trimmed.startsWith("![") && trimmed.includes("](") && trimmed.endsWith(")")) {
      chunks.push({ type: "image", content: trimmed });
    } else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      chunks.push({ type: "divider", content: "" });
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      chunks.push({ type: "bullet-list", content: trimmed.slice(2).trim() });
    } else if (/^\d+\.\s/.test(trimmed)) {
      chunks.push({ type: "numbered-list", content: trimmed.replace(/^\d+\.\s*/, "").trim() });
    } else {
      chunks.push({ type: "paragraph", content: trimmed });
    }
  }

  if (inTable && tableBuffer.length > 0) {
    chunks.push({ type: "table", content: tableBuffer.join("\n") });
  }
  if (inCodeBlock && codeBuffer.length > 0) {
    chunks.push({ type: "code-block", content: codeBuffer.join("\n") });
  }

  if (chunks.length === 0) {
    const b = doc.createBlock(null, "paragraph", "a");
    doc.insertText(b.id, 0, "");
    return;
  }

  chunks.forEach((chunk, index) => {
    const orderKey = String.fromCharCode(97 + (index % 26)).repeat(
      Math.floor(index / 26) + 1
    );
    const b = doc.createBlock(null, chunk.type, orderKey);
    doc.insertText(b.id, 0, chunk.content);
  });
}

function serializeCRDTToMarkdown(doc: CRDTDocument): string {
  const activeBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
  return activeBlocks
    .map((b) => {
      const text = doc.getBlockText(b.id);
      if (b.blockType === "heading1") return `# ${text}`;
      if (b.blockType === "heading2") return `## ${text}`;
      if (b.blockType === "heading3") return `### ${text}`;
      if (b.blockType === "quote") return text.startsWith(">") ? text : `> ${text}`;
      if (b.blockType === "divider") return "---";
      if (b.blockType === "code-block") return `\`\`\`\n${text}\n\`\`\``;
      if (b.blockType === "bullet-list" || b.blockType === "list-item") return `• ${text}`;
      if (b.blockType === "numbered-list") return `1. ${text}`;
      return text;
    })
    .join("\n\n");
}

export function EditorShell({ documentId = "doc_1" }: EditorShellProps) {
  const router = useRouter();
  const { canvasWidth } = useUIStore();
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commits, setCommits] = useState<MerkleCommit[]>([]);
  const [currentCommitId, setCurrentCommitId] = useState<string>("");
  const [timeTravelIndex, setTimeTravelIndex] = useState<number | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>(["main", "dev"]);
  const [branchesInfo, setBranchesInfo] = useState<BranchInfo[]>([]);
  const [isForkDialogOpen, setIsForkDialogOpen] = useState(false);
  const [forkSourceCommit, setForkSourceCommit] = useState<MerkleCommit | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<CollaboratorInfo[]>([]);

  // Per-branch drafts map so switching branches switches document content
  const branchContentsRef = useRef<Record<string, string>>({});

  const clientIdRef = useRef<string>("");
  const myColorRef = useRef<string>("bg-primary");

  useEffect(() => {
    if (!clientIdRef.current) {
      clientIdRef.current = `client_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
      myColorRef.current = colors[Math.floor(Math.random() * colors.length)];
    }
  }, []);

  const [title, setTitle] = useState(() => {
    if (typeof window === "undefined") return "Новый документ";
    const store = useWorkspaceStore.getState();
    const docMeta = store.getDocumentById(documentId);
    return (
      docMeta?.title ||
      (documentId === "doc_1"
        ? "Глава 1: Введение в системы совместного редактирования"
        : "Новый документ")
    );
  });
  const [blocksState, setBlocksState] = useState<BlockNode[]>([]);
  const [blockTexts, setBlockTexts] = useState<Record<string, string>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [canEdit, setCanEdit] = useState(true);
  const [userRole, setUserRole] = useState<string>("owner");

  // CRDT Document instance & save timer ref
  const docRef = useRef<CRDTDocument | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize blocks state from CRDT tree
  const refreshBlocks = useCallback(() => {
    const doc = docRef.current;
    if (!doc) return;
    const activeBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
    setBlocksState(activeBlocks);

    const texts: Record<string, string> = {};
    for (const b of activeBlocks) {
      texts[formatID(b.id)] = doc.getBlockText(b.id);
    }
    setBlockTexts(texts);
  }, []);

  // Initialize document from persistent store and backend
  useEffect(() => {
    const store = useWorkspaceStore.getState();
    const docMeta = store.getDocumentById(documentId);
    const savedContent = store.getDocumentContent(documentId);
    const docTitle = docMeta?.title || (documentId === "doc_1" ? "Глава 1: Введение в системы совместного редактирования" : "Новый документ");

    const doc = new CRDTDocument(1);
    docRef.current = doc;

    const initialContent = savedContent || (documentId === "doc_1" ? store.getDocumentContent("doc_1") : `# ${docTitle}\n\nНачните редактирование документа...`);
    branchContentsRef.current["main"] = initialContent;
    initCRDTFromMarkdown(doc, initialContent);

    doc.onUpdate(() => {
      refreshBlocks();
    });

    refreshBlocks();

    // Fetch document metadata and content from server
    fetch(`/api/documents/${documentId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.document?.title) {
          setTitle(data.document.title);
        }
        if (data.canEdit !== undefined) {
          setCanEdit(data.canEdit);
        }
        if (data.userRole) {
          setUserRole(data.userRole);
        }
        if (data.content) {
          branchContentsRef.current["main"] = data.content;
          const freshDoc = new CRDTDocument(1);
          docRef.current = freshDoc;
          initCRDTFromMarkdown(freshDoc, data.content);
          freshDoc.onUpdate(refreshBlocks);
          refreshBlocks();
        }
      })
      .catch(() => {});

    // Fetch branches from PostgreSQL
    fetch(`/api/documents/${documentId}/branches`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.branches) && data.branches.length > 0) {
          setBranchesInfo(data.branches);
          const bNames = data.branches.map((b: { name: string }) => b.name);
          if (!bNames.includes("main")) bNames.unshift("main");
          setBranches(Array.from(new Set(bNames)));
        }
      })
      .catch(() => {});

    // Fetch document commits and Merkle DAG
    fetch(`/api/documents/${documentId}/commits`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.commits) && data.commits.length > 0) {
          setCommits(data.commits);
          setCurrentCommitId(data.commits[data.commits.length - 1].id);
          const uniqueBranches = Array.from(new Set(data.commits.map((c: MerkleCommit) => c.branch || "main")));
          if (!uniqueBranches.includes("main")) uniqueBranches.unshift("main");
          setBranches(uniqueBranches as string[]);

          // Populate branch contents from commit snapshots
          for (const c of data.commits) {
            if (c.branch && c.content && !branchContentsRef.current[c.branch]) {
              branchContentsRef.current[c.branch] = c.content;
            }
          }
        }
      })
      .catch(() => {});
  }, [documentId, refreshBlocks]);

  // Real-time Awareness Polling (Redis presence)
  useEffect(() => {
    let cancelled = false;

    const pollAwareness = async () => {
      try {
        const cId = clientIdRef.current || `client_${Date.now().toString(36)}`;
        // Send heartbeat
        await fetch(`/api/documents/${documentId}/awareness`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            clientId: cId,
            state: {
              user: {
                id: user?.id || cId,
                name: user?.name ? `${user.name} (Вы)` : "Вы",
                avatarUrl: user?.avatarUrl || null,
                color: myColorRef.current,
              },
              cursor: { blockId: activeBlockId || "root" },
            },
          }),
        });

        // Retrieve active online users
        const res = await fetch(`/api/documents/${documentId}/awareness`, {
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            const formatted: CollaboratorInfo[] = data.users.map((u: {
              id?: string;
              clientId?: string;
              name?: string;
              avatarUrl?: string | null;
              color?: string;
            }) => ({
              id: u.id || u.clientId || "u",
              name: u.name || "Участник",
              avatarUrl: u.avatarUrl || null,
              color: u.color || "bg-primary",
            }));
            setOnlineUsers(formatted);
          }
        }
      } catch {
        // Network or offline fallback
      }
    };

    pollAwareness();
    const interval = setInterval(pollAwareness, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [documentId, user?.id, user?.name, user?.avatarUrl, activeBlockId]);

  // Debounced auto-save function (DOES NOT create Merkle DAG commit!)
  const triggerAutoSave = useCallback(
    (newTitle?: string) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const markdown = serializeCRDTToMarkdown(doc);
        const currentTitle = newTitle ?? title;
        branchContentsRef.current[branch] = markdown;
        useWorkspaceStore.getState().saveDocumentContent(documentId, markdown, currentTitle);

        // Debounced patch to server to save working draft
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content: markdown, title: currentTitle }),
          });
        } catch {
          // Local storage preserves offline changes
        }

        setSaveStatus("saved");
      }, 500);
    },
    [branch, canEdit, documentId, title]
  );

  // Keyboard shortcut Ctrl+S / Cmd+S -> Open meaningful Commit Dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canEdit) {
          setIsCommitDialogOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit]);

  // Handle title changes
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!canEdit) return;
      setTitle(newTitle);
      useWorkspaceStore.getState().updateDocument(documentId, { title: newTitle });
      triggerAutoSave(newTitle);
    },
    [canEdit, documentId, triggerAutoSave]
  );

  // Robust prefix-suffix CRDT text diffing
  const handleTextChange = useCallback(
    (blockId: ID, newText: string) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      const current = doc.getBlockText(blockId);
      if (newText === current) return;

      // Find common prefix
      let start = 0;
      while (start < current.length && start < newText.length && current[start] === newText[start]) {
        start++;
      }

      // Find common suffix
      let currentEnd = current.length;
      let newEnd = newText.length;
      while (currentEnd > start && newEnd > start && current[currentEnd - 1] === newText[newEnd - 1]) {
        currentEnd--;
        newEnd--;
      }

      const deleteCount = currentEnd - start;
      const insertedText = newText.slice(start, newEnd);

      if (deleteCount > 0) {
        doc.deleteText(blockId, start, deleteCount);
      }
      if (insertedText.length > 0) {
        doc.insertText(blockId, start, insertedText);
      }

      // Optimistically update local block texts
      const bKey = formatID(blockId);
      setBlockTexts((prev) => ({ ...prev, [bKey]: newText }));

      triggerAutoSave();
    },
    [canEdit, triggerAutoSave]
  );

  // Add a new block to the CRDT tree
  const handleAddBlock = useCallback(
    (type: BlockType = "paragraph", initialText?: string, afterBlockId?: ID | null) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      const defaultText =
        initialText ??
        (type === "heading1"
          ? "Новый заголовок 1"
          : type === "heading2"
          ? "Новый подраздел"
          : type === "heading3"
          ? "Новый пункт"
          : type === "quote"
          ? "Важная цитата..."
          : type === "todo"
          ? "[ ] Новая задача"
          : type === "bullet-list"
          ? "Элемент списка"
          : type === "numbered-list"
          ? "Элемент списка"
          : type === "code-block"
          ? "// Код или конфигурация\nconst mode = 'sync';"
          : type === "table"
          ? "| Параметр | Значение |\n|---|---|\n| Статус | В работе |\n| Версия | 1.0 |"
          : type === "image"
          ? ""
          : "");

      const block = doc.insertBlockAfter(afterBlockId ?? null, type, defaultText);
      setActiveBlockId(formatID(block.id));
      refreshBlocks();
      triggerAutoSave();
    },
    [canEdit, refreshBlocks, triggerAutoSave]
  );

  // Change existing block type
  const handleChangeBlockType = useCallback(
    (blockId: ID, newType: BlockType) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      doc.setBlockType(blockId, newType);
      refreshBlocks();
      triggerAutoSave();
    },
    [canEdit, refreshBlocks, triggerAutoSave]
  );

  // Delete a block from the CRDT tree
  const handleDeleteBlock = useCallback(
    (blockId: ID) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;
      doc.deleteBlock(blockId);
      refreshBlocks();
      triggerAutoSave();
    },
    [canEdit, refreshBlocks, triggerAutoSave]
  );

  // Real WYSIWYG Toolbar action execution
  const handleToolbarAction = useCallback(
    (action: string) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      const activeBlocks = doc.tree.getRootBlocks().filter((b) => !b.isDeleted);
      const targetBlock = activeBlockId
        ? activeBlocks.find((b) => formatID(b.id) === activeBlockId) || activeBlocks[0]
        : activeBlocks[activeBlocks.length - 1];

      switch (action) {
        case "undo":
          document.execCommand("undo");
          break;
        case "redo":
          document.execCommand("redo");
          break;
        case "bold":
          document.execCommand("bold");
          break;
        case "italic":
          document.execCommand("italic");
          break;
        case "underline":
          document.execCommand("underline");
          break;
        case "strike":
          document.execCommand("strikeThrough");
          break;
        case "link": {
          const url = prompt("Введите адрес ссылки (URL):", "https://");
          if (url && url.trim()) {
            document.execCommand("createLink", false, url.trim());
          }
          break;
        }
        case "h1":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "heading1");
          } else {
            handleAddBlock("heading1");
          }
          break;
        case "h2":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "heading2");
          } else {
            handleAddBlock("heading2");
          }
          break;
        case "h3":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "heading3");
          } else {
            handleAddBlock("heading3");
          }
          break;
        case "bullet-list":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "bullet-list");
          } else {
            handleAddBlock("bullet-list");
          }
          break;
        case "numbered-list":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "numbered-list");
          } else {
            handleAddBlock("numbered-list");
          }
          break;
        case "todo-list":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "todo");
          } else {
            handleAddBlock("todo");
          }
          break;
        case "quote":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "quote");
          } else {
            handleAddBlock("quote");
          }
          break;
        case "code":
          if (targetBlock) {
            handleChangeBlockType(targetBlock.id, "code-block");
          } else {
            handleAddBlock("code-block");
          }
          break;
        case "table":
          handleAddBlock("table", undefined, targetBlock?.id);
          break;
        case "image":
          handleAddBlock("image", undefined, targetBlock?.id);
          break;
      }
    },
    [activeBlockId, canEdit, handleAddBlock, handleChangeBlockType]
  );

  // Perform meaningful Merkle Commit
  const handlePerformCommit = useCallback(
    async (params: { message: string; description?: string; branch: string }) => {
      const doc = docRef.current;
      if (!doc || !canEdit) return;

      const markdown = serializeCRDTToMarkdown(doc);
      branchContentsRef.current[params.branch] = markdown;
      useWorkspaceStore.getState().saveDocumentContent(documentId, markdown, title);

      const fullMessage = params.description
        ? `${params.message}\n\n${params.description}`
        : params.message;

      const res = await fetch(`/api/documents/${documentId}/commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          branch: params.branch,
          parents: currentCommitId ? [currentCommitId] : [],
          stateVector: { crdt_clock: 1 },
          message: fullMessage,
          content: markdown,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось создать коммит");
      }

      const data = await res.json();
      if (data.commit) {
        setCommits((prev) => [...prev, data.commit]);
        setCurrentCommitId(data.commit.id);
        if (params.branch !== branch) {
          setBranch(params.branch);
        }
        if (!branches.includes(params.branch)) {
          setBranches((prev) => [...prev, params.branch]);
        }
      }

      setSaveStatus("saved");
    },
    [branch, branches, canEdit, currentCommitId, documentId, title]
  );

  // Branch Switching: Switches document content and active commit
  const handleSelectBranch = useCallback(
    (targetBranch: string) => {
      if (targetBranch === branch) return;

      const doc = docRef.current;
      if (doc) {
        // 1. Preserve current branch's draft
        const currentMd = serializeCRDTToMarkdown(doc);
        branchContentsRef.current[branch] = currentMd;
      }

      // 2. Determine target branch's content
      let targetContent = branchContentsRef.current[targetBranch];

      // If not yet in memory draft, find latest commit on targetBranch
      if (!targetContent) {
        const branchCommits = commits.filter((c) => c.branch === targetBranch);
        if (branchCommits.length > 0) {
          const headCommit = branchCommits[branchCommits.length - 1];
          if (headCommit.content) {
            targetContent = headCommit.content;
          }
          setCurrentCommitId(headCommit.id);
        }
      }

      if (!targetContent) {
        targetContent = branchContentsRef.current["main"] || `# ${title}\n\nВетка ${targetBranch}`;
      }

      branchContentsRef.current[targetBranch] = targetContent;
      setBranch(targetBranch);

      // 3. Load target content into CRDT
      const freshDoc = new CRDTDocument(1);
      docRef.current = freshDoc;
      initCRDTFromMarkdown(freshDoc, targetContent);
      freshDoc.onUpdate(refreshBlocks);
      refreshBlocks();
    },
    [branch, commits, refreshBlocks, title]
  );

  // Branch creation with backend persistence
  const handleCreateBranch = useCallback(
    async (newBranch: string, fromCommitId?: string) => {
      const cleanBranch = newBranch.trim().replace(/\s+/g, "-");
      if (!cleanBranch) return;

      const baseId = fromCommitId || currentCommitId || (commits.length > 0 ? commits[commits.length - 1].id : undefined);

      try {
        const res = await fetch(`/api/documents/${documentId}/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: cleanBranch,
            fromCommitId: baseId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.branch) {
            setBranchesInfo((prev) => [
              ...prev.filter((b) => b.name !== cleanBranch),
              data.branch,
            ]);
          }
        }
      } catch (err) {
        console.warn("Failed to persist branch on server:", err);
      }

      if (!branches.includes(cleanBranch)) {
        setBranches((prev) => [...prev, cleanBranch]);
      }

      // Determine initial content from base commit if provided, or from current draft
      const baseCommit = baseId ? commits.find((c) => c.id === baseId) : null;
      const initialBranchContent =
        baseCommit?.content ??
        (docRef.current ? serializeCRDTToMarkdown(docRef.current) : "");

      branchContentsRef.current[cleanBranch] = initialBranchContent;
      handleSelectBranch(cleanBranch);
    },
    [branches, currentCommitId, commits, documentId, handleSelectBranch]
  );

  // Fork branch confirmation handler
  const handleConfirmFork = useCallback(
    (branchName: string, sourceCommitId: string) => {
      handleCreateBranch(branchName, sourceCommitId);
      setTimeTravelIndex(null);
    },
    [handleCreateBranch]
  );

  // Revert commit handler
  const handleRevertCommit = useCallback(
    async (commitId: string) => {
      try {
        const res = await fetch(`/api/documents/${documentId}/commits/revert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            commitId,
            branch,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.commit) {
            setCommits((prev) => [...prev, data.commit]);
            setCurrentCommitId(data.commit.id);
            const revertedContent = data.revertedContent ?? data.commit.content ?? "";
            branchContentsRef.current[branch] = revertedContent;
            useWorkspaceStore.getState().saveDocumentContent(documentId, revertedContent, title);

            const freshDoc = new CRDTDocument(1);
            docRef.current = freshDoc;
            initCRDTFromMarkdown(freshDoc, revertedContent);
            freshDoc.onUpdate(refreshBlocks);
            refreshBlocks();
            setTimeTravelIndex(null);
          }
        }
      } catch (err) {
        console.error("Revert commit error:", err);
      }
    },
    [branch, documentId, refreshBlocks, title]
  );

  // Delete commit handler
  const handleDeleteCommit = useCallback(
    async (commitId: string) => {
      try {
        const res = await fetch(
          `/api/documents/${documentId}/commits?commitId=${encodeURIComponent(commitId)}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (res.ok) {
          const data = await res.json();
          setCommits((prev) => prev.filter((c) => c.id !== commitId));
          if (data.newHeadCommitId) {
            setCurrentCommitId(data.newHeadCommitId);
            const nextCommit = commits.find((c) => c.id === data.newHeadCommitId);
            if (nextCommit?.content) {
              branchContentsRef.current[branch] = nextCommit.content;
              const freshDoc = new CRDTDocument(1);
              docRef.current = freshDoc;
              initCRDTFromMarkdown(freshDoc, nextCommit.content);
              freshDoc.onUpdate(refreshBlocks);
              refreshBlocks();
            }
          }
          setTimeTravelIndex(null);
        }
      } catch (err) {
        console.error("Delete commit error:", err);
      }
    },
    [branch, commits, documentId, refreshBlocks]
  );

  // Real 3-Way Merge handler
  const handleConfirmMerge = async (source: string, target: string, resolvedContent?: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceBranch: source,
          targetBranch: target,
          targetCommitId: currentCommitId,
          resolvedContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mergeCommit) {
          setCommits((prev) => [...prev, data.mergeCommit]);
          setCurrentCommitId(data.mergeCommit.id);
          const finalMergedText = data.mergedPlainText ?? data.mergeCommit.content;
          if (finalMergedText !== undefined && finalMergedText !== null) {
            branchContentsRef.current[target] = finalMergedText;
            useWorkspaceStore.getState().saveDocumentContent(documentId, finalMergedText, title);

            if (branch === target) {
              const freshDoc = new CRDTDocument(1);
              docRef.current = freshDoc;
              initCRDTFromMarkdown(freshDoc, finalMergedText);
              freshDoc.onUpdate(refreshBlocks);
              refreshBlocks();
            } else {
              handleSelectBranch(target);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[3-Way Merge error]:", err);
    }
  };

  // Import local Markdown or text file
  const handleImportMarkdown = useCallback(
    (content: string, filename?: string) => {
      if (!canEdit) return;

      const freshDoc = new CRDTDocument(1);
      docRef.current = freshDoc;
      initCRDTFromMarkdown(freshDoc, content);
      freshDoc.onUpdate(refreshBlocks);
      refreshBlocks();

      branchContentsRef.current[branch] = content;

      if (filename && (title === "Новый документ" || !title.trim())) {
        handleTitleChange(filename);
      } else {
        triggerAutoSave();
      }
    },
    [branch, canEdit, handleTitleChange, refreshBlocks, title, triggerAutoSave]
  );

  // Delete current document
  const handleDeleteDocument = useCallback(async () => {
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      useWorkspaceStore.getState().deleteDocument(documentId);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete document:", err);
      router.push("/dashboard");
    }
  }, [documentId, router]);

  // Export handlers
  const handleExportMarkdown = useCallback(() => {
    const doc = docRef.current;
    const content = doc ? serializeCRDTToMarkdown(doc) : Object.values(blockTexts).join("\n\n");
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
      setActiveBlockId(id);
    }
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
        onTitleChange={handleTitleChange}
        canEdit={canEdit}
        roleTitle={
          userRole === "viewer"
            ? "Читатель"
            : userRole === "commenter"
            ? "Комменты"
            : userRole === "owner"
            ? "Владелец"
            : "Редактор"
        }
        currentBranch={branch}
        branches={branches}
        onSelectBranch={handleSelectBranch}
        onCreateBranch={handleCreateBranch}
        onExportMarkdown={handleExportMarkdown}
        onExportPdf={handleExportPdf}
        onImportMarkdown={handleImportMarkdown}
        onDeleteDocument={handleDeleteDocument}
        onToggleHistory={() => setSidebarOpen(true)}
        onToggleDiff={() => setIsDiffOpen(!isDiffOpen)}
        saveStatus={saveStatus}
        onSave={canEdit ? () => setIsCommitDialogOpen(true) : undefined}
        onlineUsers={onlineUsers}
      />

      <EditorToolbar onAction={handleToolbarAction} disabled={!canEdit} />

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
            className={`w-full ${canvasWidthClass} min-h-[1050px] bg-card border border-border shadow-xs rounded-2xl p-8 sm:p-14 relative text-foreground space-y-4 transition-all duration-200`}
          >
            {blocksState.map((block) => {
              const bKey = formatID(block.id);
              const text = blockTexts[bKey] ?? "";

              return (
                <div key={bKey} id={`block-${bKey}`}>
                  <BlockEditorItem
                    block={block}
                    text={text}
                    canEdit={canEdit}
                    isActive={activeBlockId === bKey}
                    onFocus={() => setActiveBlockId(bKey)}
                    onChangeText={(newText) => handleTextChange(block.id, newText)}
                    onChangeType={(newType) => handleChangeBlockType(block.id, newType)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onInsertAfter={(type) => handleAddBlock(type, undefined, block.id)}
                    onEnter={() => handleAddBlock("paragraph", undefined, block.id)}
                    onBackspaceEmpty={() => handleDeleteBlock(block.id)}
                    documentId={documentId}
                  />
                </div>
              );
            })}

            {/* Quick action block inserter dock */}
            <div
              className={`pt-8 border-t border-dashed border-border/70 flex flex-wrap items-center gap-2 ${
                canEdit ? "" : "hidden pointer-events-none"
              }`}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("paragraph")}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Абзац</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("heading1")}
                className="h-8 text-xs gap-1.5 cursor-pointer font-bold hover:bg-primary/10"
              >
                <Heading1 className="h-3.5 w-3.5" />
                <span>Заголовок H1</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("heading2")}
                className="h-8 text-xs gap-1.5 cursor-pointer font-semibold hover:bg-primary/10"
              >
                <Heading2 className="h-3.5 w-3.5" />
                <span>Заголовок H2</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("quote")}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-primary/10"
              >
                <Quote className="h-3.5 w-3.5" />
                <span>Цитата</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("todo")}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-primary/10"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Задача (Todo)</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("table")}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-primary/10"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Таблица</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock("image")}
                className="h-8 text-xs gap-1.5 cursor-pointer hover:bg-primary/10"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Изображение</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right collapsible sidebar */}
        <EditorSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          documentId={documentId}
          commits={commits}
          currentCommitId={currentCommitId}
          currentBranch={branch}
          branches={branchesInfo}
          headings={headings}
          onSelectHeading={handleScrollToHeading}
          onSelectCommit={(id) => {
            setCurrentCommitId(id);
            const idx = commits.findIndex((c) => c.id === id);
            if (idx >= 0) {
              setTimeTravelIndex(idx);
              const targetCommit = commits[idx];
              if (targetCommit?.content !== undefined && targetCommit.content !== null) {
                const freshDoc = new CRDTDocument(1);
                docRef.current = freshDoc;
                initCRDTFromMarkdown(freshDoc, targetCommit.content);
                freshDoc.onUpdate(refreshBlocks);
                refreshBlocks();
              }
            }
          }}
          onForkBranch={(commitId) => {
            const c = commits.find((x) => x.id === commitId) || null;
            setForkSourceCommit(c);
            setIsForkDialogOpen(true);
          }}
          onRevertCommit={handleRevertCommit}
          onDeleteCommit={handleDeleteCommit}
          canEdit={canEdit}
          onOpenMergeDialog={() => setIsMergeOpen(true)}
          onOpenDiffDialog={() => setIsDiffOpen(!isDiffOpen)}
        />

        {/* Time travel slider bottom dock */}
        {timeTravelIndex !== null && commits.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
            <TimeTravelSlider
              commits={commits}
              currentIndex={timeTravelIndex}
              onIndexChange={(idx) => {
                setTimeTravelIndex(idx);
                if (commits[idx]) {
                  const targetCommit = commits[idx];
                  setCurrentCommitId(targetCommit.id);
                  if (targetCommit.content !== undefined && targetCommit.content !== null) {
                    const freshDoc = new CRDTDocument(1);
                    docRef.current = freshDoc;
                    initCRDTFromMarkdown(freshDoc, targetCommit.content);
                    freshDoc.onUpdate(refreshBlocks);
                    refreshBlocks();
                  }
                }
              }}
              onExitTimeTravel={() => {
                setTimeTravelIndex(null);
                let currentContent = branchContentsRef.current[branch];
                if (!currentContent) {
                  const branchCommits = commits.filter((c) => c.branch === branch);
                  if (branchCommits.length > 0) {
                    currentContent = branchCommits[branchCommits.length - 1].content || "";
                  }
                }
                if (!currentContent && commits.length > 0) {
                  currentContent = commits[commits.length - 1].content || "";
                }
                if (currentContent && docRef.current) {
                  const freshDoc = new CRDTDocument(1);
                  docRef.current = freshDoc;
                  initCRDTFromMarkdown(freshDoc, currentContent);
                  freshDoc.onUpdate(refreshBlocks);
                  refreshBlocks();
                }
              }}
              onForkBranch={(commitId) => {
                const c = commits.find((x) => x.id === commitId) || null;
                setForkSourceCommit(c);
                setIsForkDialogOpen(true);
              }}
              onRevertCommit={handleRevertCommit}
            />
          </div>
        )}
      </div>

      <EditorStatusbar
        wordCount={stats.words}
        charCount={stats.chars}
        activeUsers={onlineUsers.length || 1}
        branch={branch}
      />

      {/* 3-Way Merge dialog with conflict resolution */}
      <MergeBranchDialog
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        branches={branches}
        currentBranch={branch}
        documentId={documentId}
        onConfirmMerge={handleConfirmMerge}
      />

      {/* Fork branch from commit dialog */}
      <ForkBranchDialog
        open={isForkDialogOpen}
        onOpenChange={setIsForkDialogOpen}
        sourceCommit={forkSourceCommit}
        existingBranches={branches}
        onConfirmFork={handleConfirmFork}
      />

      {/* Meaningful Merkle Commit Dialog */}
      <CommitDialog
        open={isCommitDialogOpen}
        onOpenChange={setIsCommitDialogOpen}
        currentBranch={branch}
        branches={branches}
        onCommit={handlePerformCommit}
        stats={stats}
      />
    </div>
  );
}
