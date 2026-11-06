import { MerkleDAG } from './lca';
import type { MerkleCommit, MergeResult, CommitAuthor } from './types';
import { CRDTDocument } from '../crdt/crdt-doc';
import { computeCommitHash, sha256Hex } from './hash';

export interface DeltaLoader {
  loadDelta(storagePath: string): Promise<Uint8Array>;
  loadSnapshot?(storagePath: string): Promise<Uint8Array | null>;
}

export class ThreeWayMergeEngine {
  private dag: MerkleDAG;
  private deltaLoader: DeltaLoader;

  constructor(dag: MerkleDAG, deltaLoader: DeltaLoader) {
    this.dag = dag;
    this.deltaLoader = deltaLoader;
  }

  /**
   * Performs an automated conflict-free 3-Way CRDT Merge between branchA and branchB.
   */
  async mergeBranches(
    documentId: string,
    targetBranch: string,
    sourceBranch: string,
    headCommitAId: string,
    headCommitBId: string,
    mergerAuthor: CommitAuthor
  ): Promise<MergeResult> {
    const lcaId = this.dag.findLCA(headCommitAId, headCommitBId);
    if (!lcaId) {
      throw new Error(`No common ancestor found between ${headCommitAId} and ${headCommitBId}`);
    }

    // 1. Fast-forward cases
    if (lcaId === headCommitAId) {
      // Branch B has all of Branch A's history. Target branch fast-forwards directly to B.
      const commitB = this.dag.getCommit(headCommitBId)!;
      return {
        mergeCommit: commitB,
        lcaCommitId: lcaId,
        mergedPlainText: '', // Fast-forwarded
        isFastForward: true,
      };
    }

    if (lcaId === headCommitBId) {
      // Branch A already contains all changes from Branch B. Nothing to merge.
      const commitA = this.dag.getCommit(headCommitAId)!;
      return {
        mergeCommit: commitA,
        lcaCommitId: lcaId,
        mergedPlainText: '',
        isFastForward: true,
      };
    }

    // 2. Divergent branches: 3-Way CRDT Merge
    // Initialize merge CRDT doc
    const mergeDoc = new CRDTDocument(999); // Merger client ID

    // Collect and apply path from LCA to Branch A
    const pathA = this.dag.getPathFromLCA(lcaId, headCommitAId);
    for (const commit of pathA) {
      const deltaBytes = await this.deltaLoader.loadDelta(commit.crdtDeltaStoragePath);
      mergeDoc.applyDelta(deltaBytes);
    }

    // Collect and apply path from LCA to Branch B
    const pathB = this.dag.getPathFromLCA(lcaId, headCommitBId);
    for (const commit of pathB) {
      const deltaBytes = await this.deltaLoader.loadDelta(commit.crdtDeltaStoragePath);
      mergeDoc.applyDelta(deltaBytes);
    }

    // The document is now deterministically unified!
    const mergedState = mergeDoc.encodeFullState();
    const deltaHash = await sha256Hex(mergedState);
    const timestamp = Date.now();
    const message = `Merge branch '${sourceBranch}' into '${targetBranch}'`;

    const hashPayload = {
      documentId,
      parents: [headCommitAId, headCommitBId],
      branch: targetBranch,
      author: mergerAuthor,
      timestamp,
      message,
      deltaSha256: deltaHash,
      stateVector: mergeDoc.stateVector.toJSON(),
    };

    const commitId = await computeCommitHash(hashPayload);

    const mergeCommit: MerkleCommit = {
      id: commitId,
      documentId,
      parents: [headCommitAId, headCommitBId],
      branch: targetBranch,
      author: mergerAuthor,
      timestamp,
      message,
      deltaSha256: deltaHash,
      stateVector: mergeDoc.stateVector.toJSON(),
      crdtDeltaStoragePath: `commits/${documentId}/${commitId}.bin`,
      snapshotStoragePath: null,
    };

    this.dag.addCommit(mergeCommit);

    return {
      mergeCommit,
      lcaCommitId: lcaId,
      mergedPlainText: mergeDoc.toPlainText(),
      isFastForward: false,
    };
  }
}
