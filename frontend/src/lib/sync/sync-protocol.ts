import { BinaryCodec, MessageType } from '../crdt/binary-codec';
import { CRDTDocument } from '../crdt/crdt-doc';

export type SyncState = 'connecting' | 'handshake-step1' | 'handshake-step2' | 'ready' | 'disconnected';

export interface SyncMessage {
  type: MessageType;
  payload: Uint8Array;
}

export class SyncProtocolHandler {
  readonly doc: CRDTDocument;
  state: SyncState = 'connecting';
  private sendCallback: (data: Uint8Array) => void;

  constructor(doc: CRDTDocument, sendCallback: (data: Uint8Array) => void) {
    this.doc = doc;
    this.sendCallback = sendCallback;
  }

  /**
   * Starts Handshake: Client initiates by transmitting its local StateVector (SyncStep1).
   */
  startHandshake(): void {
    this.state = 'handshake-step1';
    const step1Bytes = BinaryCodec.encodeStateVector(this.doc.stateVector);
    this.sendCallback(step1Bytes);
  }

  /**
   * Handles incoming binary packet according to the StateVector Handshake protocol.
   */
  handleIncoming(bytes: Uint8Array): void {
    if (bytes.length < 2) return;
    const msgType = bytes[1] as MessageType;

    switch (msgType) {
      case MessageType.SyncStep1: {
        const _remoteSV = BinaryCodec.decodeStateVector(bytes);
        void _remoteSV;
        // Compute delta of local operations that remote peer is missing
        // and transmit as SyncStep2
        const fullState = this.doc.encodeFullState();
        this.sendCallback(fullState);

        if (this.state === 'handshake-step1') {
          this.state = 'handshake-step2';
        }
        break;
      }
      case MessageType.SyncStep2: {
        // Apply received missing operations
        this.doc.applyDelta(bytes);
        this.state = 'ready';
        break;
      }
      case MessageType.Update: {
        if (this.state === 'ready') {
          this.doc.applyDelta(bytes);
        }
        break;
      }
    }
  }

  /**
   * Broadcasts a live local update delta to peers.
   */
  sendUpdate(deltaBytes: Uint8Array): void {
    if (this.state === 'ready') {
      this.sendCallback(deltaBytes);
    }
  }
}
