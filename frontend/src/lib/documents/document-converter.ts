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
} from "docx";
import JSZip from "jszip";
import mammoth from "mammoth";

export interface ConvertedDocument {
  title: string;
  markdown: string;
}

/**
 * Universal Document Converter supporting:
 * - DOCX (Microsoft Word 2007+)
 * - ODT (OpenDocument Text - LibreOffice / OpenOffice)
 * - DOC (Legacy Microsoft Word Binary)
 * - TXT (Plain text)
 * - MD (Markdown)
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
        // Fallback: try plain text
        const text = await file.text();
        return { title, markdown: text };
      }
    }
  }

  /**
   * Exports markdown and document metadata into a DOCX blob.
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
        // Skip separator line |---|---|
        if (!line.includes("---")) {
          const cells = line
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        // End of table, render it
        if (tableRows.length > 0) {
          const docxTable = this.createDocxTable(tableRows);
          paragraphs.push(docxTable);
          paragraphs.push(new Paragraph({ spacing: { after: 150 } }));
        }
        inTable = false;
        tableRows = [];
      }

      if (!line) {
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
        continue;
      }

      if (line === "<!-- pagebreak -->" || line === "\\pagebreak" || line === "---pagebreak---") {
        paragraphs.push(new Paragraph({ pageBreakBefore: true }));
        continue;
      }

      // Heading 1
      if (line.startsWith("# ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
      }
      // Heading 2
      else if (line.startsWith("## ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      }
      // Heading 3
      else if (line.startsWith("### ")) {
        paragraphs.push(
          new Paragraph({
            text: line.slice(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
      }
      // Bullet list
      else if (line.startsWith("- ") || line.startsWith("* ")) {
        paragraphs.push(
          new Paragraph({
            children: this.parseMarkdownSpansToTextRuns(line.slice(2)),
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
            children: this.parseMarkdownSpansToTextRuns(text),
            spacing: { after: 80 },
          })
        );
      }
      // Blockquote
      else if (line.startsWith("> ")) {
        paragraphs.push(
          new Paragraph({
            children: this.parseMarkdownSpansToTextRuns(line.slice(2)),
            indent: { left: 720 },
            spacing: { before: 100, after: 100 },
          })
        );
      }
      // Standard paragraph
      else {
        paragraphs.push(
          new Paragraph({
            children: this.parseMarkdownSpansToTextRuns(line),
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
   * Exports markdown and document metadata into an OpenDocument Text (.odt) file.
   */
  static async exportOdt(title: string, markdown: string): Promise<Blob> {
    const zip = new JSZip();

    // 1. mimetype (must be uncompressed at offset 0 per ODF spec)
    zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });

    // 2. META-INF/manifest.xml
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
    zip.file("META-INF/manifest.xml", manifestXml);

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

    // 5. content.xml
    let bodyContentXml = `<text:h text:outline-level="1">${this.escapeXml(title)}</text:h>`;
    const lines = markdown.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        bodyContentXml += `<text:p/>`;
      } else if (line === "<!-- pagebreak -->" || line === "\\pagebreak" || line === "---pagebreak---") {
        bodyContentXml += `<text:p style:name="PageBreak"/>`;
      } else if (line.startsWith("# ")) {
        bodyContentXml += `<text:h text:outline-level="1">${this.escapeXml(line.slice(2))}</text:h>`;
      } else if (line.startsWith("## ")) {
        bodyContentXml += `<text:h text:outline-level="2">${this.escapeXml(line.slice(3))}</text:h>`;
      } else if (line.startsWith("### ")) {
        bodyContentXml += `<text:h text:outline-level="3">${this.escapeXml(line.slice(4))}</text:h>`;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        bodyContentXml += `<text:p style:name="List_Item">• ${this.escapeXml(line.slice(2))}</text:p>`;
      } else if (line.startsWith("> ")) {
        bodyContentXml += `<text:p style:name="Quote">“${this.escapeXml(line.slice(2))}”</text:p>`;
      } else {
        bodyContentXml += `<text:p>${this.escapeXml(line)}</text:p>`;
      }
    }

    const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2">
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
   * Parses an ODT ZIP file and extracts its text and structure into Markdown.
   */
  private static async parseOdt(buffer: ArrayBuffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const contentFile = zip.file("content.xml");
      if (!contentFile) {
        throw new Error("content.xml not found in ODT package");
      }

      const contentXml = await contentFile.async("text");
      if (contentXml.length > 25 * 1024 * 1024) {
        throw new Error("Размер распакованного документа ODT превышает лимит безопасности");
      }
      let markdown = "";

      // Simple, robust XML regex parser for OpenDocument text nodes
      const elementRegex = /<text:(h|p)[^>]*>([\s\S]*?)<\/text:(h|p)>/g;
      let match;
      while ((match = elementRegex.exec(contentXml)) !== null) {
        const tag = match[1];
        const innerXml = match[2];
        const plainText = innerXml.replace(/<[^>]+>/g, "").trim();

        if (tag === "h") {
          markdown += `## ${plainText}\n\n`;
        } else if (tag === "p") {
          if (plainText) {
            markdown += `${plainText}\n\n`;
          }
        }
      }

      return markdown.trim() || "Документ ODT загружен.";
    } catch (err) {
      console.warn("Failed to parse ODT structure:", err);
      return "Ошибка чтения ODT файла.";
    }
  }

  /**
   * Parses legacy binary Microsoft Word (.doc) files.
   * Extracts UTF-8 and ANSI text streams and paragraphs.
   */
  private static async parseLegacyDoc(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    try {
      // 1. High-speed C++ engine UTF-16LE decode (Word 97-2003 text stream)
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

      if (chunks.length > 0) {
        return chunks.join("\n\n");
      }
    } catch {}

    // Fallback: UTF-8 / ASCII decode
    const asciiDecoder = new TextDecoder("utf-8", { fatal: false });
    const asciiText = asciiDecoder.decode(bytes);
    const asciiChunks = asciiText
      .split(/[\r\n]+/)
      .map((s) => s.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim())
      .filter((s) => s.length > 4);

    return asciiChunks.join("\n\n") || "Импортированный текст DOC документа.";
  }

  /**
   * Helper to parse markdown spans (bold, italic, code) into docx TextRuns.
   */
  private static parseMarkdownSpansToTextRuns(text: string): TextRun[] {
    const runs: TextRun[] = [];
    // Regular expression matching bold, italic, inline code
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^*`]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const part = match[0];
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else if (part.startsWith("*") && part.endsWith("*")) {
        runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
      } else if (part.startsWith("`") && part.endsWith("`")) {
        runs.push(new TextRun({ text: part.slice(1, -1), font: "Courier New" }));
      } else {
        runs.push(new TextRun({ text: part }));
      }
    }

    return runs.length > 0 ? runs : [new TextRun({ text })];
  }

  /**
   * Helper to create a DocxTable from 2D array.
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
      // Keep HTML entities as escaped text to prevent tag injection
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
