import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { id, workspaceId, title, content } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Название документа обязательно" },
        { status: 400 }
      );
    }

    if (workspaceId) {
      const canEdit = await WorkspaceRepository.canUserEditWorkspace(workspaceId, user.id);
      if (!canEdit) {
        return NextResponse.json(
          { error: "Доступ запрещен. У вас права только на чтение в этом пространстве" },
          { status: 403 }
        );
      }
    }

    const document = await WorkspaceRepository.createDocument({
      id,
      workspaceId,
      title: title.trim(),
      content: content || "",
      createdBy: user.id,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[API Documents POST Error]:", err);
    return NextResponse.json({ error: "Ошибка создания документа" }, { status: 500 });
  }
}
