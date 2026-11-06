import type { ID } from './types';

export class StateVector {
  private map: Map<number, number>;

  constructor(entries?: Iterable<[number, number]>) {
    this.map = new Map(entries);
  }

  get(clientId: number): number {
    return this.map.get(clientId) ?? 0;
  }

  set(clientId: number, clock: number): void {
    const current = this.get(clientId);
    if (clock > current) {
      this.map.set(clientId, clock);
    }
  }

  witness(id: ID): void {
    this.set(id.clientId, id.clock);
  }

  has(id: ID): boolean {
    return this.get(id.clientId) >= id.clock;
  }

  merge(other: StateVector): void {
    for (const [clientId, clock] of other.entries()) {
      this.set(clientId, clock);
    }
  }

  diff(other: StateVector): StateVector {
    // Returns missing entries that this vector has but other doesn't
    const missing = new StateVector();
    for (const [clientId, clock] of this.entries()) {
      const otherClock = other.get(clientId);
      if (clock > otherClock) {
        missing.set(clientId, clock);
      }
    }
    return missing;
  }

  entries(): IterableIterator<[number, number]> {
    return this.map.entries();
  }

  clone(): StateVector {
    return new StateVector(this.map);
  }

  equals(other: StateVector): boolean {
    if (this.map.size !== other.map.size) return false;
    for (const [clientId, clock] of this.map.entries()) {
      if (other.get(clientId) !== clock) return false;
    }
    return true;
  }

  toJSON(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const [clientId, clock] of this.map.entries()) {
      obj[clientId.toString()] = clock;
    }
    return obj;
  }

  static fromJSON(json: Record<string, number>): StateVector {
    const sv = new StateVector();
    for (const [key, value] of Object.entries(json)) {
      sv.set(Number.parseInt(key, 10), value);
    }
    return sv;
  }
}
