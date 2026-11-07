import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/auth/user-repository";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email и пароль обязательны для заполнения" },
        { status: 400 }
      );
    }

    // Lookup user in PostgreSQL
    const userRow = await UserRepository.findByEmail(email);
    if (!userRow) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    // Verify bcrypt password hash
    const isValid = await verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const safeUser = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      avatarUrl: userRow.avatar_url,
      role: userRow.role || "user",
      timezone: "Europe/Moscow",
      locale: "ru" as const,
      createdAt: new Date(userRow.created_at).toISOString(),
      updatedAt: new Date(userRow.updated_at).toISOString(),
    };

    // Generate JWT
    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
    });

    const response = NextResponse.json(
      { user: safeUser, token },
      { status: 200 }
    );

    // Set HTTP-only secure cookie
    response.cookies.set("syncpro_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[API Auth Login Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при входе" },
      { status: 500 }
    );
  }
}
