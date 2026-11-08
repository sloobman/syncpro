"use client";

import React from "react";

interface RichTextRendererProps {
  content: string;
  className?: string;
  placeholder?: string;
}

/**
 * Validates and parses inline CSS styles safely.
 * Only allows typography and layout styling: font-family, font-size, color, background-color, text-align, font-weight, font-style, text-decoration.
 * Rejects double quotes, angle brackets, javascript:, vbscript:, data:, url(), expression(), @import to prevent attribute breakout and XSS.
 */
export function sanitizeInlineStyle(styleStr: string): string {
  if (!styleStr) return "";
  const allowedProps = [
    "font-family",
    "font-size",
    "color",
    "background-color",
    "text-align",
    "font-weight",
    "font-style",
    "text-decoration",
    "line-height",
    "letter-spacing",
    "margin-bottom",
    "margin-top",
    "width",
    "max-width",
    "padding",
  ];

  return styleStr
    .split(";")
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx === -1) return null;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();

      if (!allowedProps.includes(prop)) return null;

      // Normalize font-family double quotes or HTML entities to safe single quotes
      let cleanVal = val.trim();
      if (prop === "font-family") {
        cleanVal = cleanVal.replace(/&quot;/g, "'").replace(/"/g, "'");
      }

      // Reject characters that could break out of HTML attributes or tags
      if (/["<>\\]/.test(cleanVal)) return null;

      // Reject script vectors and CSS injection functions
      if (/javascript|vbscript|data:|expression|@import|url\s*\(/i.test(cleanVal)) return null;

      // Property-specific strict validation
      if (prop === "font-size") {
        if (!/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(cleanVal)) return null;
      }
      if (prop === "text-align") {
        if (!/^(?:left|center|right|justify)$/i.test(cleanVal)) return null;
      }
      if (prop === "color" || prop === "background-color") {
        if (!/^(?:#[0-9a-f]{3,8}|rgba?\([0-9\s,./%]+\)|transparent|inherit|[a-z]+)$/i.test(cleanVal)) {
          return null;
        }
      }
      if (prop === "font-family") {
        // Allow alphanumeric font names with spaces, commas, hyphens and optional safe single quotes
        if (!/^[a-zA-Z0-9\s,'\-_]+$/.test(cleanVal)) return null;
      }
      if (prop === "line-height") {
        if (!/^(?:normal|\d+(?:\.\d+)?(?:px|pt|em|rem|%)?)$/i.test(cleanVal)) return null;
      }
      if (prop === "letter-spacing") {
        if (!/^(?:normal|-?\d+(?:\.\d+)?(?:px|pt|em|rem))$/i.test(cleanVal)) return null;
      }
      if (prop === "margin-bottom" || prop === "margin-top") {
        if (!/^\d+(?:\.\d+)?(?:px|pt|mm|rem|em)$/i.test(cleanVal)) return null;
      }
      if (prop === "width" || prop === "max-width") {
        if (!/^\d+(?:\.\d+)?(?:%|px|rem|em)$/i.test(cleanVal)) return null;
      }
      if (prop === "padding") {
        if (!/^[0-9\s.pxptremem%]+$/i.test(cleanVal)) return null;
      }
      if (prop === "font-weight") {
        if (!/^(?:normal|bold|bolder|lighter|[1-9]00)$/i.test(cleanVal)) return null;
      }
      if (prop === "font-style") {
        if (!/^(?:normal|italic|oblique)$/i.test(cleanVal)) return null;
      }
      if (prop === "text-decoration") {
        if (!/^(?:none|underline|line-through|overline)$/i.test(cleanVal)) return null;
      }

      return `${prop}: ${cleanVal}`;
    })
    .filter(Boolean)
    .join("; ");
}

export function styleStringToCSSProperties(styleStr: string): React.CSSProperties {
  const safeStr = sanitizeInlineStyle(styleStr);
  if (!safeStr) return {};
  const styleObj: Record<string, string> = {};
  safeStr.split(";").forEach((decl) => {
    const idx = decl.indexOf(":");
    if (idx !== -1) {
      const prop = decl.slice(0, idx).trim();
      const val = decl.slice(idx + 1).trim();
      const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styleObj[camelProp] = val;
    }
  });
  return styleObj as React.CSSProperties;
}

/**
 * Tokenizes and renders safe rich text supporting:
 * - Styled spans: <span style="...">text</span>
 * - Styled divs / paragraphs: <div style="text-align: center">text</div>
 * - Bold: **text** or <b>text</b>
 * - Italic: *text* or <em>text</em>
 * - Underline: <u>text</u>
 * - Strikethrough: ~~text~~
 * - Inline Code: `code`
 * - Links: [label](url)
 */
export function RichTextRenderer({ content, className = "", placeholder }: RichTextRendererProps) {
  if (!content && placeholder) {
    return <span className="text-muted-foreground/60 italic select-none">{placeholder}</span>;
  }
  if (!content) {
    return null;
  }

  // Regex to match inline tokens in order
  const tokenRegex = /(<span\s+style="[^"]*">[\s\S]*?<\/span>|<div\s+style="[^"]*">[\s\S]*?<\/div>|<p\s+style="[^"]*">[\s\S]*?<\/p>|\*\*[^*]+\*\*|<u>.*?<\/u>|~~[^~]+~~|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<b>.*?<\/b>|<em>.*?<\/em>|\n)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = tokenRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyIndex++}`}>{content.slice(lastIndex, match.index)}</span>
      );
    }

    const token = match[0];

    if (token === "\n") {
      parts.push(<br key={`br-${keyIndex++}`} />);
    } else if (token.startsWith("<span") && token.includes("style=")) {
      const styleMatch = token.match(/style="([^"]*)"/);
      const innerMatch = token.match(/<span[^>]*>([\s\S]*?)<\/span>/);
      const rawStyle = styleMatch ? styleMatch[1] : "";
      const innerContent = innerMatch ? innerMatch[1] : "";
      const safeStyle = sanitizeInlineStyle(rawStyle);
      const cssProps = styleStringToCSSProperties(safeStyle);
      parts.push(
        <span key={`span-${keyIndex++}`} style={cssProps}>
          <RichTextRenderer content={innerContent} />
        </span>
      );
    } else if ((token.startsWith("<div") || token.startsWith("<p")) && token.includes("style=")) {
      const isDiv = token.startsWith("<div");
      const styleMatch = token.match(/style="([^"]*)"/);
      const innerMatch = token.match(/<(?:div|p)[^>]*>([\s\S]*?)<\/(?:div|p)>/);
      const rawStyle = styleMatch ? styleMatch[1] : "";
      const innerContent = innerMatch ? innerMatch[1] : "";
      const safeStyle = sanitizeInlineStyle(rawStyle);
      const cssProps = styleStringToCSSProperties(safeStyle);
      if (isDiv) {
        parts.push(
          <div key={`div-${keyIndex++}`} style={cssProps} className="my-0.5">
            <RichTextRenderer content={innerContent} />
          </div>
        );
      } else {
        parts.push(
          <p key={`p-${keyIndex++}`} style={cssProps} className="my-0.5">
            <RichTextRenderer content={innerContent} />
          </p>
        );
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`bold-${keyIndex++}`} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("<b>") && token.endsWith("</b>")) {
      parts.push(
        <strong key={`bold-${keyIndex++}`} className="font-bold text-foreground">
          {token.slice(3, -4)}
        </strong>
      );
    } else if (token.startsWith("<u>") && token.endsWith("</u>")) {
      parts.push(
        <span
          key={`u-${keyIndex++}`}
          className="underline underline-offset-3 decoration-primary decoration-2"
        >
          {token.slice(3, -4)}
        </span>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      parts.push(
        <del key={`del-${keyIndex++}`} className="line-through text-muted-foreground/80">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`em-${keyIndex++}`} className="italic text-foreground">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("<em>") && token.endsWith("</em>")) {
      parts.push(
        <em key={`em-${keyIndex++}`} className="italic text-foreground">
          {token.slice(4, -5)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${keyIndex++}`}
          className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[0.9em] border border-border/60"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const [, label, rawUrl] = linkMatch;
        const trimmedUrl = rawUrl.trim();
        // Prevent javascript:, data:, vbscript: links
        const isSafeProtocol =
          trimmedUrl.startsWith("http://") ||
          trimmedUrl.startsWith("https://") ||
          trimmedUrl.startsWith("/");
        const safeUrl = isSafeProtocol ? trimmedUrl : `https://${trimmedUrl}`;
        parts.push(
          <a
            key={`a-${keyIndex++}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium cursor-pointer"
          >
            {label}
          </a>
        );
      } else {
        parts.push(<span key={`text-${keyIndex++}`}>{token}</span>);
      }
    } else {
      parts.push(<span key={`text-${keyIndex++}`}>{token}</span>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${keyIndex++}`}>{content.slice(lastIndex)}</span>
    );
  }

  return <span className={className}>{parts}</span>;
}
