import test from "node:test";
import assert from "node:assert/strict";
import { DocumentConverter } from "../document-converter";
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
