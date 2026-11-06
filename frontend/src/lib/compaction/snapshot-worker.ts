import { CRDTDocument } from '../crdt/crdt-doc';
import type { ID } from '../crdt/types';

export interface DocumentSkeletonSection {
  readonly id: ID;
  readonly title: string;
  readonly level: number;
  readonly blockCount: number;
  readonly charCount: number;
}

export interface DocumentSkeleton {
  readonly documentId: string;
  readonly sections: DocumentSkeletonSection[];
  readonly totalBlocks: number;
  readonly totalChars: number;
}

export class CompactionWorker {
  /**
   * Generates a lightweight skeleton tree for sparse sync (500+ pages in <50 KB).
   */
  static generateSkeleton(doc: CRDTDocument, documentId: string): DocumentSkeleton {
    const blocks = doc.tree.getFlattenedBlocks();
    const sections: DocumentSkeletonSection[] = [];
    let currentSection: DocumentSkeletonSection | null = null;
    let totalChars = 0;

    for (const block of blocks) {
      const textCrdt = doc.tree.getTextCRDT(block.id);
      const text = textCrdt ? textCrdt.toString() : '';
      const len = text.length;
      totalChars += len;

      if (block.blockType.startsWith('heading')) {
        const level = Number.parseInt(block.blockType.replace('heading', ''), 10) || 1;
        currentSection = {
          id: block.id,
          title: text || 'Untitled Section',
          level,
          blockCount: 1,
          charCount: len,
        };
        sections.push(currentSection);
      } else if (currentSection) {
        (currentSection as { blockCount: number }).blockCount += 1;
        (currentSection as { charCount: number }).charCount += len;
      }
    }

    return {
      documentId,
      sections,
      totalBlocks: blocks.length,
      totalChars,
    };
  }

  /**
   * Runs Epoch-based Tombstone Garbage Collection.
   * Safely deletes tombstones that are causally stable across all peers.
   */
  static runTombstoneGC(doc: CRDTDocument, minStableClock: number): { prunedBlocks: number; prunedChars: number } {
    let prunedChars = 0;
    const prunedBlocks = 0;

    // Prune characters in text CRDTs
    for (const block of doc.tree.getAllBlocks()) {
      const textCrdt = doc.tree.getTextCRDT(block.id);
      if (textCrdt) {
        const count = textCrdt.pruneTombstones((node) => node.id.clock <= minStableClock);
        prunedChars += count;
      }
    }

    return { prunedBlocks, prunedChars };
  }

  /**
   * Creates an immutable compressed snapshot of the document for S3/MinIO CAS storage.
   */
  static createSnapshot(doc: CRDTDocument, commitId: string, documentId: string): {
    storagePath: string;
    bytes: Uint8Array;
  } {
    const bytes = doc.encodeFullState();
    const storagePath = `snapshots/${documentId}/${commitId}.snap.bin`;
    return { storagePath, bytes };
  }
}
