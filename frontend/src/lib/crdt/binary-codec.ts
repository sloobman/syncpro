import type { ID, BlockType, CRDTOperation } from './types';
import { StateVector } from './state-vector';
import { createID } from './id';

export const PROTOCOL_VERSION = 0x01;

export enum MessageType {
  SyncStep1 = 0x01,
  SyncStep2 = 0x02,
  Update = 0x03,
  Awareness = 0x04,
}

export class BinaryWriter {
  private buffer: Uint8Array;
  private offset = 0;

  constructor(initialCapacity = 256) {
    this.buffer = new Uint8Array(initialCapacity);
  }

  private ensureCapacity(needed: number): void {
    if (this.offset + needed <= this.buffer.length) return;
    const newCap = Math.max(this.buffer.length * 2, this.offset + needed);
    const newBuf = new Uint8Array(newCap);
    newBuf.set(this.buffer);
    this.buffer = newBuf;
  }

  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.buffer[this.offset++] = value & 0xff;
  }

  /**
   * Encodes an unsigned integer using Little-Endian Base 128 (LEB128 / VarUint).
   */
  writeVarUint(value: number): void {
    let num = Math.floor(Math.max(0, value));
    while (num >= 0x80) {
      this.writeUint8((num & 0x7f) | 0x80);
      num = Math.floor(num / 128);
    }
    this.writeUint8(num & 0x7f);
  }

  /**
   * Encodes a signed integer using ZigZag + LEB128.
   */
  writeVarInt(value: number): void {
    const zigzag = value >= 0 ? value * 2 : -value * 2 - 1;
    this.writeVarUint(zigzag);
  }

  writeString(str: string): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.writeVarUint(bytes.length);
    this.ensureCapacity(bytes.length);
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeID(id: ID | null): void {
    if (!id) {
      this.writeVarUint(0);
      this.writeVarUint(0);
    } else {
      this.writeVarUint(id.clientId);
      this.writeVarUint(id.clock);
    }
  }

  getBytes(): Uint8Array {
    return this.buffer.subarray(0, this.offset);
  }
}

export class BinaryReader {
  private buffer: Uint8Array;
  private offset = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  get remaining(): number {
    return this.buffer.length - this.offset;
  }

  readUint8(): number {
    if (this.offset >= this.buffer.length) {
      throw new Error('Unexpected EOF in BinaryReader');
    }
    return this.buffer[this.offset++];
  }

  readVarUint(): number {
    let result = 0;
    let shift = 0;
    while (true) {
      const byte = this.readUint8();
      result += (byte & 0x7f) * Math.pow(2, shift);
      if ((byte & 0x80) === 0) {
        break;
      }
      shift += 7;
      if (shift > 35) {
        throw new Error('VarUint overflow');
      }
    }
    return result;
  }

  readVarInt(): number {
    const zigzag = this.readVarUint();
    return zigzag % 2 === 0 ? zigzag / 2 : -(zigzag + 1) / 2;
  }

  readString(): string {
    const len = this.readVarUint();
    if (this.offset + len > this.buffer.length) {
      throw new Error(`Invalid string length: ${len}`);
    }
    const slice = this.buffer.subarray(this.offset, this.offset + len);
    this.offset += len;
    const decoder = new TextDecoder();
    return decoder.decode(slice);
  }

  readID(): ID | null {
    const clientId = this.readVarUint();
    const clock = this.readVarUint();
    if (clientId === 0 && clock === 0) {
      return null;
    }
    return createID(clientId, clock);
  }
}

export class BinaryCodec {
  /**
   * Encodes a StateVector into binary format.
   */
  static encodeStateVector(sv: StateVector): Uint8Array {
    const writer = new BinaryWriter();
    writer.writeUint8(PROTOCOL_VERSION);
    writer.writeUint8(MessageType.SyncStep1);

    const entries = Array.from(sv.entries());
    writer.writeVarUint(entries.length);
    for (const [clientId, clock] of entries) {
      writer.writeVarUint(clientId);
      writer.writeVarUint(clock);
    }
    return writer.getBytes();
  }

