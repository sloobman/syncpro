import type { ID } from '../crdt/types';

export interface UserPresence {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly avatarUrl?: string | null;
}

export interface CursorPosition {
  readonly blockId: ID;
  readonly offset: number;
}

export interface TextSelection {
  readonly anchor: { blockId: ID; offset: number };
  readonly head: { blockId: ID; offset: number };
}

export interface AwarenessState {
  readonly clientId: number;
  readonly clock: number;
  readonly user: UserPresence | null;
  readonly cursor: CursorPosition | null;
  readonly selection: TextSelection | null;
  readonly lastSeenAt: number;
}

export type AwarenessListener = (states: Map<number, AwarenessState>) => void;

export class AwarenessBus {
  readonly clientId: number;
  private states: Map<number, AwarenessState> = new Map();
  private listeners: Set<AwarenessListener> = new Set();
  private localClock = 0;
  private sweeperInterval: ReturnType<typeof setInterval> | null = null;
  readonly ttlMs: number;

  constructor(clientId: number, ttlMs = 30000) {
    this.clientId = clientId;
    this.ttlMs = ttlMs;
    this.startSweeper();
  }

  private startSweeper(): void {
    if (typeof setInterval !== 'undefined') {
      this.sweeperInterval = setInterval(() => this.sweepExpired(), 5000);
    }
  }

  destroy(): void {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
      this.sweeperInterval = null;
    }
    this.listeners.clear();
  }

  onChange(listener: AwarenessListener): () => void {
    this.listeners.add(listener);
    listener(new Map(this.states));
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = new Map(this.states);
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  setLocalState(
    user: UserPresence | null,
    cursor: CursorPosition | null = null,
    selection: TextSelection | null = null
  ): AwarenessState {
    this.localClock += 1;
    const state: AwarenessState = {
      clientId: this.clientId,
      clock: this.localClock,
      user,
      cursor,
      selection,
      lastSeenAt: Date.now(),
    };

    if (user === null) {
      this.states.delete(this.clientId);
    } else {
      this.states.set(this.clientId, state);
    }

    this.notify();
    return state;
  }

  updateRemoteState(remoteState: AwarenessState): void {
    const current = this.states.get(remoteState.clientId);
    if (current && current.clock >= remoteState.clock) {
      return; // Stale message
    }

    if (remoteState.user === null) {
      this.states.delete(remoteState.clientId);
    } else {
      this.states.set(remoteState.clientId, {
        ...remoteState,
        lastSeenAt: Date.now(),
      });
    }

    this.notify();
  }

  sweepExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [clientId, state] of this.states.entries()) {
      if (clientId !== this.clientId && now - state.lastSeenAt > this.ttlMs) {
        this.states.delete(clientId);
        removed++;
      }
    }
    if (removed > 0) {
      this.notify();
    }
    return removed;
  }

  getAllStates(): AwarenessState[] {
    return Array.from(this.states.values());
  }

  getActiveUsers(): UserPresence[] {
    const users: UserPresence[] = [];
    for (const state of this.states.values()) {
      if (state.user) {
        users.push(state.user);
      }
    }
    return users;
  }
}
