import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { FilesRepository } from "@/lib/db/files-repository";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const saved = await FilesRepository.saveFile({
      documentId,
      uploaderId: user?.id || null,
      filename: file.name || "uploaded-image",
      mimeType,
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
