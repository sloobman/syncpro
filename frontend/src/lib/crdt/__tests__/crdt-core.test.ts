import test from 'node:test';
import assert from 'node:assert';
import {
  LamportClock,
  StateVector,
  TextCRDT,
  TreeCRDT,
  BinaryCodec,
  CRDTDocument,
  compareIDs,
  createID,
  equalIDs,
} from '../index';

test('LamportClock ticks monotonically and witnesses remote clocks', () => {
  const clock = new LamportClock(1);
  const id1 = clock.tick();
  assert.strictEqual(id1.clientId, 1);
  assert.strictEqual(id1.clock, 1);

  const id2 = clock.tick();
  assert.strictEqual(id2.clock, 2);

  clock.witness(10);
  assert.strictEqual(clock.time, 10);

  const id3 = clock.tick();
  assert.strictEqual(id3.clock, 11);
});

test('ID strict total ordering', () => {
  const a = createID(1, 5);
  const b = createID(2, 5);
  const c = createID(1, 6);

  // Equal clock, compare clientId
  assert.strictEqual(compareIDs(a, b), -1);
  assert.strictEqual(compareIDs(b, a), 1);

  // Different clock
  assert.strictEqual(compareIDs(a, c), -1);
  assert.strictEqual(compareIDs(c, a), 1);

  assert.strictEqual(equalIDs(a, createID(1, 5)), true);
  assert.strictEqual(equalIDs(a, b), false);
});

test('StateVector tracking, witness and diff', () => {
  const sv1 = new StateVector();
  sv1.set(1, 10);
  sv1.set(2, 5);

  assert.strictEqual(sv1.get(1), 10);
  assert.strictEqual(sv1.get(2), 5);
  assert.strictEqual(sv1.get(3), 0);

  assert.strictEqual(sv1.has(createID(1, 8)), true);
  assert.strictEqual(sv1.has(createID(1, 12)), false);

  const sv2 = new StateVector();
  sv2.set(1, 5);
  sv2.set(2, 8);
  sv2.set(3, 2);

  const diff = sv2.diff(sv1); // what sv2 has that sv1 does not
  assert.strictEqual(diff.get(2), 8);
  assert.strictEqual(diff.get(3), 2);
  assert.strictEqual(diff.get(1), 0);

  sv1.merge(sv2);
  assert.strictEqual(sv1.get(1), 10);
  assert.strictEqual(sv1.get(2), 8);
  assert.strictEqual(sv1.get(3), 2);
});

test('TextCRDT YATA / Fugue concurrent insertions converge deterministically', () => {
  // Alice types 'AB'
  const alice = new TextCRDT();
  const bob = new TextCRDT();

  const idA1 = createID(1, 1);
  const idA2 = createID(1, 2);
  alice.integrate({ id: idA1, originLeft: null, originRight: null, content: 'A', isDeleted: false });
  alice.integrate({ id: idA2, originLeft: idA1, originRight: null, content: 'C', isDeleted: false });

  // Sync to Bob
  bob.integrate({ id: idA1, originLeft: null, originRight: null, content: 'A', isDeleted: false });
  bob.integrate({ id: idA2, originLeft: idA1, originRight: null, content: 'C', isDeleted: false });

  // Now concurrently between A and C:
  // Alice inserts 'B1' (id: 1:3)
  // Bob inserts 'B2' (id: 2:1)
  const opAlice = { id: createID(1, 3), originLeft: idA1, originRight: idA2, content: '1', isDeleted: false };
  const opBob = { id: createID(2, 1), originLeft: idA1, originRight: idA2, content: '2', isDeleted: false };

  alice.integrate(opAlice);
  alice.integrate(opBob);

  bob.integrate(opBob);
  bob.integrate(opAlice);

  assert.strictEqual(alice.toString(), bob.toString());
  assert.strictEqual(alice.toString(), 'A1C2');
});

test('TreeCRDT prevents cycles and maintains hierarchy', () => {
  const tree = new TreeCRDT();

  const rootBlock = tree.createBlock(createID(1, 1), null, 'paragraph', 'a');
  const childA = tree.createBlock(createID(1, 2), rootBlock.id, 'paragraph', 'b');
  const childB = tree.createBlock(createID(1, 3), childA.id, 'paragraph', 'c');

  // Hierarchy: root -> childA -> childB
  assert.strictEqual(tree.isAncestor(rootBlock.id, childB.id), true);
  assert.strictEqual(tree.isAncestor(childB.id, rootBlock.id), false);

  // Attempt to move rootBlock under childB (would create a cycle!)
  const cycleOp = {
    id: createID(1, 4),
    blockId: rootBlock.id,
    newParentId: childB.id,
    orderKey: 'd',
  };

  const moved = tree.applyMove(cycleOp);
  assert.strictEqual(moved, false, 'Cycle move must be rejected');
  assert.strictEqual(rootBlock.parentId, null);
});

test('BinaryCodec encodes and decodes StateVector and operations accurately', () => {
  const sv = new StateVector();
  sv.set(42, 100);
  sv.set(17, 250);

  const encodedSV = BinaryCodec.encodeStateVector(sv);
  const decodedSV = BinaryCodec.decodeStateVector(encodedSV);

  assert.strictEqual(decodedSV.get(42), 100);
  assert.strictEqual(decodedSV.get(17), 250);

  const doc = new CRDTDocument(1);
  const block = doc.createBlock(null, 'heading1');
  doc.insertText(block.id, 0, 'Hello World');

  const snapshotBytes = doc.encodeFullState();
  assert.ok(snapshotBytes.length > 0);

  const doc2 = new CRDTDocument(2);
  doc2.applyDelta(snapshotBytes);

  assert.strictEqual(doc2.toPlainText(), 'Hello World');
});

test('CRDTDocument insertBlockAfter(null) appends to end of document', () => {
  const doc = new CRDTDocument(1);
  const b1 = doc.insertBlockAfter(null, 'heading1', 'Title');
  const b2 = doc.insertBlockAfter(b1.id, 'paragraph', 'First paragraph');
  
  // When inserting with null afterBlockId, it must append to the end, NOT prepend
  const b3 = doc.insertBlockAfter(null, 'paragraph', 'Appended paragraph');
  
  const roots = doc.tree.getRootBlocks();
  assert.strictEqual(roots.length, 3);
  assert.strictEqual(equalIDs(roots[0].id, b1.id), true, 'First block remains Title');
  assert.strictEqual(equalIDs(roots[1].id, b2.id), true, 'Second block remains First paragraph');
  assert.strictEqual(equalIDs(roots[2].id, b3.id), true, 'Third block is Appended paragraph at the end');

  // prependBlock explicitly prepends before the first block
  const b0 = doc.prependBlock('heading2', 'Super header');
  const rootsAfterPrepend = doc.tree.getRootBlocks();
  assert.strictEqual(rootsAfterPrepend.length, 4);
  assert.strictEqual(equalIDs(rootsAfterPrepend[0].id, b0.id), true, 'Prepended block is at index 0');
});
