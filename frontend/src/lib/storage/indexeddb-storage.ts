export interface PendingDelta {
  readonly id: number;
  readonly docId: string;
  readonly delta: Uint8Array;
  readonly createdAt: number;
}

export class IndexedDBStorageProvider {
  private dbName = 'syncpro_offline_v1';
  private memorySnapshots: Map<string, Uint8Array> = new Map();
  private memoryPending: Map<string, PendingDelta[]> = new Map();
  private nextPendingId = 1;

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private async openDB(): Promise<IDBDatabase | null> {
    if (!this.isBrowser()) return null;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'docId' });
        }
        if (!db.objectStoreNames.contains('pending_deltas')) {
          const store = db.createObjectStore('pending_deltas', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('docId', 'docId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async loadDocument(docId: string): Promise<Uint8Array | null> {
    const db = await this.openDB();
    if (!db) {
      return this.memorySnapshots.get(docId) ?? null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.get(docId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.snapshot : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSnapshot(docId: string, snapshot: Uint8Array): Promise<void> {
    const db = await this.openDB();
    if (!db) {
      this.memorySnapshots.set(docId, snapshot);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.put({ docId, snapshot, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async appendPendingDelta(docId: string, delta: Uint8Array): Promise<number> {
    const db = await this.openDB();
    if (!db) {
      const list = this.memoryPending.get(docId) ?? [];
      const item: PendingDelta = {
        id: this.nextPendingId++,
        docId,
        delta,
        createdAt: Date.now(),
      };
      list.push(item);
      this.memoryPending.set(docId, list);
      return item.id;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_deltas', 'readwrite');
      const store = tx.objectStore('pending_deltas');
      const request = store.add({ docId, delta, createdAt: Date.now() });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingDeltas(docId: string): Promise<PendingDelta[]> {
    const db = await this.openDB();
    if (!db) {
      return this.memoryPending.get(docId) ?? [];
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_deltas', 'readonly');
      const store = tx.objectStore('pending_deltas');
      const index = store.index('docId');
      const request = index.getAll(docId);

      request.onsuccess = () => resolve(request.result as PendingDelta[]);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingDeltas(docId: string, upToId?: number): Promise<void> {
    const db = await this.openDB();
    if (!db) {
      let list = this.memoryPending.get(docId) ?? [];
      if (upToId !== undefined) {
        list = list.filter((item) => item.id > upToId);
      } else {
        list = [];
      }
      this.memoryPending.set(docId, list);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_deltas', 'readwrite');
      const store = tx.objectStore('pending_deltas');
      const index = store.index('docId');
      const request = index.openCursor(IDBKeyRange.only(docId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const item = cursor.value as PendingDelta;
          if (upToId === undefined || item.id <= upToId) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new IndexedDBStorageProvider();
