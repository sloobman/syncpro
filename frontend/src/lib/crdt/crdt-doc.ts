import type {
  BlockNode,
  BlockType,
  CRDTOperation,
  ID,
  MoveOp,
  TextNode,
} from './types';
import { LamportClock } from './clock';
import { StateVector } from './state-vector';
import { TreeCRDT } from './tree-crdt';
import { formatID } from './id';
import { BinaryCodec, MessageType } from './binary-codec';

export type UpdateListener = (deltaBytes: Uint8Array, ops: CRDTOperation[]) => void;

export class CRDTDocument {
  readonly clientId: number;
  readonly clock: LamportClock;
  readonly stateVector: StateVector;
  readonly tree: TreeCRDT;
  private pendingOps: CRDTOperation[] = [];
  private unappliedOps: CRDTOperation[] = [];
  private updateListeners: Set<UpdateListener> = new Set();

  constructor(clientId: number) {
    this.clientId = clientId;
    this.clock = new LamportClock(clientId);
    this.stateVector = new StateVector();
    this.tree = new TreeCRDT();
  }

  onUpdate(listener: UpdateListener): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  private notify(ops: CRDTOperation[]): void {
    if (ops.length === 0 || this.updateListeners.size === 0) return;
    const bytes = BinaryCodec.encodeOperations(ops, MessageType.Update);
    for (const listener of this.updateListeners) {
      listener(bytes, ops);
    }
  }

  /**
   * Creates a new block at the document level or under parent.
   */
  createBlock(parentId: ID | null = null, blockType: BlockType = 'paragraph', orderKey?: string): BlockNode {
    const id = this.clock.tick();
    this.stateVector.witness(id);

    const block = this.tree.createBlock(id, parentId, blockType, orderKey);
    const op: CRDTOperation = {
      type: 'block-create',
      op: { block },
    };

    this.pendingOps.push(op);
    this.notify([op]);
    return block;
  }

  /**
   * Inserts text into a block at a given visible character offset.
   */
  insertText(blockId: ID, offset: number, text: string): TextNode[] {
    const textCrdt = this.tree.getTextCRDT(blockId);
    if (!textCrdt) {
      throw new Error(`Block ${formatID(blockId)} not found`);
    }

    const { originLeft, originRight } = textCrdt.getOriginAt(offset);
    let prevLeft = originLeft;
    const insertedNodes: TextNode[] = [];
    const ops: CRDTOperation[] = [];

    for (const char of text) {
      const id = this.clock.tick();
      this.stateVector.witness(id);

      const node: TextNode = {
        id,
        originLeft: prevLeft,
        originRight,
        content: char,
        isDeleted: false,
      };

      textCrdt.integrate(node);
      insertedNodes.push(node);
      prevLeft = id;

      ops.push({
        type: 'text-insert',
        op: { blockId, node },
      });
    }

    this.pendingOps.push(...ops);
    this.notify(ops);
    return insertedNodes;
  }

  /**
   * Deletes a range of visible text within a block.
   */
  deleteText(blockId: ID, offset: number, length: number): void {
    const textCrdt = this.tree.getTextCRDT(blockId);
    if (!textCrdt) return;

    const ops: CRDTOperation[] = [];
    for (let i = 0; i < length; i++) {
      const targetId = textCrdt.getIdAtOffset(offset);
      if (!targetId) break;

      this.clock.tick();
      textCrdt.delete(targetId);

      ops.push({
        type: 'text-delete',
        op: { blockId, targetId },
      });
    }

    if (ops.length > 0) {
      this.pendingOps.push(...ops);
      this.notify(ops);
    }
  }

  /**
   * Moves a block in the hierarchy.
   */
  moveBlock(blockId: ID, newParentId: ID | null, orderKey: string): boolean {
    const id = this.clock.tick();
    this.stateVector.witness(id);

    const moveOp: MoveOp = { id, blockId, newParentId, orderKey };
    const success = this.tree.applyMove(moveOp);
    if (success) {
      const op: CRDTOperation = {
        type: 'block-move',
        op: moveOp,
      };
      this.pendingOps.push(op);
      this.notify([op]);
    }
    return success;
  }

