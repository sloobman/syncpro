import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Некорректный email адрес" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 8 символов" },
        { status: 400 }
      );
    }

    const trimmedName = typeof name === "string" && name.trim() ? name.trim() : email.split("@")[0];

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован" },
        { status: 409 }
      );
    }

    // Hash password securely with bcrypt
    const passwordHash = await hashPassword(password);

    // Create user in PostgreSQL
    const safeUser = await UserRepository.createUser({
      name: trimmedName,
      email,
      passwordHash,
      role: "user",
    });

    // Generate JWT
    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
    });

    const response = NextResponse.json(
      { user: safeUser, token },
      { status: 201 }
    );

    // Set HTTP-only auth cookie
    response.cookies.set("syncpro_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[API Auth Register Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при регистрации" },
      { status: 500 }
    );
  }
}
