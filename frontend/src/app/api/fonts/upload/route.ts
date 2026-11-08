import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { FilesRepository } from "@/lib/db/files-repository";
import { FontRepository } from "@/lib/db/font-repository";
import crypto from "crypto";

// Allowed font extensions and MIME types
const ALLOWED_EXTENSIONS = ["woff2", "woff", "ttf", "otf"];
const MAX_FONT_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = (formData.get("workspaceId") as string) || null;
    const customFamilyName = (formData.get("familyName") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "Файл шрифта не предоставлен" }, { status: 400 });
    }

    if (file.size > MAX_FONT_SIZE) {
      return NextResponse.json({ error: "Размер файла превышает лимит 15 МБ" }, { status: 400 });
    }

    const filename = file.name || "font.woff2";
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Неподдерживаемый формат шрифта .${ext}. Разрешены: .woff2, .ttf, .otf` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4) {
      return NextResponse.json({ error: "Файл повреждён или имеет нулевой размер" }, { status: 400 });
    }

    // Security: Strict check of magic bytes for fonts
    // woff2 starts with 'wOF2' (0x77 0x4F 0x46 0x32)
    // woff starts with 'wOFF' (0x77 0x4F 0x46 0x46)
    // otf starts with 'OTTO' (0x4F 0x54 0x54 0x4F)
    // ttf starts with 0x00 0x01 0x00 0x00, 'true' (0x74 0x72 0x75 0x65), or 'typ1' (0x74 0x79 0x70 0x31)
    const isWoff2 = buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x32;
    const isWoff = buffer[0] === 0x77 && buffer[1] === 0x4f && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isOtf = buffer[0] === 0x4f && buffer[1] === 0x54 && buffer[2] === 0x54 && buffer[3] === 0x4f;
    const isTtf =
      (buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00) ||
      (buffer[0] === 0x74 && buffer[1] === 0x72 && buffer[2] === 0x75 && buffer[3] === 0x65) ||
      (buffer[0] === 0x74 && buffer[1] === 0x79 && buffer[2] === 0x70 && buffer[3] === 0x31);

    const isFont = isWoff2 || isWoff || isOtf || isTtf;

    if (!isFont) {
      return NextResponse.json({ error: "Файл не является валидным шрифтом (WOFF2, TTF, OTF)" }, { status: 400 });
    }

    // 1. Content-Addressable Storage: compute SHA-256 hash of font content
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 2. Check if this exact font already exists (Deduplication)
    const existingFont = await FontRepository.findFontByHash(sha256Hash);
    if (existingFont) {
      return NextResponse.json(
        {
          success: true,
          font: existingFont,
          isDuplicate: true,
          message: "Шрифт уже существует на сервере и повторно использован (дедупликация CAS)",
        },
        { status: 200 }
      );
    }

    // 3. New font: save to storage
    const mimeType =
      ext === "woff2" ? "font/woff2" : ext === "woff" ? "font/woff" : ext === "otf" ? "font/otf" : "font/ttf";
    const savedFile = await FilesRepository.saveFile({
      documentId: null,
      uploaderId: user.id,
      filename,
      mimeType,
      buffer,
    });

    const rawFamily =
      customFamilyName.trim() ||
      filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim();

    // Security: strictly sanitize font family name to alphanumeric, spaces, hyphens
    const parsedFamily = rawFamily.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "CustomFont";

    const savedFont = await FontRepository.saveFont({
      workspaceId,
      familyName: parsedFamily,
      displayName: parsedFamily,
      sourceType: "custom_file",
      sha256Hash,
      fileUrl: savedFile.url,
      format: ext,
      fileSizeBytes: file.size,
    });

    return NextResponse.json(
      {
        success: true,
        font: savedFont,
        isDuplicate: false,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Font Upload API Error]:", err);
    return NextResponse.json({ error: "Ошибка загрузки шрифта" }, { status: 500 });
  }
}
