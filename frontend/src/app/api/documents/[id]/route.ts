import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (id === "demo") {
      return NextResponse.json({
        document: {
          id: "demo",
          title: "Демо-документ SyncPro",
          is_public: true,
        },
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Добро пожаловать в SyncPro!" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Это интерактивный демонстрационный документ монолитного редактора. Попробуйте форматирование, таблицы, вставку изображений и совместную работу.",
                },
              ],
            },
          ],
        }),
        canEdit: true,
        userRole: "editor",
      });
    }

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

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
    const { id } = await params;
    if (id === "demo") {
      return NextResponse.json({ success: true, savedAt: Date.now() });
    }

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    // Strict edit permission check
    const canEdit = await WorkspaceRepository.canUserEditDocument(id, user.id);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Доступ запрещен. У вас права только на чтение (Читатель)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content } = body;

    const success = await WorkspaceRepository.updateDocument(
      id,
      { title, content },
      user.id
    );

    if (!success) {
      return NextResponse.json(
        { error: "Не удалось обновить документ" },
        { status: 400 }
      );
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const success = await WorkspaceRepository.deleteDocument(id, user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Не удалось удалить документ или доступ ограничен" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, message: "Документ удален" });
  } catch (err) {
    console.error("[API Document DELETE Error]:", err);
    return NextResponse.json({ error: "Ошибка удаления документа" }, { status: 500 });
  }
}
