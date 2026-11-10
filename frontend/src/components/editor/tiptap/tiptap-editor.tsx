"use client";

import React, { useEffect, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { Doc } from "yjs";

import { PageBreak } from "./extensions/page-break";
import { FontSize } from "./extensions/font-size";
import { FontFamily } from "./extensions/font-family";
import { LineHeight } from "./extensions/line-height";
import "./tiptap-editor.css";

export interface TiptapEditorRef {
  editor: Editor | null;
}

export interface TiptapEditorProps {
  initialContent?: JSONContent | string | null;
  editable?: boolean;
  onUpdate?: (data: { json: JSONContent; html: string; text: string }) => void;
  onSelectionUpdate?: (editor: Editor) => void;
  onEditorReady?: (editor: Editor) => void;
  yDoc?: Doc;
  provider?: unknown;
  currentUser?: { name: string; color: string };
  className?: string;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(function TiptapEditor(
  {
    initialContent,
    editable = true,
    onUpdate,
    onSelectionUpdate,
    onEditorReady,
    yDoc,
    provider,
    currentUser,
    className = "",
  },
  ref
) {
  const extensions = [
    StarterKit.configure({
      // Disable built-in history if Yjs collaboration is enabled
      history: yDoc ? false : undefined,
    }),
    Underline,
    TextStyle,
    FontSize,
    FontFamily,
    LineHeight,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "syncpro-editor-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "syncpro-link text-primary underline underline-offset-2",
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    PageBreak,
    ...(yDoc
      ? [
          Collaboration.configure({
            document: yDoc,
          }),
          ...(provider && currentUser
            ? [
                CollaborationCursor.configure({
                  provider: provider as Record<string, unknown>,
                  user: {
                    name: currentUser.name,
                    color: currentUser.color,
                  },
                }),
              ]
            : []),
        ]
      : []),
  ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: yDoc ? undefined : initialContent || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate({
          json: editor.getJSON(),
          html: editor.getHTML(),
          text: editor.getText(),
        });
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionUpdate) {
        onSelectionUpdate(editor);
      }
    },
  });

  useImperativeHandle(ref, () => ({
    editor,
  }));

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync editable prop change
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className={`syncpro-tiptap-container w-full h-full ${className}`}>
      <EditorContent editor={editor} className="w-full h-full focus:outline-none" />
    </div>
  );
});
