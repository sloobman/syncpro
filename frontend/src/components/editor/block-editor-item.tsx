"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { BlockNode, BlockType } from "@/lib/crdt/types";
import { RichTextRenderer, sanitizeInlineStyle } from "./rich-text-renderer";
import {
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  CheckSquare,
  List,
  ListOrdered,
  Code,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Plus,
  Trash2,
  Copy,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  Upload,
  Loader2,
  AlertCircle,
  Scissors,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface BlockEditorItemProps {
  block: BlockNode;
  text: string;
  canEdit: boolean;
  isActive: boolean;
  onFocus: () => void;
  onChangeText: (newText: string) => void;
  onChangeType: (newType: BlockType) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  documentId?: string;
}

/**
 * Sanitizes HTML before rendering in contentEditable DOM to prevent Stored XSS.
 * Removes forbidden tags (script, iframe, etc.) and all on* event handlers.
 */
export function sanitizeHtmlForEditor(rawHtml: string): string {
  if (!rawHtml) return "";
  if (typeof window === "undefined") {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:[^\s"'>]+/gi, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const forbiddenTags = [
    "script", "iframe", "object", "embed", "form", "meta", "style",
    "link", "applet", "base"
  ];
  forbiddenTags.forEach((t) => {
    doc.querySelectorAll(t).forEach((node) => node.remove());
  });

  doc.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value;

      if (name.startsWith("on")) {
        node.removeAttribute(name);
        continue;
      }

      if ((name === "href" || name === "src") && /^(?:javascript|vbscript|data:text\/html):/i.test(val.trim())) {
        node.removeAttribute(name);
        continue;
      }

      if (name === "style") {
        const safe = sanitizeInlineStyle(val);
        if (safe) {
          node.setAttribute("style", safe);
        } else {
          node.removeAttribute("style");
        }
      }
    }
  });

  return doc.body.innerHTML;
}

// Convert Markdown to visual HTML for contentEditable
export function markdownToHtml(md: string): string {
  if (!md) return "";
  const html = md
    // Bold: **text** or <b>text</b>
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
    // Italic: *text* or <em>text</em>
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/<em>(.*?)<\/em>/g, "<em>$1</em>")
    // Underline: <u>text</u>
    // Strikethrough: ~~text~~ or <del>
    .replace(/~~(.*?)~~/g, "<del>$1</del>")
    .replace(/<strike>(.*?)<\/strike>/g, "<del>$1</del>")
    .replace(/<s>(.*?)<\/s>/g, "<del>$1</del>")
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[0.9em] border border-border/60">$1</code>')
    // Link: [text](url)
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>');

  return sanitizeHtmlForEditor(html);
}

// Convert DOM back to standard Markdown
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") return html;

  const div = document.createElement("div");
  div.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    let inner = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      inner += walk(el.childNodes[i]);
    }

    switch (tag) {
      case "strong":
      case "b":
        return inner.trim() ? `**${inner}**` : "";
      case "em":
      case "i":
        return inner.trim() ? `*${inner}*` : "";
      case "u":
        return inner.trim() ? `<u>${inner}</u>` : "";
      case "del":
      case "s":
      case "strike":
        return inner.trim() ? `~~${inner}~~` : "";
      case "code":
        return inner.trim() ? `\`${inner}\`` : "";
      case "a": {
        const href = el.getAttribute("href") || "#";
        return `[${inner || href}](${href})`;
      }
      case "span": {
        const style = el.getAttribute("style");
        const safeStyle = sanitizeInlineStyle(style || "");
        if (safeStyle && inner) {
          return `<span style="${safeStyle}">${inner}</span>`;
        }
        return inner;
      }
      case "font": {
        const styles: string[] = [];
        const color = el.getAttribute("color");
        const face = el.getAttribute("face");
        const size = el.getAttribute("size");
        if (color) styles.push(`color: ${color}`);
        if (face) styles.push(`font-family: ${face}`);
        if (size) {
          const sizeMap: Record<string, string> = {
            "1": "10px", "2": "12px", "3": "14px", "4": "16px", "5": "18px", "6": "24px", "7": "32px"
          };
          styles.push(`font-size: ${sizeMap[size] || "16px"}`);
        }
        const safeStyle = sanitizeInlineStyle(styles.join("; "));
        if (safeStyle && inner) {
          return `<span style="${safeStyle}">${inner}</span>`;
        }
        return inner;
      }
      case "div":
      case "p": {
        const textAlign = el.style.textAlign || el.getAttribute("align");
        if (textAlign && ["left", "center", "right", "justify"].includes(textAlign.toLowerCase()) && textAlign.toLowerCase() !== "left") {
          return `<div style="text-align: ${textAlign.toLowerCase()}">${inner}</div>`;
        }
        return inner ? `\n${inner}` : "\n";
      }
      case "br":
        return "\n";
      default:
        return inner;
    }
  }

  return walk(div).replace(/^\n+|\n+$/g, "");
}

