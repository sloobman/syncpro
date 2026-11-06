import type { BlockNode, BlockType, ID, MoveOp } from './types';
import { compareIDs, equalIDs, formatID } from './id';
import { TextCRDT } from './text-crdt';

export function generateOrderKeyBetween(prevKey: string | null, nextKey: string | null): string {
  const p = prevKey ?? 'a';
  const n = nextKey ?? 'z';

  if (p < n) {
    let i = 0;
    let result = '';
    while (i < p.length || i < n.length) {
      const pChar = p.charCodeAt(i) || 96;
      const nChar = n.charCodeAt(i) || 123;

      if (nChar - pChar > 1) {
        const midChar = Math.floor((pChar + nChar) / 2);
        result += String.fromCharCode(midChar);
        return result;
      }

      result += String.fromCharCode(pChar);
      i++;
    }
    return result + 'm';
  }

  return p + 'm';
}

export class TreeCRDT {
  private blocks: Map<string, BlockNode> = new Map();
  private textCrdts: Map<string, TextCRDT> = new Map();
  private moveHistory: MoveOp[] = [];

  constructor() {}

  getBlock(id: ID): BlockNode | undefined {
    return this.blocks.get(formatID(id));
  }

  getTextCRDT(id: ID): TextCRDT | undefined {
    return this.textCrdts.get(formatID(id));
  }

  hasBlock(id: ID): boolean {
    return this.blocks.has(formatID(id));
  }

  createBlock(
    id: ID,
    parentId: ID | null,
    blockType: BlockType,
    orderKey?: string
  ): BlockNode {
    const key = formatID(id);
    if (this.blocks.has(key)) {
      return this.blocks.get(key)!;
    }

    const finalOrderKey = orderKey ?? generateOrderKeyBetween(null, null);

    const block: BlockNode = {
      id,
      parentId,
      blockType,
      orderKey: finalOrderKey,
      textNodes: [],
      children: [],
      isDeleted: false,
    };

    // If parent is already deleted, cascade deletion
    if (parentId !== null) {
      const parent = this.getBlock(parentId);
      if (parent && parent.isDeleted) {
        block.isDeleted = true;
      }
    }

    this.blocks.set(key, block);
    this.textCrdts.set(key, new TextCRDT());

    // 1. If parent exists, add to parent's children
    if (parentId !== null) {
      const parent = this.getBlock(parentId);
      if (parent && !parent.children.some((cid) => equalIDs(cid, id))) {
        parent.children.push(id);
        this.sortChildren(parent);
      }
    }

    // 2. Adopt any existing blocks that had this block as parent
    for (const other of this.blocks.values()) {
      if (other.parentId !== null && equalIDs(other.parentId, id)) {
        if (!block.children.some((cid) => equalIDs(cid, other.id))) {
          block.children.push(other.id);
        }
      }
    }
    this.sortChildren(block);

    return block;
  }

  isAncestor(candidateAncestorId: ID, blockId: ID): boolean {
    let currentId: ID | null = blockId;
    while (currentId !== null) {
      if (equalIDs(currentId, candidateAncestorId)) {
        return true;
      }
      const node = this.getBlock(currentId);
      currentId = node ? node.parentId : null;
    }
    return false;
  }

  isBlockVisible(block: BlockNode): boolean {
    let curr: BlockNode | undefined = block;
    while (curr) {
      if (curr.isDeleted) return false;
      if (curr.parentId === null) return true;
      curr = this.getBlock(curr.parentId);
    }
    return false;
  }

  applyMove(op: MoveOp): boolean {
    const block = this.getBlock(op.blockId);
    if (!block) {
      return false;
    }

    if (op.newParentId !== null) {
      if (equalIDs(op.newParentId, op.blockId) || this.isAncestor(op.blockId, op.newParentId)) {
        return false; // Cycle detected
      }
    }

    // Remove from old parent
    if (block.parentId !== null) {
      const oldParent = this.getBlock(block.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter((cid) => !equalIDs(cid, block.id));
      }
    }

    block.parentId = op.newParentId;
    block.orderKey = op.orderKey;

    if (op.newParentId !== null) {
      const newParent = this.getBlock(op.newParentId);
      if (newParent) {
        if (!newParent.children.some((cid) => equalIDs(cid, block.id))) {
          newParent.children.push(block.id);
          this.sortChildren(newParent);
        }
      }
    }

    this.moveHistory.push(op);
    return true;
  }

  private sortChildren(parent: BlockNode): void {
    parent.children.sort((a, b) => {
      const blockA = this.getBlock(a);
      const blockB = this.getBlock(b);
      if (!blockA || !blockB) return 0;
      if (blockA.orderKey < blockB.orderKey) return -1;
      if (blockA.orderKey > blockB.orderKey) return 1;
      return compareIDs(blockA.id, blockB.id);
    });
  }

  deleteBlock(blockId: ID): boolean {
    const block = this.getBlock(blockId);
    if (!block || block.isDeleted) {
      return false;
    }

    block.isDeleted = true;
    for (const childId of block.children) {
      this.deleteBlock(childId);
    }
    return true;
  }

  getRootBlocks(): BlockNode[] {
    const roots: BlockNode[] = [];
    for (const block of this.blocks.values()) {
      if (block.parentId === null && !block.isDeleted) {
        roots.push(block);
      }
    }
    roots.sort((a, b) => {
      if (a.orderKey < b.orderKey) return -1;
      if (a.orderKey > b.orderKey) return 1;
      return compareIDs(a.id, b.id);
    });
    return roots;
  }

  getFlattenedBlocks(): BlockNode[] {
    const result: BlockNode[] = [];
    const traverse = (blocks: BlockNode[]) => {
      for (const block of blocks) {
        if (!this.isBlockVisible(block)) continue;
        result.push(block);
        const children = block.children
          .map((id) => this.getBlock(id))
          .filter((b): b is BlockNode => b !== undefined && this.isBlockVisible(b));
        traverse(children);
      }
    };
    traverse(this.getRootBlocks());
    return result;
  }

  toPlainText(): string {
    const blocks = this.getFlattenedBlocks();
    return blocks
      .map((block) => {
        const textCrdt = this.textCrdts.get(formatID(block.id));
        return textCrdt ? textCrdt.toString() : '';
      })
      .join('\n');
  }

  getAllBlocks(): readonly BlockNode[] {
    return Array.from(this.blocks.values());
  }
}
