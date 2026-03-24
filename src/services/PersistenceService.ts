import { VectorEntry } from './VectorStore';

/**
 * Manages persistence of vector embeddings to the browser's IndexedDB.
 * Since browser can't access the file system directly, we use IndexedDB
 * which acts as a persistent storage similar to a temp folder.
 */
export class PersistenceService {
  private dbName = 'EmbeddingStorage';
  private storeName = 'vectors';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDb();
  }

  /**
   * Initializes the IndexedDB database.
   */
  private async initDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Saves vector entries for a specific project file.
   */
  async saveVectors(
    projectId: string,
    fileHash: string,
    entries: VectorEntry[]
  ): Promise<boolean> {
    if (!this.db) await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const storageKey = `${projectId}_${fileHash}`;
      const data = {
        id: storageKey,
        projectId,
        fileHash,
        entries,
        savedAt: new Date().toISOString(),
      };

      const request = store.put(data);

      request.onerror = () => {
        console.error('Failed to save vectors');
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Vectors saved for ${storageKey}`);
        resolve(true);
      };
    });
  }

  /**
   * Loads vector entries for a specific project file.
   */
  async loadVectors(projectId: string, fileHash: string): Promise<VectorEntry[] | null> {
    if (!this.db) await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const storageKey = `${projectId}_${fileHash}`;
      const request = store.get(storageKey);

      request.onerror = () => {
        console.error('Failed to load vectors');
        reject(request.error);
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.entries : null);
      };
    });
  }

  /**
   * Gets all vector entries for a project.
   */
  async getProjectVectors(projectId: string): Promise<Map<string, VectorEntry[]>> {
    if (!this.db) await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to get project vectors');
        reject(request.error);
      };

      request.onsuccess = () => {
        const results = request.result;
        const projectVectors = new Map<string, VectorEntry[]>();

        results.forEach((item: any) => {
          if (item.projectId === projectId) {
            projectVectors.set(item.fileHash, item.entries);
          }
        });

        resolve(projectVectors);
      };
    });
  }

  /**
   * Deletes vector entries for a specific project file.
   */
  async deleteVectors(projectId: string, fileHash: string): Promise<boolean> {
    if (!this.db) await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const storageKey = `${projectId}_${fileHash}`;
      const request = store.delete(storageKey);

      request.onerror = () => {
        console.error('Failed to delete vectors');
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Vectors deleted for ${storageKey}`);
        resolve(true);
      };
    });
  }

  /**
   * Deletes all vector entries for a project.
   */
  async deleteProjectVectors(projectId: string): Promise<boolean> {
    if (!this.db) await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to get vectors for deletion');
        reject(request.error);
      };

      request.onsuccess = () => {
        const results = request.result;
        const deleteRequests: IDBRequest[] = [];

        results.forEach((item: any) => {
          if (item.projectId === projectId) {
            deleteRequests.push(store.delete(item.id));
          }
        });

        if (deleteRequests.length === 0) {
          resolve(true);
          return;
        }

        let completed = 0;
        deleteRequests.forEach((deleteReq) => {
          deleteReq.onsuccess = () => {
            completed++;
            if (completed === deleteRequests.length) {
              console.log(`All vectors deleted for project ${projectId}`);
              resolve(true);
            }
          };
        });
      };
    });
  }

  /**
   * Gets storage statistics for a project.
   */
  async getProjectStorageStats(projectId: string): Promise<{
    filesCount: number;
    totalSize: number;
  }> {
    const vectors = await this.getProjectVectors(projectId);
    let totalSize = 0;

    vectors.forEach((entries) => {
      entries.forEach((entry) => {
        // Estimate size in bytes
        totalSize += JSON.stringify(entry).length;
      });
    });

    return {
      filesCount: vectors.size,
      totalSize,
    };
  }

  /**
   * Exports all vectors for a project as JSON.
   */
  async exportProjectVectors(projectId: string): Promise<string> {
    const vectors = await this.getProjectVectors(projectId);
    const data = {
      projectId,
      exportedAt: new Date().toISOString(),
      files: Array.from(vectors.entries()).map(([fileHash, entries]) => ({
        fileHash,
        entriesCount: entries.length,
        entries,
      })),
    };
    return JSON.stringify(data, null, 2);
  }
}
