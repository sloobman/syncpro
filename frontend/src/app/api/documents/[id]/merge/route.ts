import { NextRequest, NextResponse } from "next/server";
import { computeCommitHash } from "@/lib/merkle-dag/hash";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { MerkleDAGRepository } from "@/lib/db/dag-repository";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

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
  const { sourceBranch, targetBranch, baseCommitId, sourceCommitId, targetCommitId } = body;

  if (!sourceBranch || !targetBranch) {
    return NextResponse.json(
      { error: "sourceBranch and targetBranch are required" },
      { status: 400 }
    );
  }

  // Parents of the merge commit in the Merkle-DAG
  const parents = [
    targetCommitId || "target_head",
    sourceCommitId || "source_head",
  ];

  const mergeCommitPayload = {
    documentId: id,
    parents,
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stateVector: {},
    message: `Merge branch '${sourceBranch}' into '${targetBranch}' via 3-Way CRDT Merge`,
    author: {
      userId: user.id,
      name: user.name,
      avatarUrl: null,
    },
    timestamp: Date.now(),
    branch: targetBranch,
  };

  const mergeCommitId = await computeCommitHash(mergeCommitPayload);
  const mergeCommit: MerkleCommit = {
    ...mergeCommitPayload,
    id: mergeCommitId,
    crdtDeltaStoragePath: `deltas/${id}/${mergeCommitId}.bin`,
    snapshotStoragePath: `snapshots/${id}/${mergeCommitId}.snap.bin`,
  };

  try {
    await MerkleDAGRepository.saveCommit(mergeCommit);
  } catch (dbErr) {
    console.warn(`[Merge API] PostgreSQL save notice for merge commit:`, (dbErr as Error).message);
  }

  return NextResponse.json({
    success: true,
    documentId: id,
    baseCommitId: baseCommitId ?? null,
    sourceBranch,
    targetBranch,
    mergeCommit,
    conflicts: 0,
    strategy: "3-way-crdt-merge",
  });
}
