import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const workspaces = await WorkspaceRepository.getUserWorkspaces(user.id);
    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error("[API Workspaces GET Error]:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, iconEmoji } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Название пространства обязательно" },
        { status: 400 }
      );
    }

    const workspace = await WorkspaceRepository.createWorkspace({
      name: name.trim(),
      description: description?.trim() || "",
      iconEmoji: iconEmoji || "📁",
      ownerId: user.id,
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    console.error("[API Workspaces POST Error]:", err);
    return NextResponse.json({ error: "Ошибка создания пространства" }, { status: 500 });
  }
}
