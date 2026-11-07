import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Новый пароль должен содержать минимум 8 символов" },
        { status: 400 }
      );
    }

    const user = await UserRepository.findByEmail(payload.email);
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный текущий пароль" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await UserRepository.updatePassword(user.id, newHash);

    return NextResponse.json({ success: true, message: "Пароль успешно обновлен" });
  } catch (error) {
    console.error("[API Change Password Error]:", error);
    return NextResponse.json(
      { error: "Не удалось изменить пароль" },
      { status: 500 }
    );
  }
}
