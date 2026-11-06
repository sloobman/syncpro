import { NextRequest, NextResponse } from "next/server";
import { CRDTDocument } from "@/lib/crdt/crdt-doc";
import { CompactionWorker } from "@/lib/compaction/snapshot-worker";

// In-memory snapshot cache for fast retrieval
const snapshotStore = new Map<string, { snapshot: Uint8Array; updatedAt: number }>();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cached = snapshotStore.get(id);

  if (!cached) {
    // Generate fresh document skeleton
    const doc = new CRDTDocument(0);
    const b1 = doc.createBlock(null, "heading1", "1. Архитектура SyncPro");
    doc.insertText(b1.id, 0, "Распределенное ядро совместного редактирования.");

    const { bytes } = CompactionWorker.createSnapshot(doc, "initial", id);
    snapshotStore.set(id, { snapshot: bytes, updatedAt: Date.now() });

    return NextResponse.json({
      documentId: id,
      snapshotHash: "initial_cas_snapshot",
      bytesCount: bytes.length,
      updatedAt: Date.now(),
    });
  }

  return NextResponse.json({
    documentId: id,
    snapshotHash: `snapshot_${cached.updatedAt}`,
    bytesCount: cached.snapshot.length,
    updatedAt: cached.updatedAt,
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

  const { bytes } = CompactionWorker.createSnapshot(doc, `snap_${Date.now()}`, id);
  snapshotStore.set(id, { snapshot: bytes, updatedAt: Date.now() });

  return NextResponse.json({
    success: true,
    documentId: id,
    snapshotHash: `snapshot_${Date.now()}`,
    bytesCount: bytes.length,
    prunedCharacters: gcResult.prunedChars,
    prunedBlocks: gcResult.prunedBlocks,
  });
}
