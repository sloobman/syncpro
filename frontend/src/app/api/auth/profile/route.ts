import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { UserRepository } from "@/lib/auth/user-repository";

export async function PUT(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    const updatedUser = await UserRepository.updateProfile(payload.id, {
      name,
      avatarUrl,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("[API Auth Profile Update Error]:", error);
    return NextResponse.json(
      { error: "Не удалось обновить профиль" },
      { status: 500 }
    );
  }
}
