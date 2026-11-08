import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { SubscriptionRepository, PLAN_LIMITS } from "@/lib/db/subscription-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const details = await SubscriptionRepository.getSubscription(userPayload.id);

    return NextResponse.json({
      subscription: details.subscription,
      storageUsedBytes: details.storageUsedBytes,
      workspacesCount: details.workspacesCount,
      documentsCount: details.documentsCount,
      canUseCustomFonts: details.canUseCustomFonts,
      planLimits: PLAN_LIMITS,
    });
  } catch (error) {
    if (isPrerenderInterrupted(error)) {
      throw error;
    }
    console.error("[API Billing Subscription GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке данных подписки" },
      { status: 500 }
    );
  }
}
