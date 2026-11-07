import type { ID } from '../crdt/types';

export interface CommitAuthor {
  readonly userId: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
}

export interface MerkleCommit {
  readonly id: string; // SHA-256 hash
  readonly documentId: string;
  readonly parents: string[]; // Parent commit hashes
  readonly branch: string;
  readonly author: CommitAuthor;
  readonly timestamp: number;
  readonly message: string;
  readonly deltaSha256: string;
  readonly stateVector: Record<string, number>;
  readonly crdtDeltaStoragePath: string;
  readonly snapshotStoragePath?: string | null;
  readonly content?: string | null;
}

export interface DocumentBranch {
  readonly documentId: string;
  readonly name: string;
  headCommitId: string;
  readonly createdAt: string;
}

export interface CharacterDiffItem {
  readonly type: 'added' | 'removed' | 'unchanged';
  readonly char: string;
  readonly id?: ID;
  readonly author?: string;
}

export interface MergeResult {
  readonly mergeCommit: MerkleCommit;
  readonly lcaCommitId: string;
  readonly mergedPlainText: string;
  readonly isFastForward: boolean;
}