export interface TableMeta {
  padding: number;
  borders: "grid" | "rows" | "none";
  striped: boolean;
  align: "left" | "center" | "full";
}

export interface ParsedImage {
  caption: string;
  url: string;
  width: string;
  align: "left" | "center" | "right" | "full";
}

// Table Markdown parser & serializer with styling metadata
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][]; meta: TableMeta } {
  let padding = 8;
  let borders: "grid" | "rows" | "none" = "grid";
  let striped = false;
  let align: "left" | "center" | "full" = "full";

  const metaMatch = text.match(/<!--\s*table\s+([^>]+)-->/);
  if (metaMatch) {
    const metaStr = metaMatch[1];
    const padM = metaStr.match(/padding=(\d+)/);
    if (padM) padding = parseInt(padM[1], 10);
    const bordM = metaStr.match(/borders=(grid|rows|none)/);
    if (bordM) borders = bordM[1] as TableMeta["borders"];
    const stripM = metaStr.match(/striped=(true|false)/);
    if (stripM) striped = stripM[1] === "true";
    const alignM = metaStr.match(/align=(left|center|full)/);
    if (alignM) align = alignM[1] as TableMeta["align"];
  }

  const cleanText = text.replace(/<!--\s*table\s+[^>]+-->\n?/, "");
  const lines = cleanText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: ["Параметр", "Значение"],
      rows: [
        ["Статус", "В процессе"],
        ["Приоритет", "Высокий"],
      ],
      meta: { padding, borders, striped, align },
    };
  }

  const tableLines = lines.filter((l) => !/^\|?\s*[-:]+[-| :]*\|?$/.test(l));

  const splitCells = (line: string): string[] => {
    let clean = line;
    if (clean.startsWith("|")) clean = clean.slice(1);
    if (clean.endsWith("|")) clean = clean.slice(0, -1);
    return clean.split("|").map((c) => c.trim());
  };

  const headers = splitCells(tableLines[0] || "");
  const rows = tableLines.slice(1).map(splitCells);

  if (headers.length === 0) {
    return {
      headers: ["Колонка 1", "Колонка 2"],
      rows: [["", ""]],
      meta: { padding, borders, striped, align },
    };
  }

  const normalizedRows = rows.map((row) => {
    const r = [...row];
    while (r.length < headers.length) r.push("");
    return r.slice(0, headers.length);
  });

  return { headers, rows: normalizedRows, meta: { padding, borders, striped, align } };
}

