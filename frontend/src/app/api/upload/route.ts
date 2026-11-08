import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { FilesRepository } from "@/lib/db/files-repository";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentId = (formData.get("documentId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 });
    }

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Размер файла превышает 10 МБ" }, { status: 400 });
    }

    const rawMime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.includes(rawMime)) {
      return NextResponse.json(
        { error: "Недопустимый формат файла. Разрешены только изображения (PNG, JPG, WebP, GIF, SVG)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 4) {
      return NextResponse.json({ error: "Файл повреждён или имеет нулевой размер" }, { status: 400 });
    }

    // Validate magic bytes for images
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    const isSvg = rawMime === "image/svg+xml" && buffer.toString("utf8", 0, 500).includes("<svg");

    if (!isPng && !isJpg && !isGif && !isWebp && !isSvg) {
      return NextResponse.json({ error: "Содержимое файла не соответствует изображению" }, { status: 400 });
    }

    const saved = await FilesRepository.saveFile({
      documentId,
      uploaderId: user.id,
      filename: file.name || "uploaded-image",
      mimeType: rawMime,
      buffer,
    });

    return NextResponse.json({
      success: true,
      url: saved.url,
      filename: saved.filename,
      size: saved.size,
    }, { status: 201 });
  } catch (err) {
    console.error("[Upload API Error]:", err);
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }
}
