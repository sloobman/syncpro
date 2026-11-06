import type { ID } from './types';
import { createID } from './id';

export class LamportClock {
  private _clientId: number;
  private _time: number;

  constructor(clientId: number, initialTime = 0) {
    this._clientId = clientId;
    this._time = initialTime;
  }

  get clientId(): number {
    return this._clientId;
  }

  get time(): number {
    return this._time;
  }

  tick(): ID {
    this._time += 1;
    return createID(this._clientId, this._time);
  }

  witness(remoteTime: number): void {
    this._time = Math.max(this._time, remoteTime);
  }

  peekNext(): ID {
    return createID(this._clientId, this._time + 1);
  }
}
