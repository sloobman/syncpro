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
    const hasAccess = await WorkspaceRepository.isUserMemberOrOwner(id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    const documents = await WorkspaceRepository.getWorkspaceDocuments(id, user.id);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[API Workspace Documents GET Error]:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const hasAccess = await WorkspaceRepository.isUserMemberOrOwner(id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content } = body;

    const document = await WorkspaceRepository.createDocument({
      workspaceId: id,
      title: title || "Новый документ",
      content: content || "",
      createdBy: user.id,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[API Workspace Documents POST Error]:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
