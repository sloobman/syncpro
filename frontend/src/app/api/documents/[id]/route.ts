import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const data = await WorkspaceRepository.getDocumentById(id, user.id);
    if (!data) {
      return NextResponse.json(
        { error: "Документ не найден или доступ ограничен" },
        { status: 404 }
      );
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
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    const success = await WorkspaceRepository.updateDocument(
      id,
      { title, content },
      user.id
    );

    if (!success) {
      // If document doesn't exist in DB yet, create it under user's workspace
      await WorkspaceRepository.createDocument({
        id,
        title: title || "Безымянный документ",
        content: content || "",
        createdBy: user.id,
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
