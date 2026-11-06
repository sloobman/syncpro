import { canonicalJson } from './canonical-json';
import type { CommitAuthor } from './types';

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = data;
  }

  // Cross-platform Web Crypto API (supported in Node 19+ and all modern browsers)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as ArrayBufferView<ArrayBuffer>);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CommitHashPayload {
  readonly documentId: string;
  readonly parents: string[];
  readonly branch: string;
  readonly author: CommitAuthor;
  readonly timestamp: number;
  readonly message: string;
  readonly deltaSha256: string;
  readonly stateVector: Record<string, number>;
}

export async function computeCommitHash(payload: CommitHashPayload): Promise<string> {
  const canonicalString = canonicalJson(payload);
  return sha256Hex(canonicalString);
}
