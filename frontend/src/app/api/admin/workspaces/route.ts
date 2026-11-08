import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { AdminRepository } from "@/lib/db/admin-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminRepository.listWorkspaces({ search, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Workspaces GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке пространств" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { workspaceId, newOwnerEmailOrId } = body;

    if (!workspaceId || !newOwnerEmailOrId) {
      return NextResponse.json(
        { error: "Укажите workspaceId и email нового владельца" },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || undefined;
    const result = await AdminRepository.transferWorkspaceOwnership(
      auth.adminUser.id,
      workspaceId,
      newOwnerEmailOrId,
      ip
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Ошибка передачи прав" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Владелец пространства успешно изменен" });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Workspaces PATCH Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при передаче пространства" },
      { status: 500 }
    );
  }
}