function serializeMarkdownTable(headers: string[], rows: string[][], meta?: TableMeta): string {
  const h = headers.map((x) => x.trim() || "Колонка");
  const headerLine = `| ${h.join(" | ")} |`;
  const sepLine = `| ${h.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map(
    (row) => `| ${h.map((_, i) => (row[i] || "").trim()).join(" | ")} |`
  );
  let tableStr = [headerLine, sepLine, ...rowLines].join("\n");
  if (meta && (meta.padding !== 8 || meta.borders !== "grid" || meta.striped || meta.align !== "full")) {
    tableStr = `<!-- table padding=${meta.padding} borders=${meta.borders} striped=${meta.striped} align=${meta.align} -->\n${tableStr}`;
  }
  return tableStr;
}

// Image Markdown parser & serializer with width and alignment
function parseMarkdownImage(text: string): ParsedImage {
  const match = text.match(/^!\[(.*?)\]\((.*?)\)$/);
  if (match) {
    const rawCaption = match[1] || "";
    const url = match[2] || "";
    let caption = rawCaption;
    let width = "100%";
    let align: "left" | "center" | "right" | "full" = "center";

    if (rawCaption.includes("|")) {
      const parts = rawCaption.split("|");
      caption = parts[0].trim();
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim();
        if (p.startsWith("width=")) {
          width = p.replace("width=", "").trim();
        } else if (p.startsWith("align=")) {
          const a = p.replace("align=", "").trim() as ParsedImage["align"];
          if (["left", "center", "right", "full"].includes(a)) {
            align = a;
          }
        }
      }
    }
    return { caption, url, width, align };
  }
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) {
    return { caption: "Изображение", url: text.trim(), width: "100%", align: "center" };
  }
  return { caption: "", url: "", width: "100%", align: "center" };
}

function serializeMarkdownImage(caption: string, url: string, width = "100%", align = "center"): string {
  if (!url) return "";
  const meta: string[] = [];
  if (width && width !== "100%") meta.push(`width=${width}`);
  if (align && align !== "center") meta.push(`align=${align}`);
  const captionPart = meta.length > 0 ? `${caption.trim() || "Изображение"}|${meta.join("|")}` : (caption.trim() || "Изображение");
  return `![${captionPart}](${url.trim()})`;
}

// Todo item parser & serializer
function parseTodo(text: string): { done: boolean; task: string } {
  if (text.startsWith("[x] ") || text.startsWith("[X] ")) {
    return { done: true, task: text.slice(4) };
  }
  if (text.startsWith("[ ] ")) {
    return { done: false, task: text.slice(4) };
  }
  return { done: false, task: text };
}


export function applyFontFamilyToSelection(fontFamily: string): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.style.fontFamily = fontFamily;
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
  } catch {
    return false;
  }
}

export function applyFontSizeToSelection(size: string): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.style.fontSize = size;
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
  } catch {
    return false;
  }
}

export function BlockEditorItem({
  block,
  text,
  canEdit,
  isActive,
  onFocus,
  onChangeText,
  onChangeType,
  onDelete,
  onInsertAfter,
  onEnter,
  onBackspaceEmpty,
  documentId,
}: BlockEditorItemProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastMarkdownRef = useRef<string>(text);

  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const parsedImage = useMemo(() => parseMarkdownImage(text), [text]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageCaptionInput, setImageCaptionInput] = useState("");

  const handleOpenImageEditor = () => {
    setImageUrlInput(parsedImage.url);
    setImageCaptionInput(parsedImage.caption);
    setIsEditingImage(true);
    setUploadError(null);
  };

  // Synchronize contentEditable DOM with external text prop
  useEffect(() => {
    if (contentRef.current && text !== lastMarkdownRef.current) {
      if (document.activeElement !== contentRef.current) {
        contentRef.current.innerHTML = markdownToHtml(text);
        lastMarkdownRef.current = text;
      }
    }
  }, [text]);

  // Set initial HTML once mounted
  useEffect(() => {
    if (contentRef.current && !contentRef.current.innerHTML) {
      contentRef.current.innerHTML = markdownToHtml(text);
      lastMarkdownRef.current = text;
    }
  }, [text]);

  // Focus contentEditable when activated
  useEffect(() => {
    if (isActive && contentRef.current && document.activeElement !== contentRef.current) {
      contentRef.current.focus();
    }
  }, [isActive]);

  // Input change in contentEditable div -> serialize to Markdown
  const handleContentInput = useCallback(() => {
    if (!contentRef.current) return;
    const newHtml = contentRef.current.innerHTML;
    const newMarkdown = htmlToMarkdown(newHtml);
    lastMarkdownRef.current = newMarkdown;
    onChangeText(newMarkdown);
  }, [onChangeText]);

  // True WYSIWYG formatting execCommand
  const applyVisualFormat = useCallback(
    (command: string, value: string | undefined = undefined) => {
      if (!canEdit) return;
      if (contentRef.current) {
        contentRef.current.focus();
      }
      try { document.execCommand("styleWithCSS", false, "true"); } catch {} 
      document.execCommand(command, false, value);
      handleContentInput();
    },
    [canEdit, handleContentInput]
  );

  // Apply inline code
  const applyVisualCode = useCallback(() => {
    if (!canEdit) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || "код";

    const codeNode = document.createElement("code");
    codeNode.className =
      "px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[0.9em] border border-border/60";
    codeNode.textContent = selectedText;

    range.deleteContents();
    range.insertNode(codeNode);

    const newRange = document.createRange();
    newRange.selectNode(codeNode);
    selection.removeAllRanges();
    selection.addRange(newRange);

    handleContentInput();
  }, [canEdit, handleContentInput]);

  // Apply link
  const applyVisualLink = useCallback(() => {
    if (!canEdit) return;
    const url = prompt("Введите адрес ссылки (URL):", "https://");
    if (url && url.trim()) {
      applyVisualFormat("createLink", url.trim());
    }
  }, [applyVisualFormat, canEdit]);

  // Keyboard shortcut handlers in contentEditable
  const handleEditableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyVisualFormat("bold");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyVisualFormat("italic");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      applyVisualFormat("underline");
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onInsertAfter?.("page-break");
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (
        block.blockType === "paragraph" ||
        block.blockType.startsWith("heading") ||
        block.blockType === "todo" ||
        block.blockType === "bullet-list" ||
        block.blockType === "numbered-list"
      ) {
        e.preventDefault();
        onEnter?.();
        return;
      }
    }

    if (e.key === "Backspace") {
      const isContentEmpty =
        !contentRef.current ||
        contentRef.current.innerText.trim() === "" ||
        contentRef.current.innerHTML === "<br>";
      if (isContentEmpty && text === "") {
        e.preventDefault();
        onBackspaceEmpty?.();
        return;
      }
    }
  };

  // Handle local image file upload to server PostgreSQL
  const handleUploadImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Пожалуйста, выберите файл изображения (PNG, JPG, WebP, SVG, GIF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Размер файла превышает 10 МБ");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (documentId) {
        formData.append("documentId", documentId);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Ошибка загрузки файла на сервер");
      }

      const data = await res.json();
      const finalUrl = data.url;
      const caption = file.name.replace(/\.[^/.]+$/, "");
      onChangeText(serializeMarkdownImage(caption, finalUrl));
      setIsEditingImage(false);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // Block type icon helper
  const renderTypeIcon = (type: BlockType) => {
    switch (type) {
      case "heading1":
        return <Heading1 className="h-3.5 w-3.5" />;
      case "heading2":
        return <Heading2 className="h-3.5 w-3.5" />;
      case "heading3":
        return <Heading3 className="h-3.5 w-3.5" />;
      case "quote":
        return <Quote className="h-3.5 w-3.5" />;
      case "todo":
        return <CheckSquare className="h-3.5 w-3.5" />;
      case "bullet-list":
      case "list-item":
        return <List className="h-3.5 w-3.5" />;
      case "numbered-list":
        return <ListOrdered className="h-3.5 w-3.5" />;
      case "code-block":
        return <Code className="h-3.5 w-3.5" />;
      case "table":
        return <TableIcon className="h-3.5 w-3.5" />;
      case "image":
        return <ImageIcon className="h-3.5 w-3.5" />;
      case "divider":
        return <Minus className="h-3.5 w-3.5" />;
      case "page-break":
        return <Scissors className="h-3.5 w-3.5" />;
      default:
        return <Pilcrow className="h-3.5 w-3.5" />;
    }
  };

  // Quick switch block type dropdown
  const blockTypeDropdown = canEdit && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity cursor-pointer shrink-0"
          title="Сменить тип блока"
        >
          {renderTypeIcon(block.blockType)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 text-xs editor-canvas-ui font-sans" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        <DropdownMenuItem onClick={() => onChangeType("paragraph")} className="gap-2 cursor-pointer">
          <Pilcrow className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Текст / Абзац</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading1")} className="gap-2 cursor-pointer font-bold">
          <Heading1 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 1 (H1)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading2")} className="gap-2 cursor-pointer font-semibold">
          <Heading2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 2 (H2)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("heading3")} className="gap-2 cursor-pointer font-medium">
          <Heading3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Заголовок 3 (H3)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChangeType("quote")} className="gap-2 cursor-pointer">
          <Quote className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Цитата / Сноска</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("todo")} className="gap-2 cursor-pointer">
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Список задач (Todo)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("bullet-list")} className="gap-2 cursor-pointer">
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Маркированный список</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("numbered-list")} className="gap-2 cursor-pointer">
          <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Нумерованный список</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChangeType("code-block")} className="gap-2 cursor-pointer">
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Блок кода</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("table")} className="gap-2 cursor-pointer">
          <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Таблица</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("image")} className="gap-2 cursor-pointer">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Изображение</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("divider")} className="gap-2 cursor-pointer">
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Разделитель</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeType("page-break")} className="gap-2 cursor-pointer text-primary">
          <Scissors className="h-3.5 w-3.5" />
          <span>Разрыв страницы</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onInsertAfter("paragraph")} className="gap-2 cursor-pointer text-primary">
          <Plus className="h-3.5 w-3.5" />
          <span>Вставить блок ниже</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Floating WYSIWYG formatting toolbar when active
  const floatingFormattingBar = isActive && canEdit && (
    <div
      className="absolute -top-9 left-6 z-20 flex items-center gap-0.5 bg-popover/95 text-popover-foreground border border-border/80 shadow-md backdrop-blur-md rounded-lg p-0.5 animate-in fade-in zoom-in-95 duration-100 editor-canvas-ui font-sans" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyVisualFormat("bold")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Жирный шрифт (Ctrl+B)"
      >
        <Bold className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyVisualFormat("italic")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Курсив (Ctrl+I)"
      >
        <Italic className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyVisualFormat("underline")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Подчёркнутый (Ctrl+U)"
      >
        <Underline className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyVisualFormat("strikeThrough")}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Зачёркнутый"
      >
        <Strikethrough className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={applyVisualCode}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Код"
      >
        <Code className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={applyVisualLink}
        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
        title="Вставить ссылку"
      >
        <LinkIcon className="h-3 w-3" />
      </Button>
    </div>
  );

  // 0. RENDER PAGE BREAK BLOCK
  if (block.blockType === "page-break") {
    return (
      <div
        className="group relative my-6 flex items-center select-none"
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
        data-page-break="true"
      >
        <div className="absolute -left-7 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>
        <div className="w-full flex items-center gap-2 border-t-2 border-dashed border-primary/50 py-1">
          <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 flex items-center gap-1.5 shrink-0">
            <Scissors className="h-3 w-3" />
            Разрыв страницы
          </span>
          <div className="flex-1 h-[1px] bg-border" />
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer ml-2 shrink-0"
            title="Удалить разрыв страницы"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 1. RENDER DIVIDER BLOCK
  if (block.blockType === "divider") {
    return (
      <div
        className="group relative my-4 flex items-center"
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        <div className="absolute -left-7 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>
        <hr className="w-full border-t border-border/80 my-2" />
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer ml-2 shrink-0"
            title="Удалить разделитель"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 2. RENDER TABLE BLOCK
  if (block.blockType === "table") {
    const { headers, rows, meta } = parseMarkdownTable(text);

    const updateTable = (newHeaders: string[], newRows: string[][], newMeta?: TableMeta) => {
      const serialized = serializeMarkdownTable(newHeaders, newRows, newMeta ?? meta);
      onChangeText(serialized);
    };

    const handleUpdateMeta = (updates: Partial<TableMeta>) => {
      const nextMeta = { ...meta, ...updates };
      updateTable(headers, rows, nextMeta);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
      const newRows = rows.map((r, rIdx) =>
        rIdx === rowIndex ? r.map((c, cIdx) => (cIdx === colIndex ? val : c)) : [...r]
      );
      updateTable(headers, newRows);
    };

    const handleHeaderChange = (colIndex: number, val: string) => {
      const newHeaders = headers.map((h, i) => (i === colIndex ? val : h));
      updateTable(newHeaders, rows);
    };

    const addRow = () => {
      const newRows = [...rows, headers.map(() => "")];
      updateTable(headers, newRows);
    };

    const addCol = () => {
      const newHeaders = [...headers, `Колонка ${headers.length + 1}`];
      const newRows = rows.map((r) => [...r, ""]);
      updateTable(newHeaders, newRows);
    };

    const deleteRow = (rowIndex: number) => {
      if (rows.length <= 1) return;
      const newRows = rows.filter((_, i) => i !== rowIndex);
      updateTable(headers, newRows);
    };

    return (
      <div
        className="group relative my-4 space-y-2"
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        {/* Table Customization Toolbar */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border border-border/80 bg-muted/30 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Таблица:</span>
            
            {/* Cell Padding */}
            <div className="flex items-center gap-1 border-r border-border/60 pr-2">
              <span className="text-[10px] text-muted-foreground">Отступ:</span>
              {[
                { label: "4px", val: 4 },
                { label: "8px", val: 8 },
                { label: "14px", val: 14 },
              ].map((p) => (
                <Button
                  key={p.label}
                  variant={meta.padding === p.val ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleUpdateMeta({ padding: p.val })}
                  className="h-5 px-1.5 text-[10px] cursor-pointer"
                >
                  {p.label}
                </Button>
              ))}
              <input
                type="number"
                min="2"
                max="32"
                value={meta.padding}
                onChange={(e) => handleUpdateMeta({ padding: Math.max(2, Math.min(32, parseInt(e.target.value) || 8)) })}
                className="h-5 w-10 text-[10px] bg-background border rounded px-1 text-center"
                title="Пользовательский отступ ячеек (px)"
              />
            </div>

            {/* Borders style */}
            <div className="flex items-center gap-1 border-r border-border/60 pr-2">
              <span className="text-[10px] text-muted-foreground">Границы:</span>
              <Button
                variant={meta.borders === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleUpdateMeta({ borders: "grid" })}
                className="h-5 px-1.5 text-[10px] cursor-pointer"
              >
                Сетка
              </Button>
              <Button
                variant={meta.borders === "rows" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleUpdateMeta({ borders: "rows" })}
                className="h-5 px-1.5 text-[10px] cursor-pointer"
              >
                Строки
              </Button>
              <Button
                variant={meta.borders === "none" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleUpdateMeta({ borders: "none" })}
                className="h-5 px-1.5 text-[10px] cursor-pointer"
              >
                Без рамок
              </Button>
            </div>

            {/* Striped toggle */}
            <div className="flex items-center gap-1 border-r border-border/60 pr-2">
              <Button
                variant={meta.striped ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleUpdateMeta({ striped: !meta.striped })}
                className="h-5 px-1.5 text-[10px] cursor-pointer"
              >
                Зебра
              </Button>
            </div>

            {/* Table alignment */}
            <div className="flex items-center gap-0.5 ml-auto">
              <Button
                variant={meta.align === "left" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => handleUpdateMeta({ align: "left" })}
                className="h-5 w-5 text-muted-foreground cursor-pointer"
                title="Выровнять таблицу влево"
              >
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button
                variant={meta.align === "center" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => handleUpdateMeta({ align: "center" })}
                className="h-5 w-5 text-muted-foreground cursor-pointer"
                title="Выровнять таблицу по центру"
              >
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button
                variant={meta.align === "full" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => handleUpdateMeta({ align: "full" })}
                className="h-5 w-5 text-muted-foreground cursor-pointer"
                title="Растянуть на всю ширину"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div
          className="overflow-x-auto rounded-xl border border-border shadow-xs bg-card/60 backdrop-blur-xs transition-all"
          style={{
            maxWidth: meta.align === "full" ? "100%" : "85%",
            marginLeft: meta.align === "center" ? "auto" : "0",
            marginRight: meta.align === "center" ? "auto" : "0",
          }}
        >
          <table
            className={`w-full text-xs text-left border-collapse ${
              meta.borders === "none" ? "border-transparent" : "border-border"
            }`}
          >
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-foreground">
                {headers.map((h, colIdx) => (
                  <th key={`th-${colIdx}`} style={{ padding: `${meta.padding}px` }} className={`${meta.borders === 'grid' ? 'border-r border-border last:border-r-0' : ''}`}>
                    {canEdit ? (
                      <input
                        value={h}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        className="w-full bg-transparent font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1"
                        placeholder={`Заголовок ${colIdx + 1}`}
                      />
                    ) : (
                      <span className="px-1">{h}</span>
                    )}
                  </th>
                ))}
                {canEdit && <th className="w-8 p-1 text-center" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={`tr-${rowIdx}`}
                  className={`${meta.borders !== 'none' ? 'border-b border-border/70 last:border-b-0' : ''} ${meta.striped && rowIdx % 2 === 1 ? 'bg-muted/30' : ''} hover:bg-muted/20 transition-colors`}
                >
                  {row.map((cell, colIdx) => (
                    <td
                      key={`td-${rowIdx}-${colIdx}`}
                      style={{ padding: `${meta.padding}px` }} className={`${meta.borders === 'grid' ? 'border-r border-border/70 last:border-r-0' : ''}`}
                    >
                      {canEdit ? (
                        <input
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 text-foreground"
                          placeholder="..."
                        />
                      ) : (
                        <span className="px-1 text-foreground">{cell}</span>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="w-8 p-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(rowIdx)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Удалить строку"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="h-6 text-[11px] gap-1 px-2 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Добавить строку</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addCol}
              className="h-6 text-[11px] gap-1 px-2 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Добавить колонку</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-destructive ml-auto cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>Удалить таблицу</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 3. RENDER IMAGE BLOCK (Device Upload + URL)
  if (block.blockType === "image") {
    const { caption, url } = parsedImage;

    const handleSaveImage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!imageUrlInput.trim()) return;
      onChangeText(serializeMarkdownImage(imageCaptionInput, imageUrlInput));
      setIsEditingImage(false);
    };

    return (
      <div
        className="group relative my-4"
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        {/* Hidden file input for uploading from device */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadImageFile(file);
          }}
        />

        {url && !isEditingImage ? (
          <div
            className="flex flex-col my-2 transition-all group/img"
            style={{
              width: parsedImage.width || "100%",
              marginLeft: parsedImage.align === "right" ? "auto" : parsedImage.align === "center" ? "auto" : "0",
              marginRight: parsedImage.align === "left" ? "auto" : parsedImage.align === "center" ? "auto" : "0",
            }}
          >
            {/* Image Positioning & Sizing Toolbar */}
            {canEdit && (
              <div className="flex flex-wrap items-center justify-between gap-1 p-1 mb-1.5 rounded-lg border border-border/80 bg-background/95 backdrop-blur-md shadow-xs opacity-0 group-hover/img:opacity-100 focus-within:opacity-100 transition-opacity text-xs editor-ui-control">
                {/* Alignment */}
                <div className="flex items-center gap-0.5">
                  <Button
                    variant={parsedImage.align === "left" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, parsedImage.width, "left"))}
                    className="h-6 w-6 cursor-pointer"
                    title="Выровнять по левому краю"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={parsedImage.align === "center" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, parsedImage.width, "center"))}
                    className="h-6 w-6 cursor-pointer"
                    title="По центру"
                  >
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={parsedImage.align === "right" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, parsedImage.width, "right"))}
                    className="h-6 w-6 cursor-pointer"
                    title="По правому краю"
                  >
                    <AlignRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={parsedImage.align === "full" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, "100%", "full"))}
                    className="h-6 w-6 cursor-pointer"
                    title="На всю ширину листа"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Width Presets */}
                <div className="flex items-center gap-1 border-l border-r border-border/60 px-1.5">
                  {["25%", "50%", "75%", "100%"].map((w) => (
                    <Button
                      key={w}
                      variant={parsedImage.width === w ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, w, parsedImage.align))}
                      className="h-5 px-1 text-[10px] cursor-pointer"
                    >
                      {w}
                    </Button>
                  ))}
                  {/* Slider */}
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={parseInt(parsedImage.width) || 100}
                    onChange={(e) => onChangeText(serializeMarkdownImage(parsedImage.caption, parsedImage.url, `${e.target.value}%`, parsedImage.align))}
                    className="w-14 h-1 accent-primary cursor-pointer ml-1"
                    title="Ширина изображения"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer"
                  >
                    <Upload className="h-2.5 w-2.5" />
                    <span>Заменить</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenImageEditor}
                    className="h-6 px-1.5 text-[10px] cursor-pointer"
                  >
                    Настройки
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div
              className="relative p-2 rounded-2xl bg-muted/20 border border-border/80 flex flex-col items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onFocus?.();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={caption || "Изображение"}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus?.();
                }}
                className="max-h-[560px] w-full rounded-xl object-contain shadow-xs transition-all cursor-pointer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/600x400/e2e8f0/475569?text=Изображение+не+найдено";
                }}
              />
              {caption && (
                <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
                  {caption}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="p-5 rounded-2xl border-2 border-dashed border-border bg-muted/20 space-y-4"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) handleUploadImageFile(file);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Вставка изображения</span>
              </div>
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingImage(false)}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Закрыть
                </Button>
              )}
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Prominent Upload from Device Section */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl border border-border bg-card/70">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-foreground">Загрузить с локального устройства</p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WebP, SVG до 10 МБ. Файл будет надёжно сохранён в базе данных на сервере.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Выбрать файл</span>
                  </>
                )}
              </Button>
            </div>

            {/* Alternative: URL input */}
            <form onSubmit={handleSaveImage} className="space-y-3 pt-2 border-t border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground">Или укажите внешнюю ссылку на картинку:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="URL изображения (https://...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Подпись / Alt текст"
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageUrlInput(
                      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80"
                    );
                    setImageCaptionInput("Архитектурная схема компонентов");
                  }}
                  className="h-6 text-[11px] cursor-pointer"
                >
                  Пример схемы
                </Button>
                <div className="flex gap-1.5">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!imageUrlInput.trim()}
                    className="h-7 text-xs cursor-pointer"
                  >
                    Сохранить ссылку
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 4. RENDER CODE BLOCK
  if (block.blockType === "code-block") {
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
      <div
        className="group relative my-3"
        onFocus={onFocus}
        onClick={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        <div className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/80 bg-zinc-900/60 text-[11px] text-zinc-400">
            <span className="font-mono uppercase font-semibold">Скрипт / Конфигурация</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 text-[10px] gap-1 px-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCode ? "Скопировано" : "Копировать"}</span>
            </Button>
          </div>

          <div className="p-3">
            {canEdit ? (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => onChangeText(e.target.value)}
                className="w-full bg-transparent font-mono text-xs sm:text-sm text-zinc-200 focus:outline-none resize-none leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-all]"
                placeholder="// Вставьте код..."
                rows={Math.max(3, text.split("\n").length)}
              />
            ) : (
              <pre className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-all] text-zinc-200">
                {text}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. RENDER TODO BLOCK
  if (block.blockType === "todo") {
    const { done, task } = parseTodo(text);

    const toggleDone = (checked: boolean) => {
      onChangeText(`${checked ? "[x]" : "[ ]"} ${task}`);
    };

    return (
      <div className="group relative flex items-start gap-2.5 my-1.5" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="pt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={done}
            disabled={!canEdit}
            onChange={(e) => toggleDone(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
          />
        </div>

        <div className="flex-1 min-w-0 relative">
          {floatingFormattingBar}

          {canEdit ? (
            <div
              ref={contentRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              onInput={handleContentInput}
              onKeyDown={handleEditableKeyDown}
              className={`w-full max-w-full bg-transparent border-0 focus:outline-none text-sm sm:text-base py-0.5 leading-relaxed min-h-[24px] break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                done ? "line-through text-muted-foreground" : "text-foreground font-normal"
              }`}
            />
          ) : (
            <p className={`text-sm sm:text-base leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              <RichTextRenderer content={task} />
            </p>
          )}
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
            title="Удалить задачу"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 6. RENDER QUOTE BLOCK
  if (block.blockType === "quote") {
    return (
      <div className="group relative my-2" onFocus={onFocus}>
        <div className="absolute -left-7 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="relative border-l-4 border-primary/70 bg-primary/5 dark:bg-primary/10 rounded-r-xl p-3 sm:p-4">
          {floatingFormattingBar}
          <div className="flex items-start gap-2">
            <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-80" />
            <div className="flex-1 min-w-0">
              {canEdit ? (
                <div
                  ref={contentRef}
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  onInput={handleContentInput}
                  onKeyDown={handleEditableKeyDown}
                  className="w-full max-w-full bg-transparent border-0 focus:outline-none italic text-sm sm:text-base text-foreground leading-relaxed font-serif min-h-[30px] break-words [overflow-wrap:anywhere] [word-break:break-word]"
                />
              ) : (
                <p className="italic text-sm sm:text-base text-foreground font-serif leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  <RichTextRenderer content={text} />
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 7. RENDER LIST ITEMS (Bullet & Numbered)
  if (block.blockType === "bullet-list" || block.blockType === "list-item" || block.blockType === "numbered-list") {
    const isNumbered = block.blockType === "numbered-list";

    return (
      <div className="group relative flex items-start gap-2.5 my-1" onFocus={onFocus}>
        <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          {blockTypeDropdown}
        </div>

        <div className="pt-1.5 shrink-0 flex items-center justify-center w-5">
          {isNumbered ? (
            <span className="text-xs font-semibold text-primary">1.</span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 relative">
          {floatingFormattingBar}
          {canEdit ? (
            <div
              ref={contentRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              onInput={handleContentInput}
              onKeyDown={handleEditableKeyDown}
              className="w-full max-w-full bg-transparent border-0 focus:outline-none text-sm sm:text-base text-foreground py-0.5 leading-relaxed font-normal min-h-[24px] break-words [overflow-wrap:anywhere] [word-break:break-word]"
            />
          ) : (
            <p className="text-sm sm:text-base leading-relaxed text-foreground break-words [overflow-wrap:anywhere] [word-break:break-word]">
              <RichTextRenderer content={text} />
            </p>
          )}
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // 8. RENDER HEADINGS & STANDARD PARAGRAPHS (Real ContentEditable WYSIWYG)
  const isH1 = block.blockType === "heading1";
  const isH2 = block.blockType === "heading2";
  const isH3 = block.blockType === "heading3";

  const typographyClass = isH1
    ? "text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground break-words [overflow-wrap:anywhere] [word-break:break-word]"
    : isH2
    ? "text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words [overflow-wrap:anywhere] [word-break:break-word]"
    : isH3
    ? "text-lg sm:text-xl font-semibold tracking-tight text-foreground break-words [overflow-wrap:anywhere] [word-break:break-word]"
    : "text-sm sm:text-base text-foreground/90 font-normal leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]";

  return (
    <div className="group relative flex items-start gap-2.5 my-1.5" onFocus={onFocus}>
      {/* Block gutter controls */}
      <div className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        {blockTypeDropdown}
      </div>

      <div className="flex-1 min-w-0 relative">
        {floatingFormattingBar}

        {canEdit ? (
          <div
            ref={contentRef}
            contentEditable={canEdit}
            suppressContentEditableWarning
            onInput={handleContentInput}
            onKeyDown={handleEditableKeyDown}
            className={`w-full max-w-full bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary/80 focus:outline-none py-1 min-h-[28px] ${typographyClass}`}
          />
        ) : (
          <div className={`py-1 ${typographyClass}`}>
            <RichTextRenderer content={text} placeholder="Пустой блок" />
          </div>
        )}
      </div>

      {/* Delete block button */}
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer shrink-0 mt-1"
          title="Удалить блок"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
