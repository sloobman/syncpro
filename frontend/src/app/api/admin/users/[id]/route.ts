import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { AdminRepository } from "@/lib/db/admin-repository";
import { UserRepository } from "@/lib/auth/user-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const user = await UserRepository.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin User GET Error]:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id: targetUserId } = await params;
    const ip = request.headers.get("x-forwarded-for") || undefined;
    const body = await request.json();
    const { action, status, role, password, plan, durationDays } = body;

    // 1. Force verify email
    if (action === "force_verify") {
      const ok = await AdminRepository.forceVerifyEmail(auth.adminUser.id, targetUserId, ip);
      if (!ok) {
        return NextResponse.json({ error: "Не удалось подтвердить email" }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Email успешно подтвержден" });
    }

    // 2. Change status (active / blocked)
    if (action === "set_status") {
      if (status !== "active" && status !== "blocked") {
        return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
      }
      if (targetUserId === auth.adminUser.id && status === "blocked") {
        return NextResponse.json({ error: "Нельзя заблокировать собственный аккаунт" }, { status: 400 });
      }
      const ok = await AdminRepository.updateUserStatus(auth.adminUser.id, targetUserId, status, ip);
      return NextResponse.json({ success: ok });
    }

    // 3. Change role (user / admin)
    if (action === "set_role") {
      if (role !== "user" && role !== "admin") {
        return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
      }
      if (targetUserId === auth.adminUser.id && role === "user") {
        return NextResponse.json({ error: "Нельзя снять права администратора с себя" }, { status: 400 });
      }
      const ok = await AdminRepository.updateUserRole(auth.adminUser.id, targetUserId, role, ip);
      return NextResponse.json({ success: ok });
    }

    // 4. Reset password
    if (action === "reset_password") {
      if (!password || typeof password !== "string" || password.length < 8) {
        return NextResponse.json({ error: "Новый пароль должен быть от 8 символов" }, { status: 400 });
      }
      const ok = await AdminRepository.resetUserPassword(auth.adminUser.id, targetUserId, password, ip);
      return NextResponse.json({ success: ok, message: "Пароль успешно обновлен" });
    }

    // 5. Change plan
    if (action === "set_plan") {
      if (plan !== "free" && plan !== "pro" && plan !== "enterprise") {
        return NextResponse.json({ error: "Недопустимый тарифный план" }, { status: 400 });
      }
      const days = parseInt(durationDays || "30", 10);
      const ok = await AdminRepository.updateUserPlan(auth.adminUser.id, targetUserId, plan, days, ip);
      return NextResponse.json({ success: ok, message: "Тарифный план обновлен" });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin User PATCH Error]:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера при обновлении пользователя" }, { status: 500 });
  }
}
