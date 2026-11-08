import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { PromoRepository } from "@/lib/db/promo-repository";
import { AdminRepository } from "@/lib/db/admin-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const promoCodes = await PromoRepository.listPromoCodes();
    return NextResponse.json({ promoCodes });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Promo Codes GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке промокодов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { code, plan = "pro", durationDays = 30, maxUses, expiresAt } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Укажите промокод" }, { status: 400 });
    }

    const promo = await PromoRepository.createPromoCode({
      code: code.trim(),
      plan,
      durationDays: parseInt(durationDays, 10) || 30,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: auth.adminUser.id,
    });

    const ip = request.headers.get("x-forwarded-for") || undefined;
    await AdminRepository.logAction({
      actorId: auth.adminUser.id,
      action: "promo.create",
      targetType: "promo_code",
      targetId: promo.id,
      details: { code: promo.code, plan: promo.plan, durationDays: promo.duration_days },
      ipAddress: ip,
    });

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Promo Codes POST Error]:", error);
    return NextResponse.json(
      { error: "Не удалось создать промокод (возможно, такой промокод уже существует)" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
    }

    const ok = await PromoRepository.togglePromoCode(id, isActive);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Promo Codes PATCH Error]:", error);
    return NextResponse.json({ error: "Ошибка обновления промокода" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Параметр id обязателен" }, { status: 400 });
    }

    const ok = await PromoRepository.deletePromoCode(id);
    return NextResponse.json({ success: ok });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Promo Codes DELETE Error]:", error);
    return NextResponse.json({ error: "Ошибка удаления промокода" }, { status: 500 });
  }
}
