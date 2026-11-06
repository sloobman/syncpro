import type { ID } from './types';

export function createID(clientId: number, clock: number): ID {
  return { clientId, clock };
}

export function equalIDs(a: ID | null | undefined, b: ID | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.clientId === b.clientId && a.clock === b.clock;
}

export function compareIDs(a: ID, b: ID): number {
  if (a.clock < b.clock) return -1;
  if (a.clock > b.clock) return 1;
  if (a.clientId < b.clientId) return -1;
  if (a.clientId > b.clientId) return 1;
  return 0;
}

export function formatID(id: ID): string {
  return `${id.clientId}:${id.clock}`;
}

export function parseID(str: string): ID {
  const parts = str.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid ID format: "${str}"`);
  }
  return {
    clientId: Number.parseInt(parts[0], 10),
    clock: Number.parseInt(parts[1], 10),
  };
}
