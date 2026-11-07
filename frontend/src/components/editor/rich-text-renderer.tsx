"use client";

import React from "react";

interface RichTextRendererProps {
  content: string;
  className?: string;
  placeholder?: string;
}

/**
 * Tokenizes and renders safe rich text supporting:
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
  const tokenRegex = /(\*\*[^*]+\*\*|<u>.*?<\/u>|~~[^~]+~~|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<b>.*?<\/b>|<em>.*?<\/em>|\n)/g;

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
        const safeUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("/")
          ? rawUrl
          : `https://${rawUrl}`;
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
