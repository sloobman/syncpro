import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { NotificationRepository } from "@/lib/db/notification-repository";

// Server-side email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Password complexity: min 8 chars, at least 1 uppercase, 1 digit, 1 special char
const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_DIGIT = /\d/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
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

    if (!PASSWORD_UPPERCASE.test(password)) {
      return NextResponse.json(
        { error: "Пароль должен содержать хотя бы одну заглавную букву" },
        { status: 400 }
      );
    }

    if (!PASSWORD_DIGIT.test(password)) {
      return NextResponse.json(
        { error: "Пароль должен содержать хотя бы одну цифру" },
        { status: 400 }
      );
    }

    if (!PASSWORD_SPECIAL.test(password)) {
      return NextResponse.json(
        { error: "Пароль должен содержать хотя бы один спецсимвол" },
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

    // Claim any pending invitations for this email or create personal workspace
    try {
      const claimed = await WorkspaceRepository.claimPendingInvitations(safeUser.id, safeUser.email);
      if (claimed === 0) {
        await WorkspaceRepository.createDefaultWorkspaceForUser(safeUser.id, safeUser.name);
      }
    } catch (wsErr) {
      console.error("[Workspace auto-creation error]:", wsErr);
    }

    // Create welcome notification
    try {
      await NotificationRepository.createNotification({
        userId: safeUser.id,
        title: "Добро пожаловать в SyncPro!",
        description: "Ваше рабочее пространство готово. Создавайте документы и приглашайте коллег для совместной работы.",
        type: "system",
        link: "/dashboard",
      });
    } catch (notifErr) {
      console.warn("[Register notification notice]:", notifErr);
    }

    // Generate JWT
    const token = signToken({
      id: safeUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
    });

    // Return user info without token in body — token is only in HTTP-only cookie
    const response = NextResponse.json(
      { user: safeUser },
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
    console.error("[API Auth Register Error]:", (error as Error).message);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера при регистрации" },
      { status: 500 }
    );
  }
}
