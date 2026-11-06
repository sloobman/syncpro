import { NextRequest, NextResponse } from "next/server";
import { CRDTDocument } from "@/lib/crdt/crdt-doc";
import { CompactionWorker } from "@/lib/compaction/snapshot-worker";
import { putS3Object, getS3Object, BUCKET_SNAPSHOTS } from "@/lib/db/s3";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const snapshotKey = `snapshots/${id}/latest.snap.bin`;

  // 1. Try reading from MinIO / S3
  try {
    const s3Bytes = await getS3Object(BUCKET_SNAPSHOTS, snapshotKey);
    if (s3Bytes && s3Bytes.length > 0) {
      return NextResponse.json({
        documentId: id,
        snapshotHash: `s3_${s3Bytes.length}`,
        bytesCount: s3Bytes.length,
        source: "s3_minio",
        updatedAt: Date.now(),
      });
    }
  } catch (s3Err) {
    console.warn(`[Snapshot API] MinIO read notice for ${id}:`, (s3Err as Error).message);
  }

  // 2. Fallback: generate and persist fresh initial snapshot
  const doc = new CRDTDocument(0);
  const b1 = doc.createBlock(null, "heading1", "1. Архитектура SyncPro");
  doc.insertText(b1.id, 0, "Распределенное ядро совместного редактирования.");

  const { bytes } = CompactionWorker.createSnapshot(doc, "latest", id);

  try {
    await putS3Object(BUCKET_SNAPSHOTS, snapshotKey, bytes);
  } catch (putErr) {
    console.warn(`[Snapshot API] MinIO put notice for ${id}:`, (putErr as Error).message);
  }

  return NextResponse.json({
    documentId: id,
    snapshotHash: "initial_cas_snapshot",
    bytesCount: bytes.length,
    source: "generated",
    updatedAt: Date.now(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { minStableClock } = body;

  const doc = new CRDTDocument(0);
  const gcResult = CompactionWorker.runTombstoneGC(
    doc,
    typeof minStableClock === "number" ? minStableClock : 0
  );

  const snapshotKey = `snapshots/${id}/snap_${Date.now()}.snap.bin`;
  const { bytes } = CompactionWorker.createSnapshot(doc, `snap_${Date.now()}`, id);

  try {
    await putS3Object(BUCKET_SNAPSHOTS, snapshotKey, bytes);
    // Also update pointer to latest
    await putS3Object(BUCKET_SNAPSHOTS, `snapshots/${id}/latest.snap.bin`, bytes);
  } catch (s3Err) {
    console.warn(`[Snapshot API] MinIO upload notice for ${id}:`, (s3Err as Error).message);
  }

  return NextResponse.json({
    success: true,
    documentId: id,
    snapshotPath: snapshotKey,
    bytesCount: bytes.length,
    prunedCharacters: gcResult.prunedChars,
    prunedBlocks: gcResult.prunedBlocks,
  });
}
