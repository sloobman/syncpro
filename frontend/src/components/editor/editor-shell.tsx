"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type Editor, type JSONContent } from "@tiptap/react";
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
import { PagedCanvas } from "@/components/editor/paged-canvas";
import { TiptapEditor } from "@/components/editor/tiptap/tiptap-editor";
import { EditorErrorBoundary } from "@/components/editor/editor-error-boundary";
import { DEFAULT_PAGE_LAYOUT, type PageLayoutConfig } from "@/lib/types/page-layout";
import { DocumentConverter } from "@/lib/documents/document-converter";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useAuthStore } from "@/lib/stores/auth-store";

interface AwarenessUser {
  clientId?: string;
  user?: {
    id?: string;
    name?: string;
    avatarUrl?: string | null;
    color?: string;
  };
}

interface EditorShellProps {
  documentId?: string;
}

/**
 * Parses raw document content (JSON string, markdown, or plain text) into a valid Tiptap AST doc.
 */
function parseInitialTiptapContent(rawContent: string | null | undefined, title: string): JSONContent {
  if (rawContent && rawContent.trim()) {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && parsed.type === "doc") {
        return parsed;
      }
    } catch {}

    // Fallback parser for plain text / legacy markdown lines
    const lines = rawContent.split("\n");
    const nodes: JSONContent[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        nodes.push({ type: "paragraph" });
        continue;
      }
      if (trimmed.startsWith("# ")) {
        nodes.push({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: trimmed.slice(2).trim() }],
        });
      } else if (trimmed.startsWith("## ")) {
        nodes.push({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: trimmed.slice(3).trim() }],
        });
      } else if (trimmed.startsWith("### ")) {
        nodes.push({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: trimmed.slice(4).trim() }],
        });
      } else if (trimmed === "<!-- pagebreak -->" || trimmed === "\\pagebreak" || trimmed === "---pagebreak---") {
        nodes.push({ type: "pageBreak" });
      } else {
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        });
      }
    }
    return { type: "doc", content: nodes.length > 0 ? nodes : [{ type: "paragraph" }] };
  }

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: title || "Новый документ" }],
      },
      { type: "paragraph" },
    ],
  };
}

