import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await WorkspaceRepository.getDocumentById(id);
    if (!data) {
      return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API Document GET Error]:", err);
    return NextResponse.json({ error: "Ошибка получения документа" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    const success = await WorkspaceRepository.updateDocument(id, {
      title,
      content,
    });

    if (!success) {
      // If document doesn't exist in DB yet, create it
      await WorkspaceRepository.createDocument({
        id,
        title: title || "Безымянный документ",
        content: content || "",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API Document PATCH Error]:", err);
    return NextResponse.json({ error: "Ошибка сохранения документа" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}
