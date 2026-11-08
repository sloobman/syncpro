import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { PromoRepository } from "@/lib/db/promo-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { error: "Пожалуйста, введите промокод" },
        { status: 400 }
      );
    }

    const result = await PromoRepository.redeemPromoCode(userPayload.id, code);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Не удалось активировать промокод" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Промокод успешно применен! Активирован тариф ${result.plan?.toUpperCase()} на ${result.durationDays} дней.`,
      plan: result.plan,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Billing Promo POST Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при активации промокода" },
      { status: 500 }
    );
  }
}
