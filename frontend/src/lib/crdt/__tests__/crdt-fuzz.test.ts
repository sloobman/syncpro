import test from 'node:test';
import assert from 'node:assert';
import { CRDTDocument } from '../crdt-doc';
import { BinaryCodec } from '../binary-codec';
import { generateOrderKeyBetween } from '../tree-crdt';
import type { CRDTOperation } from '../types';

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 */
function createPRNG(seed: number) {
  let s = seed;
  return function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Fuzzing & Chaos simulation: 10,000+ operations across 4 peers converge to identical state', () => {
  const seed = 0x1337c0de;
  const rand = createPRNG(seed);

  const numPeers = 4;
  const peers: CRDTDocument[] = [];
  for (let i = 0; i < numPeers; i++) {
    peers.push(new CRDTDocument(i + 1));
  }

  // Network queue: messages scheduled to be delivered
  interface QueuedMessage {
    targetPeerIndex: number;
    op: CRDTOperation;
    deliverAtStep: number;
  }

  const networkQueue: QueuedMessage[] = [];
  let currentStep = 0;

  // Setup broadcast listeners
  for (let i = 0; i < numPeers; i++) {
    const senderIdx = i;
    peers[senderIdx].onUpdate((bytes) => {
      // Decode from binary bytes to simulate true over-the-wire network transmission
      const { operations } = BinaryCodec.decodeOperations(bytes);
      for (const op of operations) {
        for (let targetIdx = 0; targetIdx < numPeers; targetIdx++) {
          if (targetIdx === senderIdx) continue;
          // Random delay: deliver within 1..15 steps
          const delay = Math.floor(rand() * 15) + 1;
          networkQueue.push({
            targetPeerIndex: targetIdx,
            op,
            deliverAtStep: currentStep + delay,
          });
        }
      }
    });
  }

  // Initial root block on peer 0, synced to all
  peers[0].createBlock(null, 'paragraph', 'a');

  const TOTAL_STEPS = 10000;

  for (currentStep = 0; currentStep < TOTAL_STEPS; currentStep++) {
    // 1. Pick a random peer to perform a mutation
    const peerIdx = Math.floor(rand() * numPeers);
    const peer = peers[peerIdx];
    const action = rand();

    if (action < 0.65) {
      // 65%: Insert text
      const blocks = peer.tree.getFlattenedBlocks();
      if (blocks.length > 0) {
        const b = blocks[Math.floor(rand() * blocks.length)];
        const textCrdt = peer.tree.getTextCRDT(b.id);
        const currentLen = textCrdt ? textCrdt.length : 0;
        const pos = currentLen > 0 ? Math.floor(rand() * currentLen) : 0;
        const char = String.fromCharCode(65 + Math.floor(rand() * 26));
        peer.insertText(b.id, pos, char);
      }
    } else if (action < 0.85) {
      // 20%: Delete text
      const blocks = peer.tree.getFlattenedBlocks();
      if (blocks.length > 0) {
        const b = blocks[Math.floor(rand() * blocks.length)];
        const textCrdt = peer.tree.getTextCRDT(b.id);
        if (textCrdt && textCrdt.length > 0) {
          const pos = Math.floor(rand() * textCrdt.length);
          peer.deleteText(b.id, pos, 1);
        }
      }
    } else if (action < 0.95) {
      // 10%: Create block in document sequence
      const blocks = peer.tree.getFlattenedBlocks();
      const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      const orderKey = generateOrderKeyBetween(lastBlock ? lastBlock.orderKey : null, null);
      peer.createBlock(null, 'paragraph', orderKey);
    }

    // 2. Deliver queued messages ready for currentStep
    const readyIndices: number[] = [];
    for (let q = 0; q < networkQueue.length; q++) {
      if (networkQueue[q].deliverAtStep <= currentStep) {
        readyIndices.push(q);
      }
    }

    // Deliver with pseudo-random shuffle to simulate out-of-order delivery
    readyIndices.sort(() => rand() - 0.5);
    for (const qIdx of readyIndices) {
      const msg = networkQueue[qIdx];
      peers[msg.targetPeerIndex].applyOperation(msg.op);
    }

    // Remove delivered messages
    for (let q = networkQueue.length - 1; q >= 0; q--) {
      if (networkQueue[q].deliverAtStep <= currentStep) {
        networkQueue.splice(q, 1);
      }
    }
  }

  // 3. Network Flush: Deliver all remaining messages (simulating partition healing)
  // Shuffle to simulate chaotic delivery of stranded packets
  networkQueue.sort(() => rand() - 0.5);
  for (const msg of networkQueue) {
    peers[msg.targetPeerIndex].applyOperation(msg.op);
  }

  // Final drain on all peers to apply any remaining interdependent queued messages
  for (let r = 0; r < 5; r++) {
    for (const peer of peers) {
      peer.drainUnapplied();
    }
  }

  // 4. Verification: All peers MUST converge to the EXACT same plain text and state!
  const referenceText = peers[0].toPlainText();
  for (let i = 1; i < numPeers; i++) {
    const peerText = peers[i].toPlainText();
    assert.strictEqual(
      peerText,
      referenceText,
      `SEC Failure: Peer ${i} text diverges from Peer 0 after 10,000 operations!`
    );
  }

  assert.ok(referenceText.length >= 0, 'Simulation completed successfully with converged text');
});
