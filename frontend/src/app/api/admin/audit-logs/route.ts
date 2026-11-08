import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { AdminRepository } from "@/lib/db/admin-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const logs = await AdminRepository.listAuditLogs({ limit, offset });
    return NextResponse.json({ logs });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Audit Logs GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке логов аудита" },
      { status: 500 }
    );
  }
}
