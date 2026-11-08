import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { MerkleDAGRepository } from "@/lib/db/dag-repository";
import { NotificationRepository } from "@/lib/db/notification-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const canEdit = await WorkspaceRepository.canUserEditDocument(id, user.id);
  if (!canEdit) {
    return NextResponse.json(
      { error: "Доступ запрещен. У вас права только на чтение (Читатель)" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { commitId, branch } = body;
  if (!commitId) {
    return NextResponse.json({ error: "commitId обязателен" }, { status: 400 });
  }

  try {
    const revertCommit = await MerkleDAGRepository.revertCommit(
      id,
      commitId,
      branch || "main",
      user
    );

    // Notify members
    try {
      const docData = await WorkspaceRepository.getDocumentById(id, user.id);
      if (docData?.document.workspaceId) {
        await NotificationRepository.notifyWorkspaceMembers({
          workspaceId: docData.document.workspaceId,
          excludeUserId: user.id,
          title: `Откат версии в «${docData.document.title || "документе"}»`,
          description: `${user.name} откатил(а) документ к версии ${commitId.slice(0, 7)}`,
          type: "commit",
          link: `/doc/${id}`,
        });
      }
    } catch {
      // ignore notification errors
    }

    return NextResponse.json({
      success: true,
      commit: revertCommit,
      revertedContent: revertCommit.content,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
