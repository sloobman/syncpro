import { NextRequest, NextResponse } from "next/server";
import { FilesRepository } from "@/lib/db/files-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await FilesRepository.getFile(id);

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    return new NextResponse(file.data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch (err) {
    console.error("[Files API GET Error]:", err);
    return NextResponse.json({ error: "Ошибка получения файла" }, { status: 500 });
  }
}
