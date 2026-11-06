import { NextRequest, NextResponse } from "next/server";
import { computeCommitHash } from "@/lib/merkle-dag/hash";
import type { MerkleCommit } from "@/lib/merkle-dag/types";

// In-memory commit DAG cache per document (for real-time persistence layer)
const commitStore = new Map<string, MerkleCommit[]>();

function getInitialCommits(documentId: string): MerkleCommit[] {
  const rootCommit: MerkleCommit = {
    id: "c000000000000000000000000000000000000000000000000000000000000001",
    documentId,
    parents: [],
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    crdtDeltaStoragePath: `deltas/${documentId}/c000000000000000000000000000000000000000000000000000000000000001.bin`,
    snapshotStoragePath: `snapshots/${documentId}/c000000000000000000000000000000000000000000000000000000000000001.snap.bin`,
    stateVector: { 0: 0 },
    message: "Начальная инициализация документа SyncPro",
    author: {
      userId: "system",
      name: "SyncPro Core Engine",
      avatarUrl: null,
    },
    timestamp: 1714000000000,
    branch: "main",
  };

  const devCommit: MerkleCommit = {
    id: "c000000000000000000000000000000000000000000000000000000000000002",
    documentId,
    parents: [rootCommit.id],
    deltaSha256: "a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866",
    crdtDeltaStoragePath: `deltas/${documentId}/c000000000000000000000000000000000000000000000000000000000000002.bin`,
    snapshotStoragePath: null,
    stateVector: { 0: 10, 1: 5 },
    message: "feat(crdt): интеграция YATA sequence и Kleppmann Tree",
    author: {
      userId: "u1",
      name: "Алиса",
      avatarUrl: null,
    },
    timestamp: 1714003600000,
    branch: "dev",
  };

  const commits = [rootCommit, devCommit];
  commitStore.set(documentId, commits);
  return commits;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let commits = commitStore.get(id);
  if (!commits) {
    commits = getInitialCommits(id);
  }

  return NextResponse.json({
    documentId: id,
    commits,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { parents, stateVector, message, author, branch, deltaSha256 } = body;

  let commits = commitStore.get(id);
  if (!commits) {
    commits = getInitialCommits(id);
  }

  const commitPayload = {
    documentId: id,
    parents: Array.isArray(parents) ? parents : [],
    deltaSha256: typeof deltaSha256 === "string" ? deltaSha256 : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stateVector: stateVector && typeof stateVector === "object" ? stateVector : {},
    message: typeof message === "string" ? message : "Automated micro-commit",
    author: {
      userId: author?.userId || "anonymous",
      name: author?.name || "Пользователь",
      avatarUrl: author?.avatarUrl ?? null,
    },
    timestamp: Date.now(),
    branch: typeof branch === "string" ? branch : "main",
  };

  const commitId = await computeCommitHash(commitPayload);
  const newCommit: MerkleCommit = {
    ...commitPayload,
    id: commitId,
    crdtDeltaStoragePath: `deltas/${id}/${commitId}.bin`,
    snapshotStoragePath: null,
  };

  commits.push(newCommit);
  commitStore.set(id, commits);

  return NextResponse.json(
    {
      success: true,
      commit: newCommit,
    },
    { status: 201 }
  );
}
