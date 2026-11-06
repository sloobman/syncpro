import type { ID, TextNode } from './types';
import { compareIDs, equalIDs, formatID } from './id';

export class TextCRDT {
  private nodes: Map<string, TextNode> = new Map();
  // Tree representation: parent ID string (or "root") -> list of child IDs sorted descending by ID
  private children: Map<string, ID[]> = new Map();

  constructor(initialNodes?: TextNode[]) {
    if (initialNodes) {
      for (const node of initialNodes) {
        this.integrate(node);
      }
    }
  }

  getNodes(): TextNode[] {
    const list: TextNode[] = [];
    this.traverse((node) => list.push(node));
    return list;
  }

  getNode(id: ID | null): TextNode | undefined {
    if (!id) return undefined;
    return this.nodes.get(formatID(id));
  }

  has(id: ID): boolean {
    return this.nodes.has(formatID(id));
  }

  private getParentKey(node: TextNode): string {
    return node.originLeft ? formatID(node.originLeft) : 'root';
  }

  /**
   * Integrates a new TextNode into the tree.
   * Direct children under any parent are strictly and deterministically ordered by ID descending.
   */
  integrate(newNode: TextNode): boolean {
    const key = formatID(newNode.id);
    if (this.nodes.has(key)) {
      return true; // Idempotent
    }

    // Check causal dependency: originLeft must be present unless root
    if (newNode.originLeft !== null && !this.nodes.has(formatID(newNode.originLeft))) {
      return false; // Causal dependency not yet satisfied
    }

    this.nodes.set(key, newNode);

    const parentKey = this.getParentKey(newNode);
    let siblingList = this.children.get(parentKey);
    if (!siblingList) {
      siblingList = [];
      this.children.set(parentKey, siblingList);
    }

    // Insert newNode into siblingList maintaining descending ID order
    let insertIdx = 0;
    while (insertIdx < siblingList.length) {
      // Descending: higher priority ID comes earlier
      if (compareIDs(newNode.id, siblingList[insertIdx]) > 0) {
        break;
      }
      insertIdx++;
    }
    siblingList.splice(insertIdx, 0, newNode.id);

    return true;
  }

  /**
   * Deletes a text node by setting its tombstone isDeleted flag.
   */
  delete(id: ID): boolean {
    const node = this.nodes.get(formatID(id));
    if (!node || node.isDeleted) {
      return false;
    }
    node.isDeleted = true;
    return true;
  }

  /**
   * Pre-order depth-first traversal of the CRDT tree.
   */
  private traverse(visitor: (node: TextNode) => void): void {
    const visit = (parentKey: string) => {
      const kids = this.children.get(parentKey);
      if (!kids) return;
      for (const childId of kids) {
        const node = this.nodes.get(formatID(childId));
        if (node) {
          visitor(node);
          visit(formatID(node.id));
        }
      }
    };
    visit('root');
  }

  /**
   * Extracts visible string (skipping deleted tombstones).
   */
  toString(): string {
    let result = '';
    this.traverse((node) => {
      if (!node.isDeleted) {
        result += node.content;
      }
    });
    return result;
  }

  /**
   * Returns character length of visible content.
   */
  get length(): number {
    let len = 0;
    this.traverse((node) => {
      if (!node.isDeleted) {
        len += node.content.length;
      }
    });
    return len;
  }

  /**
   * Finds the ID of the visible character at a given flat string offset.
   */
  getIdAtOffset(offset: number): ID | null {
    let currentOffset = 0;
    let foundId: ID | null = null;
    this.traverse((node) => {
      if (foundId) return;
      if (node.isDeleted) return;
      const nextOffset = currentOffset + node.content.length;
      if (offset >= currentOffset && offset < nextOffset) {
        foundId = node.id;
      }
      currentOffset = nextOffset;
    });
    return foundId;
  }

  /**
   * Finds the left origin for inserting text at a visible offset.
   */
  getOriginAt(offset: number): { originLeft: ID | null; originRight: ID | null } {
    if (offset <= 0) {
      return { originLeft: null, originRight: null };
    }

    let accumulated = 0;
    let leftNode: TextNode | null = null;

    this.traverse((node) => {
      if (node.isDeleted) return;
      accumulated += node.content.length;
      if (accumulated <= offset) {
        leftNode = node;
      }
    });

    return {
      originLeft: leftNode ? (leftNode as TextNode).id : null,
      originRight: null,
    };
  }

  /**
   * Prunes tombstones that are safe to remove (Tombstone GC).
   */
  pruneTombstones(canPrune: (node: TextNode) => boolean): number {
    let pruned = 0;
    for (const [key, node] of this.nodes.entries()) {
      if (node.isDeleted && canPrune(node)) {
        // Safe to prune only if it has no children
        const kids = this.children.get(key);
        if (!kids || kids.length === 0) {
          this.nodes.delete(key);
          const parentKey = this.getParentKey(node);
          const siblings = this.children.get(parentKey);
          if (siblings) {
            this.children.set(
              parentKey,
              siblings.filter((id) => !equalIDs(id, node.id))
            );
          }
          pruned++;
        }
      }
    }
    return pruned;
  }
}
