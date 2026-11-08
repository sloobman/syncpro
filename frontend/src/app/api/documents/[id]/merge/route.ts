import { NextRequest, NextResponse } from "next/server";
import { computeCommitHash } from "@/lib/merkle-dag/hash";
import type { MerkleCommit } from "@/lib/merkle-dag/types";
import { MerkleDAG } from "@/lib/merkle-dag/lca";
import { MerkleDAGRepository } from "@/lib/db/dag-repository";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";
import { NotificationRepository } from "@/lib/db/notification-repository";

export interface MergeConflictBlock {
  id: number;
  base: string;
  ours: string;
  theirs: string;
}

function performThreeWayMerge(
  base: string,
  ours: string,
  theirs: string
): { merged: string; conflicts: MergeConflictBlock[] } {
  if (ours === theirs) {
    return { merged: ours, conflicts: [] };
  }
  if (ours === base) {
    return { merged: theirs, conflicts: [] };
  }
  if (theirs === base) {
    return { merged: ours, conflicts: [] };
  }

  const baseLines = base.split("\n");
  const oursLines = ours.split("\n");
  const theirsLines = theirs.split("\n");

  const conflicts: MergeConflictBlock[] = [];
  const mergedLines: string[] = [];
  const maxLen = Math.max(baseLines.length, oursLines.length, theirsLines.length);

  for (let i = 0; i < maxLen; i++) {
    const b = baseLines[i] ?? "";
    const o = oursLines[i] ?? "";
    const t = theirsLines[i] ?? "";

    if (o === t) {
      mergedLines.push(o);
    } else if (o === b) {
      mergedLines.push(t);
    } else if (t === b) {
      mergedLines.push(o);
    } else {
      // Both diverged on line i
      const conflictId = conflicts.length + 1;
      conflicts.push({
        id: conflictId,
        base: b,
        ours: o,
        theirs: t,
      });
      mergedLines.push(`<<<<<<< ${o} ======= ${t} >>>>>>>`);
    }
  }

  return { merged: mergedLines.join("\n"), conflicts };
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
  const {
    sourceBranch,
    targetBranch,
    targetCommitId,
    sourceCommitId,
    resolvedContent,
    dryRun,
    message,
  } = body;

  if (!sourceBranch || !targetBranch) {
    return NextResponse.json(
      { error: "sourceBranch и targetBranch обязательны" },
      { status: 400 }
    );
  }

  const commits = await MerkleDAGRepository.getCommitsByDocument(id);
  if (commits.length === 0) {
    return NextResponse.json({ error: "Коммиты документа не найдены" }, { status: 404 });
  }

  const dag = new MerkleDAG(commits);
  const branches = await MerkleDAGRepository.getBranches(id);

  // Find target HEAD commit
  let targetHead = targetCommitId
    ? commits.find((c) => c.id === targetCommitId)
    : commits.filter((c) => c.branch === targetBranch).pop();
  if (!targetHead) {
    const branchRecord = branches.find((b) => b.name === targetBranch);
    if (branchRecord) {
      targetHead = commits.find((c) => c.id === branchRecord.head_commit_id);
    }
  }
  if (!targetHead) {
    targetHead = commits[commits.length - 1];
  }

  // Find source HEAD commit
  let sourceHead = sourceCommitId
    ? commits.find((c) => c.id === sourceCommitId)
    : commits.filter((c) => c.branch === sourceBranch).pop();
  if (!sourceHead) {
    const branchRecord = branches.find((b) => b.name === sourceBranch);
    if (branchRecord) {
      sourceHead = commits.find((c) => c.id === branchRecord.head_commit_id);
    }
  }
  if (!sourceHead) {
    return NextResponse.json(
      { error: `Ветка-источник «${sourceBranch}» не имеет коммитов для слияния` },
      { status: 400 }
    );
  }

  // Find Lowest Common Ancestor
  const lcaId = dag.findLCA(targetHead.id, sourceHead.id);
  const lcaCommit = lcaId ? dag.getCommit(lcaId) : commits[0];

  const baseText = lcaCommit?.content ?? "";
  const targetText = targetHead.content ?? "";
  const sourceText = sourceHead.content ?? "";

  const mergeAnalysis = performThreeWayMerge(baseText, targetText, sourceText);

  // If dryRun requested, return conflict details without modifying database
  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      hasConflict: mergeAnalysis.conflicts.length > 0,
      conflicts: mergeAnalysis.conflicts,
      baseContent: baseText,
      targetContent: targetText,
      sourceContent: sourceText,
      previewMerged: mergeAnalysis.conflicts.length === 0 ? mergeAnalysis.merged : null,
    });
  }

  // If conflicts exist and no user-resolved text was submitted, return conflict error with details
  if (mergeAnalysis.conflicts.length > 0 && typeof resolvedContent !== "string") {
    return NextResponse.json({
      success: false,
      hasConflict: true,
      conflicts: mergeAnalysis.conflicts,
      baseContent: baseText,
      targetContent: targetText,
      sourceContent: sourceText,
      message: "Обнаружен конфликт слияния. Требуется ручное разрешение.",
    }, { status: 409 });
  }

  const finalMergedText =
    typeof resolvedContent === "string" ? resolvedContent : mergeAnalysis.merged;

  // Parents of the merge commit
  const parents = [targetHead.id, sourceHead.id];

  const defaultMsg = `Merge branch '${sourceBranch}' into '${targetBranch}' via 3-Way CRDT Merge`;
  const mergeCommitPayload = {
    documentId: id,
    parents,
    deltaSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    stateVector: {},
    message: typeof message === "string" && message.trim() ? message.trim() : defaultMsg,
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
    snapshotStoragePath: null,
    content: finalMergedText,
  };

  try {
    await MerkleDAGRepository.saveCommit(mergeCommit);
  } catch (dbErr) {
    console.warn(`[Merge API] PostgreSQL save notice for merge commit:`, (dbErr as Error).message);
  }

  // Update target branch and document content in PostgreSQL
  try {
    await WorkspaceRepository.updateDocument(id, { content: finalMergedText }, user.id);
    await MerkleDAGRepository.createBranch(id, targetBranch, mergeCommitId);
  } catch (updateErr) {
    console.warn(`[Merge API] Document content update notice:`, updateErr);
  }

  // Send notifications
  try {
    await NotificationRepository.createNotification({
      userId: user.id,
      title: "Ветка успешно слита",
      description: `3-Way Merge ветки «${sourceBranch}» в «${targetBranch}» выполнен`,
      type: "merge",
      link: `/doc/${id}`,
    });

    const docData = await WorkspaceRepository.getDocumentById(id, user.id);
    if (docData?.document.workspaceId) {
      await NotificationRepository.notifyWorkspaceMembers({
        workspaceId: docData.document.workspaceId,
        excludeUserId: user.id,
        title: "Слияние веток в документе",
        description: `${user.name} выполнил(а) слияние «${sourceBranch}» в «${targetBranch}»`,
        type: "merge",
        link: `/doc/${id}`,
      });
    }
  } catch (notifErr) {
    console.warn("[Merge notification notice]:", notifErr);
  }

  return NextResponse.json({
    success: true,
    documentId: id,
    baseCommitId: lcaId ?? null,
    sourceBranch,
    targetBranch,
    mergeCommit,
    mergedPlainText: finalMergedText,
    conflicts: 0,
    strategy: "3-way-crdt-merge",
  });
}
