import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { NotificationRepository } from "@/lib/db/notification-repository";

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "40", 10);

    const notifications = await NotificationRepository.getUserNotifications(user.id, limit);
    const unreadCount = await NotificationRepository.getUnreadCount(user.id);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("[API Notifications GET Error]:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const success = await NotificationRepository.markAllAsRead(user.id);
    return NextResponse.json({ success, message: "Все уведомления прочитаны" });
  } catch (err) {
    console.error("[API Notifications PATCH Error]:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, link, targetUserId } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required" }, { status: 400 });
    }

    const notification = await NotificationRepository.createNotification({
      userId: targetUserId || user.id,
      title,
      description,
      type: type || "system",
      link: link || null,
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    console.error("[API Notifications POST Error]:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