export function EditorShell({ documentId = "doc_1" }: EditorShellProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState<string>(() => {
    const store = useWorkspaceStore.getState();
    const docMeta = store.getDocumentById(documentId);
    return (
      docMeta?.title ||
      (documentId === "doc_1" ? "Глава 1: Введение в системы совместного редактирования" : "Новый документ")
    );
  });
  const [initialContent, setInitialContent] = useState<JSONContent>(() => {
    const store = useWorkspaceStore.getState();
    const docMeta = store.getDocumentById(documentId);
    const savedContent = store.getDocumentContent(documentId);
    const docTitle =
      docMeta?.title ||
      (documentId === "doc_1" ? "Глава 1: Введение в системы совместного редактирования" : "Новый документ");
    return parseInitialTiptapContent(savedContent, docTitle);
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [canEdit, setCanEdit] = useState(true);
  const [userRole, setUserRole] = useState<string>("owner");
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Sidebar & Layout State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLayout, setPageLayout] = useState<PageLayoutConfig>(DEFAULT_PAGE_LAYOUT);

  // Active Typography state for toolbar indicators
  const [activeFont, setActiveFont] = useState("Inter, sans-serif");
  const [activeSize, setActiveSize] = useState("16px");

  // Version Control & Branches
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [activeBranch, setActiveBranch] = useState("main");
  const [branchesInfo, setBranchesInfo] = useState<BranchInfo[]>([]);
  const [commits, setCommits] = useState<MerkleCommit[]>([]);
  const [currentCommitId, setCurrentCommitId] = useState<string | null>(null);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isForkDialogOpen, setIsForkDialogOpen] = useState(false);
  const [forkSourceCommit, setForkSourceCommit] = useState<MerkleCommit | null>(null);

  // Time Travel & Diff State
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [timeTravelIndex, setTimeTravelIndex] = useState(0);
  const [isComparingLCA, setIsComparingLCA] = useState(false);
  const [lcaDiffData] = useState<{ oldContent: string; newContent: string } | null>(null);

  // Presence & Online Collaborators
  const [onlineUsers, setOnlineUsers] = useState<CollaboratorInfo[]>([]);
  const clientIdRef = useRef<string>("");
  const myColorRef = useRef<string>("#3b82f6");
  const branchContentsRef = useRef<Record<string, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const syncBroadcastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize client id and avatar color
  useEffect(() => {
    clientIdRef.current = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
    myColorRef.current = colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Initialize document content from store and API
  useEffect(() => {
    branchContentsRef.current["main"] = JSON.stringify(initialContent);

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
          const parsed = parseInitialTiptapContent(data.content, data.document?.title || title);
          setInitialContent(parsed);
          if (editor) {
            editor.commands.setContent(parsed);
          }
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

          for (const c of data.commits) {
            if (c.branch && c.content && !branchContentsRef.current[c.branch]) {
              branchContentsRef.current[c.branch] = c.content;
            }
          }
        }
      })
      .catch(() => {});
  }, [documentId]);

  // Real-time Awareness Polling (Redis presence)
  useEffect(() => {
    let cancelled = false;

    const pollAwareness = async () => {
      try {
        const cId = clientIdRef.current || `client_${Date.now().toString(36)}`;
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
              cursor: { blockId: "root" },
            },
          }),
        });

        const res = await fetch(`/api/documents/${documentId}/awareness`, {
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const usersList: CollaboratorInfo[] = (data.users || []).map((u: AwarenessUser) => ({
            id: u.clientId || u.user?.id || Math.random().toString(),
            name: u.user?.name || "Соавтор",
            avatarUrl: u.user?.avatarUrl || null,
            color: u.user?.color || "#10b981",
            isActive: true,
          }));
          setOnlineUsers(usersList);
        }
      } catch {}
    };

    pollAwareness();
    const interval = setInterval(pollAwareness, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [documentId, user]);

  // Broadcast changes via Redis SSE sync
  const broadcastSyncUpdate = useCallback(
    (json: JSONContent) => {
      if (syncBroadcastTimerRef.current) clearTimeout(syncBroadcastTimerRef.current);
      syncBroadcastTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/documents/${documentId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              clientId: clientIdRef.current,
              json,
              timestamp: Date.now(),
            }),
          });
        } catch {}
      }, 200);
    },
    [documentId]
  );

  // Subscribe to real-time SSE updates for concurrent multi-tab editing
  useEffect(() => {
    if (!documentId) return;
    let es: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupEventSource = () => {
      try {
        es = new EventSource(`/api/documents/${documentId}/sync`);
        es.addEventListener("crdt", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.clientId === clientIdRef.current) return;
            if (data.json && editor) {
              isRemoteUpdateRef.current = true;
              const pos = editor.state.selection.from;
              editor.commands.setContent(data.json, false);
              try {
                const max = editor.state.doc.content.size;
                editor.commands.setTextSelection(Math.min(pos, max));
              } catch {}
              isRemoteUpdateRef.current = false;
              const text = editor.getText();
              const words = text.trim() ? text.trim().split(/\s+/).length : 0;
              setStats({ words, chars: text.length });
            }
          } catch {}
        });
        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          reconnectTimer = setTimeout(setupEventSource, 4000);
        };
      } catch {}
    };

    setupEventSource();
    return () => {
      if (es) es.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [documentId, editor]);

  // Debounced auto-save to backend
  const triggerAutoSave = useCallback(
    (jsonContentStr: string) => {
      if (!canEdit) return;
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          useWorkspaceStore.getState().saveDocumentContent(documentId, jsonContentStr);
          if (documentId === "demo") {
            try {
              localStorage.setItem("syncpro_demo_doc", jsonContentStr);
            } catch {}
            setSaveStatus("saved");
            return;
          }
          const res = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content: jsonContentStr }),
          });
          if (res.ok) {
            setSaveStatus("saved");
          } else {
            setSaveStatus("unsaved");
          }
        } catch {
          setSaveStatus("unsaved");
        }
      }, 1000);
    },
    [canEdit, documentId]
  );

  // Handle updates from Tiptap editor
  const handleEditorUpdate = useCallback(
    ({ json, text }: { json: JSONContent; html: string; text: string }) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      setStats({ words, chars });

      if (isRemoteUpdateRef.current) return;

      const contentStr = JSON.stringify(json);
      branchContentsRef.current[activeBranch] = contentStr;
      triggerAutoSave(contentStr);
      broadcastSyncUpdate(json);
    },
    [activeBranch, triggerAutoSave, broadcastSyncUpdate]
  );

  // Track selection for toolbar font & size indicators
  const handleSelectionUpdate = useCallback((ed: Editor) => {
    // Check font size
    const size = ed.getAttributes("textStyle")?.fontSize || "16px";
    setActiveSize(size);

    // Check font family
    const font = ed.getAttributes("textStyle")?.fontFamily || "Inter, sans-serif";
    setActiveFont(font);
  }, []);

  // Rename document
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      try {
        await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: newTitle }),
        });
      } catch {}
    },
    [documentId]
  );

  // Toolbar Actions Execution via Tiptap
  const handleToolbarAction = useCallback(
    (action: string) => {
      if (!editor || !canEdit) return;

      switch (action) {
        case "undo":
          editor.chain().focus().undo().run();
          break;
        case "redo":
          editor.chain().focus().redo().run();
          break;
        case "bold":
          editor.chain().focus().toggleBold().run();
          break;
        case "italic":
          editor.chain().focus().toggleItalic().run();
          break;
        case "underline":
          editor.chain().focus().toggleUnderline().run();
          break;
        case "strike":
          editor.chain().focus().toggleStrike().run();
          break;
        case "h1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "p":
        case "paragraph":
          editor.chain().focus().setParagraph().run();
          break;
        case "bullet-list":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "numbered-list":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "code":
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case "table":
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case "image": {
          imageInputRef.current?.click();
          break;
        }
        case "pagebreak":
          editor.chain().focus().setPageBreak().run();
          break;
      }
    },
    [editor, canEdit]
  );

  const handleFontChange = useCallback(
    (font: string) => {
      if (!editor || !canEdit) return;
      setActiveFont(font);
      editor.chain().focus().setFontFamily(font).run();
    },
    [editor, canEdit]
  );

  const handleSizeChange = useCallback(
    (size: string) => {
      if (!editor || !canEdit) return;
      setActiveSize(size);
      editor.chain().focus().setFontSize(size).run();
    },
    [editor, canEdit]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!editor || !canEdit) return;
      if (color === "inherit") {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
    },
    [editor, canEdit]
  );

  const handleHighlightChange = useCallback(
    (color: string) => {
      if (!editor || !canEdit) return;
      if (color === "transparent") {
        editor.chain().focus().unsetHighlight().run();
      } else {
        editor.chain().focus().setHighlight({ color }).run();
      }
    },
    [editor, canEdit]
  );

  const handleAlignChange = useCallback(
    (align: "left" | "center" | "right" | "justify") => {
      if (!editor || !canEdit) return;
      editor.chain().focus().setTextAlign(align).run();
    },
    [editor, canEdit]
  );

  const handleSpacingChange = useCallback(
    (spacing: { lineHeight: number | string; paragraphSpacing: number; letterSpacing: string }) => {
      setPageLayout((prev) => ({
        ...prev,
        lineHeight: spacing.lineHeight,
        paragraphSpacing: spacing.paragraphSpacing,
        letterSpacing: spacing.letterSpacing,
      }));
      if (editor) {
        editor.chain().focus().setLineHeight(String(spacing.lineHeight)).run();
      }
    },
    [editor]
  );

  const handleInsertLink = useCallback(
    (linkData: { url: string; text: string; openInNewTab: boolean }) => {
      if (!editor || !canEdit) return;
      if (!editor.state.selection.empty) {
        editor.commands.setLink({ href: linkData.url });
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: linkData.text || linkData.url,
            marks: [{ type: "link", attrs: { href: linkData.url } }],
          })
          .run();
      }
    },
    [editor, canEdit]
  );

  const handleDropImage = useCallback(
    async (file: File) => {
      if (!editor || !canEdit) return;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            editor.chain().focus().setImage({ src: data.url }).run();
            return;
          }
        }
      } catch {}

      // Fallback: local FileReader data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      };
      reader.readAsDataURL(file);
    },
    [editor, canEdit]
  );

  // Document Export (DOCX, ODT, PDF, Markdown, TXT)
  const handleExport = useCallback(
    async (format: string) => {
      if (!editor) return;
      const json = editor.getJSON();

      const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(url);
        }, 1500);
      };

      try {
        if (format === "docx") {
          const blob = await DocumentConverter.exportTiptapToDocx(json, title, pageLayout);
          downloadBlob(blob, `${title || "document"}.docx`);
        } else if (format === "odt") {
          const blob = await DocumentConverter.exportTiptapToOdt(json, title, pageLayout);
          downloadBlob(blob, `${title || "document"}.odt`);
        } else if (format === "pdf") {
          window.print();
        } else if (format === "txt") {
          const text = editor.getText();
          const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
          downloadBlob(blob, `${title || "document"}.txt`);
        } else if (format === "md") {
          const text = editor.getText();
          const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
          downloadBlob(blob, `${title || "document"}.md`);
        }
      } catch (err) {
        console.error("Export error:", err);
      }
    },
    [editor, title, pageLayout]
  );

  // Branch switching
  const handleSelectBranch = useCallback(
    (branchName: string) => {
      if (branchName === activeBranch) return;
      if (editor) {
        branchContentsRef.current[activeBranch] = JSON.stringify(editor.getJSON());
      }
      setActiveBranch(branchName);

      const targetContent = branchContentsRef.current[branchName];
      if (editor) {
        const parsed = parseInitialTiptapContent(targetContent, title);
        editor.commands.setContent(parsed);
      }
    },
    [activeBranch, editor, title]
  );

  // Branch creation
  const handleCreateBranch = useCallback(
    async (name: string) => {
      try {
        const currentContent = editor ? JSON.stringify(editor.getJSON()) : (branchContentsRef.current[activeBranch] || "{}");
        branchContentsRef.current[name] = currentContent;

        const res = await fetch(`/api/documents/${documentId}/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          setBranches((prev) => Array.from(new Set([...prev, name])));
          handleSelectBranch(name);
        }
      } catch {}
    },
    [documentId, editor, activeBranch, handleSelectBranch]
  );

  // Commit Creation
  const handleCreateCommit = useCallback(
    async (message: string) => {
      if (!editor) return;
      const jsonContent = editor.getJSON();
      const contentStr = JSON.stringify(jsonContent);

      try {
        const res = await fetch(`/api/documents/${documentId}/commits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message,
            branch: activeBranch,
            content: contentStr,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.commit) {
            setCommits((prev) => [...prev, data.commit]);
            setCurrentCommitId(data.commit.id);
          }
        }
      } catch {}
    },
    [editor, documentId, activeBranch]
  );

  // Time travel history slider
  const handleTimeTravelCommitChange = useCallback(
    (commitIndex: number) => {
      setTimeTravelIndex(commitIndex);
      const commit = commits[commitIndex];
      if (commit && commit.content && editor) {
        const parsed = parseInitialTiptapContent(commit.content, title);
        editor.commands.setContent(parsed);
      }
    },
    [commits, editor, title]
  );

  const handleExitTimeTravel = useCallback(() => {
    setIsTimeTraveling(false);
    const activeContent = branchContentsRef.current[activeBranch];
    if (editor && activeContent) {
      const parsed = parseInitialTiptapContent(activeContent, title);
      editor.commands.setContent(parsed);
    }
  }, [activeBranch, editor, title]);

  // Extract outline headings from Tiptap AST
  const headings: HeadingItem[] = useMemo(() => {
    if (!editor) return [];
    const items: HeadingItem[] = [];
    const json = editor.getJSON();

    const traverse = (node: JSONContent) => {
      if (node.type === "heading") {
        const text = (node.content || []).map((c) => c.text || "").join("");
        if (text) {
          items.push({
            id: `heading-${items.length}`,
            text,
            level: node.attrs?.level || 1,
          });
        }
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };
    traverse(json);
    return items;
  }, [editor]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Topbar */}
      <div className="print:hidden">
        <EditorTopbar
          title={title}
          onTitleChange={handleTitleChange}
          saveStatus={saveStatus}
          canEdit={canEdit && !isTimeTraveling}
          branches={branches}
          currentBranch={activeBranch}
          onSelectBranch={handleSelectBranch}
          onCreateBranch={handleCreateBranch}
          onExportDocx={() => handleExport("docx")}
          onExportOdt={() => handleExport("odt")}
          onExportPdf={() => handleExport("pdf")}
          onExportTxt={() => handleExport("txt")}
          onExportMarkdown={() => handleExport("md")}
          onToggleHistory={() => {
            setIsTimeTraveling((v) => !v);
            setTimeTravelIndex(Math.max(0, commits.length - 1));
          }}
          onlineUsers={onlineUsers}
          roleTitle={userRole === "owner" ? "Владелец" : userRole === "editor" ? "Редактор" : "Читатель"}
        />
      </div>

      {/* Ribbon Toolbar */}
      <div className="print:hidden">
        <EditorToolbar
          onAction={handleToolbarAction}
          disabled={!canEdit || isTimeTraveling}
          currentFont={activeFont}
          currentSize={activeSize}
          onFontChange={handleFontChange}
          onSizeChange={handleSizeChange}
          onColorChange={handleColorChange}
          onHighlightChange={handleHighlightChange}
          onAlignChange={handleAlignChange}
          pageConfig={pageLayout}
          onChangePageConfig={(updates) => setPageLayout((prev) => ({ ...prev, ...updates }))}
          onInsertPageBreak={() => handleToolbarAction("pagebreak")}
          currentLineHeight={pageLayout.lineHeight || 1.5}
          currentParagraphSpacing={pageLayout.paragraphSpacing || 8}
          currentLetterSpacing={pageLayout.letterSpacing || "normal"}
          onChangeSpacing={handleSpacingChange}
          onInsertLink={handleInsertLink}
        />
      </div>

      {/* Main Canvas + Sidebar Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Visual LCA Diff Banner */}
          {isComparingLCA && lcaDiffData && (
            <div className="p-3 bg-muted/90 border-b border-border z-20 flex flex-col gap-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Сравнение версий (LCA Diff)</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setIsComparingLCA(false)}
                >
                  <X className="h-3 w-3" />
                  <span>Закрыть сравнение</span>
                </Button>
              </div>
              <DiffViewer
                oldText={lcaDiffData.oldContent}
                newText={lcaDiffData.newContent}
                oldLabel="LCA предок"
                newLabel="Текущая ветка"
              />
            </div>
          )}

          {/* Time Travel Floating Banner */}
          {isTimeTraveling && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto">
              <TimeTravelSlider
                commits={commits}
                currentIndex={timeTravelIndex}
                onIndexChange={handleTimeTravelCommitChange}
                onExitTimeTravel={handleExitTimeTravel}
                onForkBranch={(cId) => {
                  const c = commits.find((x) => x.id === cId);
                  if (c) {
                    setForkSourceCommit(c);
                    setIsForkDialogOpen(true);
                  }
                }}
              />
            </div>
          )}

          {/* Monolithic Google Docs Canvas */}
          <EditorErrorBoundary>
            <PagedCanvas
              pageConfig={pageLayout}
              onPageConfigChange={(updates) => setPageLayout((prev) => ({ ...prev, ...updates }))}
              canEdit={canEdit && !isTimeTraveling}
              onDropImage={handleDropImage}
              documentTitle={title}
            >
              <TiptapEditor
                initialContent={initialContent}
                editable={canEdit && !isTimeTraveling}
                onEditorReady={(ed) => {
                setEditor(ed);
                const text = ed.getText();
                const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                setStats({ words, chars: text.length });
              }}
                onUpdate={handleEditorUpdate}
                onSelectionUpdate={handleSelectionUpdate}
              />
            </PagedCanvas>
          </EditorErrorBoundary>
        </div>

        {/* Collapsible Sidebar */}
        <div className="print:hidden">
          <EditorSidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            documentId={documentId}
            headings={headings}
            commits={commits}
            currentCommitId={currentCommitId || undefined}
            branches={branchesInfo}
            currentBranch={activeBranch}
            onSelectCommit={(commitId) => {
              const idx = commits.findIndex((c) => c.id === commitId);
              if (idx !== -1) {
                setIsTimeTraveling(true);
                handleTimeTravelCommitChange(idx);
              }
            }}
            onForkBranch={(commitId) => {
              const c = commits.find((x) => x.id === commitId);
              if (c) {
                setForkSourceCommit(c);
                setIsForkDialogOpen(true);
              }
            }}
            onOpenMergeDialog={() => setIsMergeDialogOpen(true)}
            canEdit={canEdit && !isTimeTraveling}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="print:hidden">
        <EditorStatusbar
          wordCount={stats.words}
          charCount={stats.chars}
          activeUsers={onlineUsers.length}
          branch={activeBranch}
          pageInfo={pageLayout.pageless ? "Бесстраничный" : "A4 • Страница 1"}
        />
      </div>

      {/* Dialogs */}
      <CommitDialog
        open={isCommitDialogOpen}
        onOpenChange={setIsCommitDialogOpen}
        currentBranch={activeBranch}
        branches={branches}
        onCommit={async ({ message }) => {
          await handleCreateCommit(message);
          setIsCommitDialogOpen(false);
        }}
        stats={stats}
      />

      <MergeBranchDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        currentBranch={activeBranch}
        branches={branches}
        documentId={documentId}
        onConfirmMerge={async (source, target, resolved) => {
          try {
            const res = await fetch(`/api/documents/${documentId}/merge`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ sourceBranch: source, targetBranch: target, resolvedContent: resolved }),
            });
            if (res.ok) {
              setIsMergeDialogOpen(false);
              router.refresh();
            }
          } catch {}
        }}
      />

      {forkSourceCommit && (
        <ForkBranchDialog
          open={isForkDialogOpen}
          onOpenChange={setIsForkDialogOpen}
          sourceCommit={forkSourceCommit}
          existingBranches={branches}
          onConfirmFork={(name) => {
            handleCreateBranch(name);
            setIsForkDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
