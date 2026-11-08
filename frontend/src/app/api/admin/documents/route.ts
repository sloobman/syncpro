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
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminRepository.listDocuments({
      search,
      includeDeleted,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Documents GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке документов" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { action, documentId, newOwnerEmailOrId } = body;
    const ip = request.headers.get("x-forwarded-for") || undefined;

    if (!documentId) {
      return NextResponse.json({ error: "documentId обязателен" }, { status: 400 });
    }

    if (action === "restore") {
      const ok = await AdminRepository.restoreDocument(auth.adminUser.id, documentId, ip);
      return NextResponse.json({ success: ok, message: "Документ успешно восстановлен" });
    }

    if (action === "delete") {
      const ok = await AdminRepository.softDeleteDocument(auth.adminUser.id, documentId, ip);
      return NextResponse.json({ success: ok, message: "Документ перемещен в удаленные" });
    }

    if (action === "transfer") {
      if (!newOwnerEmailOrId) {
        return NextResponse.json({ error: "Укажите нового владельца документа" }, { status: 400 });
      }
      const result = await AdminRepository.transferDocumentOwnership(
        auth.adminUser.id,
        documentId,
        newOwnerEmailOrId,
        ip
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Ошибка передачи документа" }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Владелец документа успешно изменен" });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Documents PATCH Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при обновлении документа" },
      { status: 500 }
    );
  }
}
