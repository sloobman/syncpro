import { Node, mergeAttributes } from "@tiptap/core";

export interface PageBreakOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Insert a page break
       */
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * Custom PageBreak extension for Google Docs style explicit page breaks.
 * Triggered via Ctrl+Enter (Cmd+Enter) or the Toolbar Insert menu.
 */
export const PageBreak = Node.create<PageBreakOptions>({
  name: "pageBreak",

  group: "block",

  defining: true,

  selectable: true,

  draggable: true,

  defaultOptions: {
    HTMLAttributes: {},
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-break"]',
      },
      {
        tag: 'div.syncpro-page-break',
      },
      {
        tag: "hr.pagebreak",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "page-break",
        class: "syncpro-page-break",
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .createParagraphNear()
            .focus()
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },
});
