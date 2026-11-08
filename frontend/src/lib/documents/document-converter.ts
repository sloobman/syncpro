import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table as DocxTable,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  ExternalHyperlink,
} from "docx";
import JSZip from "jszip";
import mammoth from "mammoth";

export interface ConvertedDocument {
  title: string;
  markdown: string;
}

/**
 * Universal Document Converter supporting:
 * - DOCX (Microsoft Word 2007+) with full HTML style AST translation and embedded media
 * - ODT (OpenDocument Text - LibreOffice / OpenOffice) with embedded pictures
 * - DOC (Legacy Microsoft Word Binary)
 * - TXT (Plain text)
 * - MD (Markdown) and Markdown ZIP package with media
 */
export class DocumentConverter {
  /**
   * Imports any supported document file into Markdown format for the CRDT editor.
   */
  static async importFile(file: File): Promise<ConvertedDocument> {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Размер файла превышает лимит безопасности 20 МБ");
    }
    const filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const title = filename.replace(/\.[^/.]+$/, "");

    switch (ext) {
      case "docx": {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;
        const markdown = this.htmlToMarkdown(html);
        return { title, markdown };
      }

      case "odt": {
        const arrayBuffer = await file.arrayBuffer();
        const markdown = await this.parseOdt(arrayBuffer);
        return { title, markdown };
      }

      case "doc": {
        const arrayBuffer = await file.arrayBuffer();
        const markdown = await this.parseLegacyDoc(arrayBuffer);
        return { title, markdown };
      }

      case "txt": {
        const text = await file.text();
        return { title, markdown: text };
      }

      case "md":
      case "markdown": {
        const markdown = await file.text();
        return { title, markdown };
      }

      default: {
        const text = await file.text();
        return { title, markdown: text };
      }
    }
  }

  /**
   * Helper to parse CSS color string into 6-character hex without '#' for docx.
   */
  private static parseColorToHex(colorStr: string): string | undefined {
    if (!colorStr) return undefined;
    const clean = colorStr.trim().toLowerCase();
    if (clean === "transparent" || clean === "inherit" || clean === "initial") {
      return undefined;
    }

    // #fff or #ffffff
    if (clean.startsWith("#")) {
      const hex = clean.slice(1);
      if (hex.length === 3) {
        return hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      if (hex.length === 6) return hex;
      if (hex.length === 8) return hex.slice(0, 6);
      return undefined;
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = clean.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
      if (a === 0) return undefined; // transparent
      const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
      return `${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return undefined;
  }

  /**
   * Helper to resolve an image URL (data URI, relative /api/files/, or http) into an ArrayBuffer
   */
  private static async resolveImageBuffer(
    url: string
  ): Promise<{ data: Uint8Array; width: number; height: number } | null> {
    try {
      if (!url) return null;

      // 1. Data URI
      if (url.startsWith("data:image/")) {
        const commaIdx = url.indexOf(",");
        if (commaIdx !== -1) {
          const base64 = url.slice(commaIdx + 1);
          const binaryStr = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("binary");
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          return { data: bytes, width: 480, height: 320 };
        }
      }

      // 2. HTTP / relative fetch with safety guards
      const isHttp = url.startsWith("http://") || url.startsWith("https://");
      const isRelative = url.startsWith("/");
      if (!isHttp && !isRelative) {
        return null; // Reject dangerous schemes: file:, javascript:, ftp:, gopher:, blob:, etc.
      }

      const fetchUrl = isRelative && typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
      const res = await fetch(fetchUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;

      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
        console.warn("[DocumentConverter] Image exceeds 15MB limit, skipping");
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        console.warn("[DocumentConverter] Image exceeds 15MB limit, skipping");
        return null;
      }
      return { data: new Uint8Array(arrayBuffer), width: 480, height: 320 };
    } catch (e) {
      console.warn("[DocumentConverter] Failed to resolve image buffer:", e);
      return null;
    }
  }

  /**
   * Parses line for block-level wrapper alignment (<div style="text-align: center">).
   */
  private static parseLineAlignment(line: string): {
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
    innerContent: string;
  } {
    const alignMatch = line.match(/^<(?:div|p)\s+style="[^"]*text-align:\s*(left|center|right|justify)[^"]*"[^>]*>([\s\S]*)<\/(?:div|p)>$/i);
    if (alignMatch) {
      const alignStr = alignMatch[1].toLowerCase();
      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
      if (alignStr === "center") alignment = AlignmentType.CENTER;
      else if (alignStr === "right") alignment = AlignmentType.RIGHT;
      else if (alignStr === "justify") alignment = AlignmentType.JUSTIFIED;
      return { alignment, innerContent: alignMatch[2] };
    }
    return { alignment: AlignmentType.LEFT, innerContent: line };
  }

  /**
   * Helper to parse HTML spans and inline styles into Docx TextRuns.
   * Completely strips any remaining raw HTML tags so NOT A SINGLE <div or <span leaks into Word!
   */
  private static parseHtmlToDocxRuns(content: string): (TextRun | ExternalHyperlink)[] {
    const runs: (TextRun | ExternalHyperlink)[] = [];
    if (!content) return [new TextRun({ text: "" })];

    // Regex matches styled span, bold, italic, underline, strike, code, link, or normal text
    const tokenRegex = /(<span\s+style="([^"]*)">([\s\S]*?)<\/span>|<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|\*\*(.*?)\*\*|<b>(.*?)<\/b>|<strong>(.*?)<\/strong>|\*(.*?)\*|<em>(.*?)<\/em>|<u>(.*?)<\/u>|~~(.*?)~~|<del>(.*?)<\/del>|`([^`]+)`|<br\s*\/?>|[^<*`~]+)/gi;

    let match;
    while ((match = tokenRegex.exec(content)) !== null) {
      const fullMatch = match[0];

      // 1. <br> break
      if (fullMatch.toLowerCase().startsWith("<br")) {
        runs.push(new TextRun({ break: 1 }));
        continue;
      }

      // 2. <span style="...">
      if (match[1] && match[2] !== undefined) {
        const styleStr = match[2];
        const innerText = match[3].replace(/<[^>]+>/g, ""); // strip any nested tags

        let fontColor: string | undefined = undefined;
        let fontHighlight: string | undefined = undefined;
        let fontSizeHalfPt: number | undefined = undefined;
        let fontFamily: string | undefined = undefined;
        let isBold = false;
        let isItalic = false;

        styleStr.split(";").forEach((decl) => {
          const idx = decl.indexOf(":");
          if (idx !== -1) {
            const prop = decl.slice(0, idx).trim().toLowerCase();
            const val = decl.slice(idx + 1).trim();

            if (prop === "color") {
              fontColor = this.parseColorToHex(val);
            } else if (prop === "background-color") {
              const hex = this.parseColorToHex(val);
              if (hex) fontHighlight = hex;
            } else if (prop === "font-size") {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                // px to half-points (1px ~= 0.75pt, half-point = pt * 2)
                fontSizeHalfPt = Math.round(num * 1.5);
              }
            } else if (prop === "font-family") {
              fontFamily = val.split(",")[0].replace(/['"]/g, "").trim();
            } else if (prop === "font-weight" && (val === "bold" || parseInt(val, 10) >= 600)) {
              isBold = true;
            } else if (prop === "font-style" && val === "italic") {
              isItalic = true;
            }
          }
        });

        runs.push(
          new TextRun({
            text: innerText,
            color: fontColor,
            shading: fontHighlight ? { fill: fontHighlight } : undefined,
            size: fontSizeHalfPt,
            font: fontFamily,
            bold: isBold,
            italics: isItalic,
          })
        );
        continue;
      }

      // 3. Link <a href="...">
      if (match[4] && match[5] !== undefined) {
        const rawHref = match[4].trim();
        const linkText = match[5].replace(/<[^>]+>/g, "");
        // Only allow safe protocols for Word hyperlinks (http, https, mailto)
        const isSafeLink = /^(?:https?:\/\/|mailto:)/i.test(rawHref);
        if (isSafeLink) {
          runs.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: linkText,
                  style: "Hyperlink",
                  color: "2563EB",
                  underline: {},
                }),
              ],
              link: rawHref,
            })
          );
        } else {
          runs.push(new TextRun({ text: linkText }));
        }
        continue;
      }

      // 4. Bold **text** / <b> / <strong>
      const boldText = match[6] ?? match[7] ?? match[8];
      if (boldText !== undefined) {
        runs.push(new TextRun({ text: boldText.replace(/<[^>]+>/g, ""), bold: true }));
        continue;
      }

      // 5. Italic *text* / <em>
      const italicText = match[9] ?? match[10];
      if (italicText !== undefined) {
        runs.push(new TextRun({ text: italicText.replace(/<[^>]+>/g, ""), italics: true }));
        continue;
      }

      // 6. Underline <u>
      if (match[11] !== undefined) {
        runs.push(new TextRun({ text: match[11].replace(/<[^>]+>/g, ""), underline: {} }));
        continue;
      }

      // 7. Strikethrough ~~text~~ / <del>
      const strikeText = match[12] ?? match[13];
      if (strikeText !== undefined) {
        runs.push(new TextRun({ text: strikeText.replace(/<[^>]+>/g, ""), strike: true }));
        continue;
      }

      // 8. Code `code`
      if (match[14] !== undefined) {
        runs.push(new TextRun({ text: match[14].replace(/<[^>]+>/g, ""), font: "Courier New" }));
        continue;
      }

      // 9. Plain text fallback: strip any lingering tags
      const cleanText = fullMatch.replace(/<[^>]+>/g, "");
      if (cleanText) {
        runs.push(new TextRun({ text: cleanText }));
      }
    }

    return runs.length > 0 ? runs : [new TextRun({ text: content.replace(/<[^>]+>/g, "") })];
  }

  /**
   * Exports markdown and document content into a DOCX blob with full HTML style translation and embedded media.
   */
  static async exportDocx(title: string, markdown: string): Promise<Blob> {
    const paragraphs: (Paragraph | DocxTable)[] = [];

    // Title heading
    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );

    const lines = markdown.split("\n");
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Table parsing
      if (line.startsWith("|") && line.endsWith("|")) {
        inTable = true;
        if (!line.includes("---")) {
          const cells = line
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim().replace(/<[^>]+>/g, ""));
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        if (tableRows.length > 0) {
          paragraphs.push(this.createDocxTable(tableRows));
          paragraphs.push(new Paragraph({ spacing: { after: 150 } }));
        }
        inTable = false;
        tableRows = [];
      }

      // Ignore table comment metadata
      if (line.startsWith("<!-- table") && line.endsWith("-->")) {
        continue;
      }

      if (!line) {
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
        continue;
      }

      if (line === "<!-- pagebreak -->" || line === "\\pagebreak" || line === "---pagebreak---") {
        paragraphs.push(new Paragraph({ pageBreakBefore: true }));
        continue;
      }

      // Image Block: ![caption|width=...|align=...](url) or ![caption](url)
      const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        const rawCaption = imageMatch[1] || "";
        const imgUrl = imageMatch[2] || "";
        let caption = rawCaption;
        let align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER;
        let widthPercent = 100;

        if (rawCaption.includes("|")) {
          const parts = rawCaption.split("|");
          caption = parts[0].trim();
          for (let pIdx = 1; pIdx < parts.length; pIdx++) {
            const p = parts[pIdx].trim();
            if (p.startsWith("align=")) {
              const a = p.replace("align=", "").trim();
              if (a === "left") align = AlignmentType.LEFT;
              else if (a === "right") align = AlignmentType.RIGHT;
            } else if (p.startsWith("width=")) {
              const w = parseInt(p.replace("width=", "").replace("%", "").trim(), 10);
              if (!isNaN(w) && w > 0) widthPercent = w;
            }
          }
        }

        const resolved = await this.resolveImageBuffer(imgUrl);
        if (resolved) {
          const targetW = Math.round((550 * widthPercent) / 100);
          const targetH = Math.round((360 * widthPercent) / 100);

          paragraphs.push(
            new Paragraph({
              alignment: align,
              children: [
                new ImageRun({
                  data: resolved.data,
                  transformation: {
                    width: targetW,
                    height: targetH,
                  },
                  type: "png",
                }),
              ],
              spacing: { before: 140, after: 80 },
            })
          );

          if (caption && caption !== "Изображение") {
            paragraphs.push(
              new Paragraph({
                alignment: align,
                children: [
                  new TextRun({
                    text: caption,
                    italics: true,
                    size: 18,
                    color: "64748B",
                  }),
                ],
                spacing: { after: 120 },
              })
            );
          }
        } else {
          // Fallback caption if image fetch failed
          paragraphs.push(
            new Paragraph({
              alignment: align,
              children: [
                new TextRun({
                  text: `[Изображение: ${caption || imgUrl}]`,
                  color: "2563EB",
                  italics: true,
                }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        }
        continue;
      }

      // Heading 1
      if (line.startsWith("# ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(2).replace(/<[^>]+>/g, ""),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
      }
      // Heading 2
      else if (line.startsWith("## ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(3).replace(/<[^>]+>/g, ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      }
      // Heading 3
      else if (line.startsWith("### ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(4).replace(/<[^>]+>/g, ""),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
      }
      // Bullet list
      else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
        const itemText = line.replace(/^[-*•]\s+/, "");
        paragraphs.push(
          new Paragraph({
            children: this.parseHtmlToDocxRuns(itemText),
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, "");
        paragraphs.push(
          new Paragraph({
            children: this.parseHtmlToDocxRuns(text),
            spacing: { after: 80 },
          })
        );
      }
      // Blockquote
      else if (line.startsWith("> ")) {
        paragraphs.push(
          new Paragraph({
            children: this.parseHtmlToDocxRuns(line.slice(2)),
            indent: { left: 720 },
            spacing: { before: 100, after: 100 },
          })
        );
      }
      // Standard paragraph (with full HTML style & alignment AST parsing)
      else {
        const { alignment, innerContent } = this.parseLineAlignment(line);
        const runs = this.parseHtmlToDocxRuns(innerContent);

        paragraphs.push(
          new Paragraph({
            alignment,
            children: runs,
            spacing: { after: 120 },
          })
        );
      }
    }

    if (inTable && tableRows.length > 0) {
      paragraphs.push(this.createDocxTable(tableRows));
    }

    const doc = new DocxDocument({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Exports markdown and document metadata into an OpenDocument Text (.odt) file with embedded media.
   */
  static async exportOdt(title: string, markdown: string): Promise<Blob> {
    const zip = new JSZip();

    // 1. mimetype (must be uncompressed at offset 0 per ODF spec)
    zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });

    // 2. manifest entries
    let manifestEntries = `  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>`;

    // 3. meta.xml
    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">
  <office:meta>
    <dc:title>${this.escapeXml(title)}</dc:title>
    <dc:creator>SyncPro</dc:creator>
    <dc:date>${new Date().toISOString()}</dc:date>
  </office:meta>
</office:document-meta>`;
    zip.file("meta.xml", metaXml);

    // 4. styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:line-height="120%" fo:margin-bottom="0.2cm"/>
      <style:text-properties fo:font-size="12pt" fo:color="#1e293b"/>
    </style:default-style>
  </office:styles>
</office:document-styles>`;
    zip.file("styles.xml", stylesXml);

    // 5. content.xml & media packing
    let bodyContentXml = `<text:h text:outline-level="1">${this.escapeXml(title)}</text:h>`;
    const lines = markdown.split("\n");
    let imageCounter = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        bodyContentXml += `<text:p/>`;
      } else if (line === "<!-- pagebreak -->" || line === "\\pagebreak" || line === "---pagebreak---") {
        bodyContentXml += `<text:p style:name="PageBreak"/>`;
      } else if (line.startsWith("<!-- table") && line.endsWith("-->")) {
        continue;
      } else if (line.startsWith("# ")) {
        bodyContentXml += `<text:h text:outline-level="1">${this.escapeXml(line.slice(2).replace(/<[^>]+>/g, ""))}</text:h>`;
      } else if (line.startsWith("## ")) {
        bodyContentXml += `<text:h text:outline-level="2">${this.escapeXml(line.slice(3).replace(/<[^>]+>/g, ""))}</text:h>`;
      } else if (line.startsWith("### ")) {
        bodyContentXml += `<text:h text:outline-level="3">${this.escapeXml(line.slice(4).replace(/<[^>]+>/g, ""))}</text:h>`;
      } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
        const itemText = line.replace(/^[-*•]\s+/, "").replace(/<[^>]+>/g, "");
        bodyContentXml += `<text:p style:name="List_Item">• ${this.escapeXml(itemText)}</text:p>`;
      } else if (line.startsWith("> ")) {
        bodyContentXml += `<text:p style:name="Quote">“${this.escapeXml(line.slice(2).replace(/<[^>]+>/g, ""))}”</text:p>`;
      } else {
        // Image check
        const imgM = line.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgM) {
          const imgUrl = imgM[2];
          const resolved = await this.resolveImageBuffer(imgUrl);
          if (resolved) {
            const fileName = `image_${imageCounter++}.png`;
            zip.file(`Pictures/${fileName}`, resolved.data);
            manifestEntries += `\n  <manifest:file-entry manifest:full-path="Pictures/${fileName}" manifest:media-type="image/png"/>`;
            bodyContentXml += `<text:p><draw:frame draw:name="img_${imageCounter}" svg:width="15cm" svg:height="10cm"><draw:image xlink:href="Pictures/${fileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`;
            continue;
          }
        }

        // Clean any HTML tags from paragraph
        const cleanText = line.replace(/<[^>]+>/g, "");
        bodyContentXml += `<text:p>${this.escapeXml(cleanText)}</text:p>`;
      }
    }

    // Write manifest
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
${manifestEntries}
</manifest:manifest>`;
    zip.file("META-INF/manifest.xml", manifestXml);

    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2">
  <office:body>
    <office:text>
      ${bodyContentXml}
    </office:text>
  </office:body>
</office:document-content>`;
    zip.file("content.xml", contentXml);

    return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.oasis.opendocument.text" });
  }

  /**
   * Bundles Markdown and all embedded media files into a portable ZIP package.
   */
  static async exportMarkdownZip(title: string, markdown: string): Promise<Blob> {
    const zip = new JSZip();
    let updatedMd = markdown;
    let imgIndex = 1;

    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    const matches: { full: string; caption: string; url: string }[] = [];

    while ((match = imgRegex.exec(markdown)) !== null) {
      matches.push({ full: match[0], caption: match[1], url: match[2] });
    }

    for (const item of matches) {
      const resolved = await this.resolveImageBuffer(item.url);
      if (resolved) {
        const ext = "png";
        const filename = `image_${imgIndex++}.${ext}`;
        zip.file(`media/${filename}`, resolved.data);
        const replacement = `![${item.caption}](media/${filename})`;
        updatedMd = updatedMd.replace(item.full, replacement);
      }
    }

    // Sanitize title against Zip Slip / path traversal
    const safeTitle = (title || "document")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\.\.+/g, "_")
      .trim() || "document";
    zip.file(`${safeTitle}.md`, updatedMd);
    return await zip.generateAsync({ type: "blob" });
  }

  /**
   * Helper to parse legacy ODF XML.
   */
  private static async parseOdt(arrayBuffer: ArrayBuffer): Promise<string> {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const contentXmlFile = zip.file("content.xml");
    if (!contentXmlFile) throw new Error("Невалидный ODT файл: отсутствует content.xml");

    const contentXml = await contentXmlFile.async("string");
    const paragraphs: string[] = [];
    const pRegex = /<text:(?:p|h)[^>]*>([\s\S]*?)<\/text:(?:p|h)>/gi;
    let match;

    while ((match = pRegex.exec(contentXml)) !== null) {
      const rawText = match[1].replace(/<[^>]+>/g, "").trim();
      if (rawText) paragraphs.push(rawText);
    }

    return paragraphs.join("\n\n") || "Импортированный текст ODT документа.";
  }

  /**
   * Fast binary text extractor for Word 97-2003 .doc format.
   */
  private static async parseLegacyDoc(arrayBuffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(arrayBuffer);
    try {
      const utf16Decoder = new TextDecoder("utf-16le", { fatal: false });
      const decodedUtf16 = utf16Decoder.decode(bytes);
      const chunks = decodedUtf16
        .split(/[\r\n]+/)
        .map((s) => s.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim())
        .filter(
          (s) =>
            s.length > 3 &&
            !s.includes("Microsoft Word") &&
            !s.includes("Word.Document") &&
            !s.includes("CompObj") &&
            !s.includes("Normal.dot")
        );

      if (chunks.length > 0) return chunks.join("\n\n");
    } catch {}

    const asciiDecoder = new TextDecoder("utf-8", { fatal: false });
    const asciiText = asciiDecoder.decode(bytes);
    const asciiChunks = asciiText
      .split(/[\r\n]+/)
      .map((s) => s.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim())
      .filter((s) => s.length > 4);

    return asciiChunks.join("\n\n") || "Импортированный текст DOC документа.";
  }

  /**
   * Helper to create a DocxTable from 2D array with borders and padding.
   */
  private static createDocxTable(rowsData: string[][]): DocxTable {
    const tableRows = rowsData.map((rowCells, rowIndex) => {
      const cells = rowCells.map((cellText) => {
        return new TableCell({
          width: { size: 100 / Math.max(1, rowCells.length), type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [new TextRun({ text: cellText, bold: rowIndex === 0 })],
            }),
          ],
        });
      });
      return new TableRow({ children: cells });
    });

    return new DocxTable({
      rows: tableRows,
      alignment: AlignmentType.CENTER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  /**
   * Converts HTML produced by mammoth into clean Markdown.
   */
  private static htmlToMarkdown(html: string): string {
    return html
      .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i>(.*?)<\/i>/gi, "*$1*")
      .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<ul>/gi, "")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<ol>/gi, "")
      .replace(/<\/ol>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
