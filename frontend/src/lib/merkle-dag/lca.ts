import type { MerkleCommit } from './types';

export class MerkleDAG {
  private commits: Map<string, MerkleCommit> = new Map();

  constructor(initialCommits?: MerkleCommit[]) {
    if (initialCommits) {
      for (const commit of initialCommits) {
        this.addCommit(commit);
      }
    }
  }

  addCommit(commit: MerkleCommit): void {
    this.commits.set(commit.id, commit);
  }

  getCommit(id: string): MerkleCommit | undefined {
    return this.commits.get(id);
  }

  hasCommit(id: string): boolean {
    return this.commits.has(id);
  }

  getAllCommits(): MerkleCommit[] {
    return Array.from(this.commits.values());
  }

  /**
   * Computes all ancestors of a commit with their distance (depth) from start.
   */
  getAncestorsWithDepth(startId: string): Map<string, number> {
    const ancestors = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (!ancestors.has(id) || depth < ancestors.get(id)!) {
        ancestors.set(id, depth);
        const commit = this.getCommit(id);
        if (commit) {
          for (const parentId of commit.parents) {
            queue.push({ id: parentId, depth: depth + 1 });
          }
        }
      }
    }

    return ancestors;
  }

  /**
   * Finds the Lowest Common Ancestor (LCA) between two commits in the DAG.
   */
  findLCA(commitA: string, commitB: string): string | null {
    if (commitA === commitB) {
      return commitA;
    }

    const ancestorsA = this.getAncestorsWithDepth(commitA);
    const ancestorsB = this.getAncestorsWithDepth(commitB);

    if (ancestorsA.has(commitB)) {
      // commitB is an ancestor of commitA (Fast-Forward)
      return commitB;
    }

    if (ancestorsB.has(commitA)) {
      // commitA is an ancestor of commitB (Fast-Forward)
      return commitA;
    }

    // Find all common ancestors and pick the one with lowest combined depth
    let bestCandidate: string | null = null;
    let minCombinedDepth = Number.POSITIVE_INFINITY;

    for (const [id, depthA] of ancestorsA.entries()) {
      if (ancestorsB.has(id)) {
        const depthB = ancestorsB.get(id)!;
        const combined = depthA + depthB;
        if (combined < minCombinedDepth) {
          minCombinedDepth = combined;
          bestCandidate = id;
        }
      }
    }

    return bestCandidate;
  }

  /**
   * Collects all commits on the path from LCA up to targetCommitId in topological order.
   */
  getPathFromLCA(lcaId: string, targetCommitId: string): MerkleCommit[] {
    if (lcaId === targetCommitId) {
      return [];
    }

    const visited = new Set<string>();
    const path: MerkleCommit[] = [];
    const queue: string[] = [targetCommitId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === lcaId || visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const commit = this.getCommit(currentId);
      if (commit) {
        path.push(commit);
        for (const parentId of commit.parents) {
          queue.push(parentId);
        }
      }
    }

    // Reverse so commits go chronologically from oldest (LCA child) to newest (target)
    return path.reverse();
  }
}
