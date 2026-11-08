import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { MerkleDAGRepository } from "@/lib/db/dag-repository";

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
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  try {
    const branches = await MerkleDAGRepository.getBranches(id);
    return NextResponse.json({ branches });
  } catch (err) {
    console.error("[Branches GET Error]:", err);
    return NextResponse.json({ error: "Ошибка загрузки веток" }, { status: 500 });
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
    return NextResponse.json({ error: "Доступ запрещен. Только чтение" }, { status: 403 });
  }

  const body = await request.json();
  const { name, fromCommitId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Имя ветки обязательно" }, { status: 400 });
  }

  const cleanName = name.trim().replace(/\s+/g, "-");

  // Determine base commit ID
  let baseCommitId = fromCommitId ? fromCommitId.trim() : null;
  if (!baseCommitId) {
    const commits = await MerkleDAGRepository.getCommitsByDocument(id);
    if (commits.length > 0) {
      baseCommitId = commits[commits.length - 1].id;
    } else {
      const initial = await MerkleDAGRepository.createInitialCommit(
        id,
        user.id,
        "",
        user.name
      );
      baseCommitId = initial.id;
    }
  }

  try {
    const branch = await MerkleDAGRepository.createBranch(id, cleanName, baseCommitId);
    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
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
    return NextResponse.json({ error: "Доступ запрещен. Только чтение" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const branchName = searchParams.get("name");
  if (!branchName || branchName === "main") {
    return NextResponse.json({ error: "Нельзя удалить основную ветку main" }, { status: 400 });
  }

  try {
    await MerkleDAGRepository.deleteBranch(id, branchName);
    return NextResponse.json({ success: true, message: `Ветка ${branchName} удалена` });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