  /**
   * Decodes a StateVector from binary format.
   */
  static decodeStateVector(bytes: Uint8Array): StateVector {
    const reader = new BinaryReader(bytes);
    const version = reader.readUint8();
    if (version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }
    const msgType = reader.readUint8();
    if (msgType !== MessageType.SyncStep1) {
      throw new Error(`Expected SyncStep1 message, got ${msgType}`);
    }

    const count = reader.readVarUint();
    const sv = new StateVector();
    for (let i = 0; i < count; i++) {
      const clientId = reader.readVarUint();
      const clock = reader.readVarUint();
      sv.set(clientId, clock);
    }
    return sv;
  }

  /**
   * Encodes an array of CRDTOperations into a compressed binary delta with RLE.
   */
  static encodeOperations(ops: CRDTOperation[], messageType = MessageType.Update): Uint8Array {
    const writer = new BinaryWriter();
    writer.writeUint8(PROTOCOL_VERSION);
    writer.writeUint8(messageType);
    writer.writeVarUint(ops.length);

    for (const op of ops) {
      switch (op.type) {
        case 'text-insert': {
          writer.writeUint8(0x01); // Tag: text-insert
          writer.writeID(op.op.blockId);
          writer.writeID(op.op.node.id);
          writer.writeID(op.op.node.originLeft);
          writer.writeID(op.op.node.originRight);
          writer.writeString(op.op.node.content);
          writer.writeUint8(op.op.node.isDeleted ? 1 : 0);
          break;
        }
        case 'text-delete': {
          writer.writeUint8(0x02); // Tag: text-delete
          writer.writeID(op.op.blockId);
          writer.writeID(op.op.targetId);
          break;
        }
        case 'block-create': {
          writer.writeUint8(0x03); // Tag: block-create
          writer.writeID(op.op.block.id);
          writer.writeID(op.op.block.parentId);
          writer.writeString(op.op.block.blockType);
          writer.writeString(op.op.block.orderKey);
          break;
        }
        case 'block-move': {
          writer.writeUint8(0x04); // Tag: block-move
          writer.writeID(op.op.id);
          writer.writeID(op.op.blockId);
          writer.writeID(op.op.newParentId);
          writer.writeString(op.op.orderKey);
          break;
        }
        case 'block-delete': {
          writer.writeUint8(0x05); // Tag: block-delete
          writer.writeID(op.op.blockId);
          writer.writeID(op.op.clockId);
          break;
        }
      }
    }

    return writer.getBytes();
  }

  /**
   * Decodes binary operations.
   */
  static decodeOperations(bytes: Uint8Array): { messageType: MessageType; operations: CRDTOperation[] } {
    const reader = new BinaryReader(bytes);
    const version = reader.readUint8();
    if (version !== PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }
    const messageType = reader.readUint8() as MessageType;
    const count = reader.readVarUint();
    const ops: CRDTOperation[] = [];

    for (let i = 0; i < count; i++) {
      const tag = reader.readUint8();
      switch (tag) {
        case 0x01: {
          const blockId = reader.readID()!;
          const id = reader.readID()!;
          const originLeft = reader.readID();
          const originRight = reader.readID();
          const content = reader.readString();
          const isDeleted = reader.readUint8() === 1;
          ops.push({
            type: 'text-insert',
            op: {
              blockId,
              node: { id, originLeft, originRight, content, isDeleted },
            },
          });
          break;
        }
        case 0x02: {
          const blockId = reader.readID()!;
          const targetId = reader.readID()!;
          ops.push({
            type: 'text-delete',
            op: { blockId, targetId },
          });
          break;
        }
        case 0x03: {
          const id = reader.readID()!;
          const parentId = reader.readID();
          const blockType = reader.readString() as BlockType;
          const orderKey = reader.readString();
          ops.push({
            type: 'block-create',
            op: {
              block: {
                id,
                parentId,
                blockType,
                orderKey,
                textNodes: [],
                children: [],
                isDeleted: false,
              },
            },
          });
          break;
        }
        case 0x04: {
          const id = reader.readID()!;
          const blockId = reader.readID()!;
          const newParentId = reader.readID();
          const orderKey = reader.readString();
          ops.push({
            type: 'block-move',
            op: { id, blockId, newParentId, orderKey },
          });
          break;
        }
        case 0x05: {
          const blockId = reader.readID()!;
          const clockId = reader.readID()!;
          ops.push({
            type: 'block-delete',
            op: { blockId, clockId },
          });
          break;
        }
        default:
          throw new Error(`Unknown operation tag: ${tag}`);
      }
    }

    return { messageType, operations: ops };
  }
}
