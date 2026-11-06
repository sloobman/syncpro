import test from 'node:test';
import assert from 'node:assert';
import {
  canonicalJson,
  computeCommitHash,
  MerkleDAG,
  computeCharacterDiff,
  groupDiffItems,
  ThreeWayMergeEngine,
  type MerkleCommit,
  type DeltaLoader,
} from '../index';
import { CRDTDocument } from '../../crdt/crdt-doc';

test('canonicalJson recursively sorts keys for deterministic hashing', () => {
  const obj1 = { z: 1, a: 2, m: { b: 3, a: 4 } };
  const obj2 = { a: 2, m: { a: 4, b: 3 }, z: 1 };

  assert.strictEqual(canonicalJson(obj1), canonicalJson(obj2));
  assert.strictEqual(canonicalJson(obj1), '{"a":2,"m":{"a":4,"b":3},"z":1}');
});

test('computeCommitHash generates valid 64-char SHA-256 hex string', async () => {
  const hash = await computeCommitHash({
    documentId: 'doc_1',
    parents: [],
    branch: 'main',
    author: { userId: 'usr_1', name: 'Alice' },
    timestamp: 1700000000,
    message: 'Initial commit',
    deltaSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    stateVector: { '1': 10 },
  });

  assert.strictEqual(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('MerkleDAG finds Lowest Common Ancestor (LCA) in branching history', () => {
  const dag = new MerkleDAG();

  // Graph topology:
  // C1 (root) -> C2 -> C3 (main)
  //          \-> C4 -> C5 (feature)
  const c1: MerkleCommit = {
    id: 'c1',
    documentId: 'doc_1',
    parents: [],
    branch: 'main',
    author: { userId: 'u1', name: 'Alice' },
    timestamp: 100,
    message: 'Root',
    deltaSha256: '',
    stateVector: {},
    crdtDeltaStoragePath: '',
  };

  const c2: MerkleCommit = { ...c1, id: 'c2', parents: ['c1'] };
  const c3: MerkleCommit = { ...c1, id: 'c3', parents: ['c2'] };
  const c4: MerkleCommit = { ...c1, id: 'c4', parents: ['c1'], branch: 'feature' };
  const c5: MerkleCommit = { ...c1, id: 'c5', parents: ['c4'], branch: 'feature' };

  dag.addCommit(c1);
  dag.addCommit(c2);
  dag.addCommit(c3);
  dag.addCommit(c4);
  dag.addCommit(c5);

  const lca = dag.findLCA('c3', 'c5');
  assert.strictEqual(lca, 'c1', 'LCA between c3 and c5 should be c1');

  // Fast forward LCA
  assert.strictEqual(dag.findLCA('c1', 'c3'), 'c1');
});

test('ThreeWayMergeEngine merges divergent branches conflict-free', async () => {
  const dag = new MerkleDAG();
  const storage = new Map<string, Uint8Array>();

  const loader: DeltaLoader = {
    async loadDelta(path: string) {
      const data = storage.get(path);
      if (!data) throw new Error(`Not found: ${path}`);
      return data;
    },
  };

  // Base state at LCA: root paragraph "Hello"
  const baseDoc = new CRDTDocument(1);
  const block = baseDoc.createBlock(null, 'paragraph', 'm');
  baseDoc.insertText(block.id, 0, 'Hello');
  const baseDelta = baseDoc.encodeFullState();
  storage.set('commits/doc_1/c_base.bin', baseDelta);

  const cBase: MerkleCommit = {
    id: 'c_base',
    documentId: 'doc_1',
    parents: [],
    branch: 'main',
    author: { userId: 'u1', name: 'Alice' },
    timestamp: 100,
    message: 'Base commit',
    deltaSha256: 'hash_base',
    stateVector: baseDoc.stateVector.toJSON(),
    crdtDeltaStoragePath: 'commits/doc_1/c_base.bin',
  };
  dag.addCommit(cBase);

  // Branch A (main): Alice appends " World"
  const docA = new CRDTDocument(1);
  docA.applyDelta(baseDelta);
  docA.insertText(block.id, 5, ' World');
  const deltaA = docA.encodeFullState();
  storage.set('commits/doc_1/c_main.bin', deltaA);

  const cMain: MerkleCommit = {
    id: 'c_main',
    documentId: 'doc_1',
    parents: ['c_base'],
    branch: 'main',
    author: { userId: 'u1', name: 'Alice' },
    timestamp: 200,
    message: 'Alice edits',
    deltaSha256: 'hash_a',
    stateVector: docA.stateVector.toJSON(),
    crdtDeltaStoragePath: 'commits/doc_1/c_main.bin',
  };
  dag.addCommit(cMain);

  // Branch B (feature): Bob prepends "Awesome "
  const docB = new CRDTDocument(2);
  docB.applyDelta(baseDelta);
  docB.insertText(block.id, 0, 'Awesome ');
  const deltaB = docB.encodeFullState();
  storage.set('commits/doc_1/c_feature.bin', deltaB);

  const cFeature: MerkleCommit = {
    id: 'c_feature',
    documentId: 'doc_1',
    parents: ['c_base'],
    branch: 'feature',
    author: { userId: 'u2', name: 'Bob' },
    timestamp: 210,
    message: 'Bob edits',
    deltaSha256: 'hash_b',
    stateVector: docB.stateVector.toJSON(),
    crdtDeltaStoragePath: 'commits/doc_1/c_feature.bin',
  };
  dag.addCommit(cFeature);

  // Perform 3-Way Merge
  const mergeEngine = new ThreeWayMergeEngine(dag, loader);
  const result = await mergeEngine.mergeBranches(
    'doc_1',
    'main',
    'feature',
    'c_main',
    'c_feature',
    { userId: 'u3', name: 'Merger Bot' }
  );

  assert.strictEqual(result.isFastForward, false);
  assert.strictEqual(result.mergeCommit.parents.length, 2);
  assert.deepStrictEqual(result.mergeCommit.parents, ['c_main', 'c_feature']);

  // No conflict markers, text unified seamlessly!
  assert.ok(!result.mergedPlainText.includes('<<<<<<<'));
  assert.ok(result.mergedPlainText.includes('Hello'));
  assert.ok(result.mergedPlainText.includes('World'));
  assert.ok(result.mergedPlainText.includes('Awesome'));
});

test('computeCharacterDiff produces accurate per-character diff', () => {
  const oldText = 'Hello World';
  const newText = 'Hello Beautiful World';

  const diffItems = computeCharacterDiff(oldText, newText, 'Alice');
  const groups = groupDiffItems(diffItems);

  assert.strictEqual(groups.length, 3);
  assert.strictEqual(groups[0].type, 'unchanged');
  assert.strictEqual(groups[0].text, 'Hello');

  assert.strictEqual(groups[1].type, 'added');
  assert.strictEqual(groups[1].text, ' Beautiful');

  assert.strictEqual(groups[2].type, 'unchanged');
  assert.strictEqual(groups[2].text, ' World');
});
