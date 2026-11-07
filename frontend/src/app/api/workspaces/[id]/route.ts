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
    const workspace = await WorkspaceRepository.getWorkspaceById(id, user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Рабочее пространство не найдено или доступ ограничен" },
        { status: 403 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (err) {
    console.error("[API Workspace GET Error]:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
