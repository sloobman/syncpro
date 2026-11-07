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

    const members = await WorkspaceRepository.getWorkspaceMembers(id);
    return NextResponse.json({ members });
  } catch (err) {
    console.error("[API Workspace Members GET Error]:", err);
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
    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Укажите корректный email для приглашения" },
        { status: 400 }
      );
    }

    const result = await WorkspaceRepository.inviteMember({
      workspaceId: id,
      email: email.trim().toLowerCase(),
      role: role || "viewer",
      inviterId: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API Workspace Members POST Error]:", err);
    return NextResponse.json({ error: "Ошибка при отправке приглашения" }, { status: 500 });
  }
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
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Укажите идентификатор пользователя для удаления" },
        { status: 400 }
      );
    }

    const result = await WorkspaceRepository.removeMember({
      workspaceId: id,
      targetUserId: userId,
      requesterId: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API Workspace Members DELETE Error]:", err);
    return NextResponse.json({ error: "Ошибка при удалении участника" }, { status: 500 });
  }
}
