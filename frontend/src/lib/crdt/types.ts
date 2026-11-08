export interface ID {
  readonly clientId: number;
  readonly clock: number;
}

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'list-item'
  | 'bullet-list'
  | 'numbered-list'
  | 'todo'
  | 'quote'
  | 'code-block'
  | 'table'
  | 'image'
  | 'divider'
  | 'page-break';

export interface TextNode {
  readonly id: ID;
  readonly originLeft: ID | null;
  readonly originRight: ID | null;
  content: string;
  isDeleted: boolean;
}

export interface BlockNode {
  readonly id: ID;
  parentId: ID | null;
  blockType: BlockType;
  orderKey: string; // Fractional index string for deterministic sibling ordering
  textNodes: TextNode[];
  children: ID[];
  isDeleted: boolean;
}

export interface MoveOp {
  readonly id: ID;
  readonly blockId: ID;
  readonly newParentId: ID | null;
  readonly orderKey: string;
}

export interface TextInsertOp {
  readonly blockId: ID;
  readonly node: TextNode;
}

export interface TextDeleteOp {
  readonly blockId: ID;
  readonly targetId: ID;
}

export interface BlockCreateOp {
  readonly block: BlockNode;
}

export interface BlockDeleteOp {
  readonly blockId: ID;
  readonly clockId: ID;
}

export type CRDTOperation =
  | { type: 'text-insert'; op: TextInsertOp }
  | { type: 'text-delete'; op: TextDeleteOp }
  | { type: 'block-create'; op: BlockCreateOp }
  | { type: 'block-move'; op: MoveOp }
  | { type: 'block-delete'; op: BlockDeleteOp };

export type Operation = CRDTOperation;
