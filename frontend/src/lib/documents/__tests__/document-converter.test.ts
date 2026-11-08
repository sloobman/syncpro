import test from "node:test";
import assert from "node:assert/strict";
import { DocumentConverter } from "../document-converter";
import { validatePageLayout } from "@/lib/types/page-layout";
import { sanitizeInlineStyle, styleStringToCSSProperties } from "@/components/editor/rich-text-renderer";
import JSZip from "jszip";

test("sanitizeInlineStyle preserves valid typography and layout styles", () => {
  const input = "font-family: 'Playfair Display', serif; font-size: 20px; color: #ef4444; background-color: #fef08a; text-align: center;";
  const sanitized = sanitizeInlineStyle(input);

  assert.match(sanitized, /font-family: 'Playfair Display', serif/);
  assert.match(sanitized, /font-size: 20px/);
  assert.match(sanitized, /color: #ef4444/);
  assert.match(sanitized, /background-color: #fef08a/);
  assert.match(sanitized, /text-align: center/);
});

test("sanitizeInlineStyle rejects XSS vectors, javascript:, url(), and unallowed props", () => {
  const maliciousInput =
    "color: red; position: fixed; top: 0; background-image: url(javascript:alert(1)); behavior: expression(alert(2)); font-family: 'Arial'; <script>alert(3)</script>";
  const sanitized = sanitizeInlineStyle(maliciousInput);

  assert.doesNotMatch(sanitized, /javascript/i);
  assert.doesNotMatch(sanitized, /expression/i);
  assert.doesNotMatch(sanitized, /url\(/i);
  assert.doesNotMatch(sanitized, /position/i);
  assert.doesNotMatch(sanitized, /<script>/i);
  assert.match(sanitized, /color: red/);
  assert.match(sanitized, /font-family: 'Arial'/);
});

test("styleStringToCSSProperties correctly maps kebab-case to React camelCase", () => {
  const css = "font-family: Roboto; font-size: 16px; background-color: #bbf7d0; text-align: right;";
  const props = styleStringToCSSProperties(css);

  assert.strictEqual(props.fontFamily, "Roboto");
  assert.strictEqual(props.fontSize, "16px");
  assert.strictEqual(props.backgroundColor, "#bbf7d0");
  assert.strictEqual(props.textAlign, "right");
});

test("DocumentConverter exports and builds valid DOCX blob", async () => {
  const title = "Тестовый документ Word";
  const markdown = `# Введение\n\nЭто абзац с **жирным текстом** и *курсивом*.\n\n- Пункт 1\n- Пункт 2\n\n| Колонка 1 | Колонка 2 |\n|---|---|\n| Данные A | Данные B |`;

  const blob = await DocumentConverter.exportDocx(title, markdown);
  assert.ok(blob instanceof Blob);
  assert.ok(blob.size > 500, "DOCX blob should have non-trivial size");
});

test("DocumentConverter exports and builds compliant OpenDocument ODT package", async () => {
  const title = "Архитектурный документ ODT";
  const markdown = `# Раздел 1\n\nТекст описания архитектуры.\n\n> Важная сноска\n\n- Модуль CRDT\n- Модуль DAG`;

  const blob = await DocumentConverter.exportOdt(title, markdown);
  assert.ok(blob instanceof Blob);

  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // ODF Specification requirements
  assert.ok(zip.file("mimetype"), "ODT must contain mimetype file");
  assert.ok(zip.file("META-INF/manifest.xml"), "ODT must contain META-INF/manifest.xml");
  assert.ok(zip.file("content.xml"), "ODT must contain content.xml");
  assert.ok(zip.file("styles.xml"), "ODT must contain styles.xml");
  assert.ok(zip.file("meta.xml"), "ODT must contain meta.xml");

  const mimetypeText = await zip.file("mimetype")?.async("text");
  assert.strictEqual(mimetypeText?.trim(), "application/vnd.oasis.opendocument.text");

  const contentXml = await zip.file("content.xml")?.async("text");
  assert.ok(contentXml?.includes("Раздел 1"));
  assert.ok(contentXml?.includes("Текст описания архитектуры."));
});

test("DocumentConverter imports plain text and markdown", async () => {
  const mdFile = new File(["# Заголовок\n\nТекст файла"], "document.md", { type: "text/markdown" });
  const resultMd = await DocumentConverter.importFile(mdFile);
  assert.strictEqual(resultMd.title, "document");
  assert.strictEqual(resultMd.markdown, "# Заголовок\n\nТекст файла");

  const txtFile = new File(["Простой текстовый контент"], "notes.txt", { type: "text/plain" });
  const resultTxt = await DocumentConverter.importFile(txtFile);
  assert.strictEqual(resultTxt.title, "notes");
  assert.strictEqual(resultTxt.markdown, "Простой текстовый контент");
});


test("sanitizeInlineStyle preserves new typography and layout properties (line-height, letter-spacing, width)", () => {
  const input = "line-height: 1.5; letter-spacing: 1px; margin-bottom: 12px; width: 50%; padding: 8px;";
  const sanitized = sanitizeInlineStyle(input);

  assert.match(sanitized, /line-height: 1.5/);
  assert.match(sanitized, /letter-spacing: 1px/);
  assert.match(sanitized, /margin-bottom: 12px/);
  assert.match(sanitized, /width: 50%/);
  assert.match(sanitized, /padding: 8px/);
});

test("validatePageLayout enforces guardrail constraints on custom format and margins", () => {
  // 1. Valid layout
  const valid = validatePageLayout({
    format: "custom",
    orientation: "portrait",
    margins: "custom",
    zoom: 1.0,
    customDimensions: { widthMm: 200, heightMm: 250 },
    customMargins: { topMm: 15, bottomMm: 15, leftMm: 15, rightMm: 15 },
  });
  assert.strictEqual(valid.valid, true);

  // 2. Page dimension too small (< 100mm)
  const tooSmall = validatePageLayout({
    format: "custom",
    orientation: "portrait",
    margins: "normal",
    zoom: 1.0,
    customDimensions: { widthMm: 50, heightMm: 80 },
  });
  assert.strictEqual(tooSmall.valid, false);
  assert.ok(tooSmall.error?.includes("100"));

  // 4. NaN or non-finite inputs
  const nanDimensions = validatePageLayout({
    format: "custom",
    orientation: "portrait",
    margins: "normal",
    zoom: 1.0,
    customDimensions: { widthMm: NaN, heightMm: 297 },
  });
  assert.strictEqual(nanDimensions.valid, false);

  const nanMargins = validatePageLayout({
    format: "a4",
    orientation: "portrait",
    margins: "custom",
    zoom: 1.0,
    customMargins: { topMm: NaN, bottomMm: 20, leftMm: 20, rightMm: 20 },
  });
  assert.strictEqual(nanMargins.valid, false);
});

test("DocumentConverter exports DOCX with HTML styles and without leaking raw HTML tags", async () => {
  const title = "HTML Styled Doc";
  const content = '<div style="text-align: center"><span style="background-color: rgba(0,0,0,0); color: rgb(2,8,23)">Отцентрированный заголовок</span></div>\n\n<div style="text-align: right"><span style="color: #ef4444">Выравнивание вправо</span></div>';

  const blob = await DocumentConverter.exportDocx(title, content);
  assert.ok(blob instanceof Blob);
  assert.ok(blob.size > 500);
});

test("DocumentConverter exports Markdown ZIP bundle with document.md and media folder", async () => {
  const title = "Media Doc";
  const markdown = "# Заголовок\n\n![Тестовая картинка](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)\n\nТекст.";

  const zipBlob = await DocumentConverter.exportMarkdownZip(title, markdown);
  assert.ok(zipBlob instanceof Blob);

  const arrayBuffer = await zipBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  assert.ok(zip.file("Media_Doc.md") || zip.file("Media Doc.md"));
  assert.ok(zip.file("media/image_1.png"));
});

test("DocumentConverter sanitizes title against Zip Slip / path traversal in Markdown ZIP", async () => {
  const dangerousTitle = "../../etc/evil_file";
  const markdown = "Hello world";

  const zipBlob = await DocumentConverter.exportMarkdownZip(dangerousTitle, markdown);
  const arrayBuffer = await zipBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Must not have path traversal '../'
  const files = Object.keys(zip.files);
  for (const filename of files) {
    assert.strictEqual(filename.includes("../"), false);
    assert.strictEqual(filename.includes("..\\"), false);
  }
  assert.ok(files.some((f) => f.endsWith("etc_evil_file.md") && !f.includes("..")));
});