  /**
   * Returns the plain text of a block.
   */
  getBlockText(blockId: ID): string {
    const textCrdt = this.tree.getTextCRDT(blockId);
    return textCrdt ? textCrdt.toString() : '';
  }

  /**
   * Marks a block as deleted in the tree CRDT.
   */
  deleteBlock(blockId: ID): void {
    const block = this.tree.getBlock(blockId);
    if (block && !block.isDeleted) {
      block.isDeleted = true;
      this.notify([]);
    }
  }

  private tryApplyOperation(op: CRDTOperation): boolean {
    switch (op.type) {
      case 'text-insert': {
        const { blockId, node } = op.op;
        if (!this.tree.hasBlock(blockId)) {
          return false; // Causal dependency: block must exist first
        }
        const textCrdt = this.tree.getTextCRDT(blockId)!;
        const integrated = textCrdt.integrate(node);
        if (integrated) {
          this.clock.witness(node.id.clock);
          this.stateVector.witness(node.id);
        }
        return integrated;
      }
      case 'text-delete': {
        const { blockId, targetId } = op.op;
        const textCrdt = this.tree.getTextCRDT(blockId);
        if (!textCrdt) return false;
        return textCrdt.delete(targetId);
      }
      case 'block-create': {
        const { block } = op.op;
        if (block.parentId !== null && !this.tree.hasBlock(block.parentId)) {
          return false;
        }
        this.clock.witness(block.id.clock);
        this.stateVector.witness(block.id);
        this.tree.createBlock(block.id, block.parentId, block.blockType, block.orderKey);
        return true;
      }
      case 'block-move': {
        const moveOp = op.op;
        if (!this.tree.hasBlock(moveOp.blockId)) {
          return false;
        }
        if (moveOp.newParentId !== null && !this.tree.hasBlock(moveOp.newParentId)) {
          return false;
        }
        this.clock.witness(moveOp.id.clock);
        this.stateVector.witness(moveOp.id);
        return this.tree.applyMove(moveOp);
      }
      case 'block-delete': {
        const { blockId, clockId } = op.op;
        this.clock.witness(clockId.clock);
        this.stateVector.witness(clockId);
        return this.tree.deleteBlock(blockId);
      }
    }
  }

  /**
   * Drains buffered operations whose causal dependencies have now arrived.
   */
  drainUnapplied(): number {
    let drainedCount = 0;
    let progressed = true;
    while (progressed && this.unappliedOps.length > 0) {
      progressed = false;
      const remaining: CRDTOperation[] = [];
      for (const pending of this.unappliedOps) {
        if (this.tryApplyOperation(pending)) {
          progressed = true;
          drainedCount++;
        } else {
          remaining.push(pending);
        }
      }
      this.unappliedOps = remaining;
    }
    return drainedCount;
  }

  /**
   * Applies an incoming remote operation with causal buffer retry.
   */
  applyOperation(op: CRDTOperation): boolean {
    const success = this.tryApplyOperation(op);
    if (!success) {
      this.unappliedOps.push(op);
      return false;
    }

    this.drainUnapplied();
    return true;
  }

  /**
   * Applies incoming binary delta.
   */
  applyDelta(deltaBytes: Uint8Array): CRDTOperation[] {
    const { operations } = BinaryCodec.decodeOperations(deltaBytes);
    const applied: CRDTOperation[] = [];
    for (const op of operations) {
      if (this.applyOperation(op)) {
        applied.push(op);
      }
    }
    return applied;
  }

  /**
   * Extracts all current operations as a full binary snapshot.
   */
  encodeFullState(): Uint8Array {
    const ops: CRDTOperation[] = [];

    for (const block of this.tree.getAllBlocks()) {
      ops.push({
        type: 'block-create',
        op: { block },
      });

      const textCrdt = this.tree.getTextCRDT(block.id);
      if (textCrdt) {
        for (const node of textCrdt.getNodes()) {
          ops.push({
            type: 'text-insert',
            op: { blockId: block.id, node },
          });
        }
      }
    }

    return BinaryCodec.encodeOperations(ops, MessageType.SyncStep2);
  }

  toPlainText(): string {
    return this.tree.toPlainText();
  }
}
