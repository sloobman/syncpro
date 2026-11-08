import { NextRequest, NextResponse } from "next/server";
import { computeCommitHash } from "@/lib/merkle-dag/hash";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { MerkleDAGRepository } from "@/lib/db/dag-repository";
import { putS3Object, BUCKET_COMMITS } from "@/lib/db/s3";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { NotificationRepository } from "@/lib/db/notification-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await WorkspaceRepository.getDocumentById(id, user.id);
  if (!doc) {
    return NextResponse.json(
      { error: "Документ не найден или доступ ограничен" },
      { status: 403 }
    );
  }

  try {
    const commits = await MerkleDAGRepository.getCommitsByDocument(id);
    if (commits.length > 0) {
      return NextResponse.json({
        documentId: id,
        commits,
        source: "postgres",
      });
    }

    // Auto-migrate: create real initial commit in PostgreSQL from document content
    const initial = await MerkleDAGRepository.createInitialCommit(
      id,
      doc.document.createdBy || user.id,
      doc.content || "",
      user.name || "Автор документа"
    );

    return NextResponse.json({
      documentId: id,
      commits: [initial],
      source: "postgres",
    });
  } catch (dbErr) {
    console.warn(`[Commits API] PostgreSQL read fallback for ${id}:`, (dbErr as Error).message);
    return NextResponse.json({
      documentId: id,
      commits: [],
      error: "Ошибка получения коммитов",
    }, { status: 500 });
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

  const canEdit = await WorkspaceRepository.canUserEditDocument(id, user.id);
  if (!canEdit) {
    return NextResponse.json(
      { error: "Доступ запрещен. У вас права только на чтение (Читатель)" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { parents, stateVector, message, branch, deltaBytesBase64, deltaSha256, content } = body;

  const commitPayload = {
    documentId: id,
    parents: Array.isArray(parents) ? parents : [],
    deltaSha256: typeof deltaSha256 === "string" ? deltaSha256 : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stateVector: stateVector && typeof stateVector === "object" ? stateVector : {},
    message: typeof message === "string" ? message : "Автоматический микро-коммит",
    author: {
      userId: user.id,
      name: user.name,
      avatarUrl: null,
    },
    timestamp: Date.now(),
    branch: typeof branch === "string" ? branch : "main",
  };

  const commitId = await computeCommitHash(commitPayload);
  const deltaStoragePath = `deltas/${id}/${commitId}.bin`;

  // Persist raw delta binary blob in S3/MinIO
  if (deltaBytesBase64) {
    try {
      const buffer = Buffer.from(deltaBytesBase64, "base64");
      await putS3Object(BUCKET_COMMITS, deltaStoragePath, buffer);
    } catch (s3Err) {
      console.warn(`[Commits API] MinIO upload notice for ${commitId}:`, (s3Err as Error).message);
    }
  }

  const newCommit: MerkleCommit = {
    ...commitPayload,
    id: commitId,
    crdtDeltaStoragePath: deltaStoragePath,
    snapshotStoragePath: null,
    content: typeof content === "string" ? content : null,
  };

  // Persist DAG node into PostgreSQL
  try {
    await MerkleDAGRepository.saveCommit(newCommit);
  } catch (dbErr) {
    console.warn(`[Commits API] PostgreSQL save notice:`, (dbErr as Error).message);
  }

  // Broadcast notification to other workspace members
  try {
    const docData = await WorkspaceRepository.getDocumentById(id, user.id);
    if (docData?.document.workspaceId) {
      await NotificationRepository.notifyWorkspaceMembers({
        workspaceId: docData.document.workspaceId,
        excludeUserId: user.id,
        title: `Новый коммит в «${docData.document.title || "документе"}»`,
        description: `${user.name}: «${commitPayload.message}» (ветка: ${commitPayload.branch})`,
        type: "commit",
        link: `/doc/${id}`,
      });
    }
  } catch (notifErr) {
    console.warn("[Commits API notification notice]:", notifErr);
  }

  return NextResponse.json({
    success: true,
    commit: newCommit,
  });
}

export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const commitId = searchParams.get("commitId");
  if (!commitId) {
    return NextResponse.json({ error: "commitId обязателен" }, { status: 400 });
  }

  try {
    const result = await MerkleDAGRepository.deleteCommit(id, commitId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
