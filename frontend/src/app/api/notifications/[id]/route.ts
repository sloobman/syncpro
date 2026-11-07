import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { NotificationRepository } from "@/lib/db/notification-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const success = await NotificationRepository.markAsRead(id, user.id);

    return NextResponse.json({ success });
  } catch (err) {
    console.error("[API Notification PATCH Error]:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const success = await NotificationRepository.deleteNotification(id, user.id);

    return NextResponse.json({ success });
  } catch (err) {
    console.error("[API Notification DELETE Error]:", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
