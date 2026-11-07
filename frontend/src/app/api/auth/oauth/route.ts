import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, email, name } = body;

    if (!provider || !email) {
      return NextResponse.json(
        { error: "Провайдер и email обязательны" },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || cleanEmail.split("@")[0]).trim();

    // Check if user exists
    const userRow = await UserRepository.findByEmail(cleanEmail);
    if (!userRow) {
      // Create user with a strong random secret password hash for OAuth
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await hashPassword(randomPassword);
      const safeUser = await UserRepository.createUser({
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: "user",
      });

      const token = signToken({
        id: safeUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role,
      });

      const response = NextResponse.json({ user: safeUser, token }, { status: 200 });
      response.cookies.set("syncpro_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
      return response;
    }

    // Existing user
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

    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
    });

    const response = NextResponse.json({ user: safeUser, token }, { status: 200 });
    response.cookies.set("syncpro_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("[API Auth OAuth Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка OAuth авторизации" },
      { status: 500 }
    );
  }
}
