import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { AdminRepository } from "@/lib/db/admin-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const metrics = await AdminRepository.getMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Metrics GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при получении метрик" },
      { status: 500 }
    );
  }
}
