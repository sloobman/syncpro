import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { AdminRepository } from "@/lib/db/admin-repository";
import { UserRepository } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminRepository.listUsers({
      search,
      role,
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Users GET Error]:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка при загрузке пользователей" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, email, password, role = "user", emailVerified = true } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Поля Имя, Email и Пароль обязательны" },
        { status: 400 }
      );
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await UserRepository.createUser({
      name,
      email,
      passwordHash,
      role,
      emailVerified,
      status: "active",
    });

    const ip = request.headers.get("x-forwarded-for") || undefined;
    await AdminRepository.logAction({
      actorId: auth.adminUser.id,
      action: "user.create_by_admin",
      targetType: "user",
      targetId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: ip,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isPrerenderInterrupted(error)) throw error;
    console.error("[API Admin Users POST Error]:", error);
    return NextResponse.json(
      { error: "Не удалось создать пользователя" },
      { status: 500 }
    );
  }
}
