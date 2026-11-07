import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { CommentsRepository } from "@/lib/db/comments-repository";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { NotificationRepository } from "@/lib/db/notification-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const comments = await CommentsRepository.getComments(id);
    return NextResponse.json({
      documentId: id,
      comments,
    });
  } catch (err) {
    console.warn(`[Comments API] GET error for ${id}:`, (err as Error).message);
    return NextResponse.json({ documentId: id, comments: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Содержимое комментария не может быть пустым" }, { status: 400 });
  }

  try {
    const comment = await CommentsRepository.addComment({
      documentId: id,
      authorId: user.id,
      content: content.trim(),
    });

    // Notify other workspace members
    try {
      const docData = await WorkspaceRepository.getDocumentById(id, user.id);
      if (docData?.document.workspaceId) {
        await NotificationRepository.notifyWorkspaceMembers({
          workspaceId: docData.document.workspaceId,
          excludeUserId: user.id,
          title: `Новый комментарий в «${docData.document.title || "документе"}»`,
          description: `${user.name}: «${content.trim().slice(0, 80)}»`,
          type: "comment",
          link: `/doc/${id}`,
        });
      }
    } catch (notifErr) {
      console.warn("[Comments API] Notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      comment,
    }, { status: 201 });
  } catch (err) {
    console.error(`[Comments API] POST error:`, err);
    return NextResponse.json({ error: "Не удалось сохранить комментарий" }, { status: 500 });
  }
}
