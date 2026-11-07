import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_DIGIT = /\d/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

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

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Укажите текущий пароль" },
        { status: 400 }
      );
    }

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      !PASSWORD_UPPERCASE.test(newPassword) ||
      !PASSWORD_DIGIT.test(newPassword) ||
      !PASSWORD_SPECIAL.test(newPassword)
    ) {
      return NextResponse.json(
        { error: "Новый пароль должен содержать минимум 8 символов, заглавную букву, цифру и спецсимвол" },
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
