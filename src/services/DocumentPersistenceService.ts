/**
 * Document Persistence Service
 * Save and restore documents using IndexedDB
 */

export interface PersistedDocument {
  id: string;
  groupId: string;
  name: string;
  fileSize: number;
  fileHash: string;
  uploadedAt: string;
  fileType: string;
  fileBlob: Blob;
  metadata?: Record<string, any>;
}

const DB_NAME = "EmbeddingAIDB";
const DB_VERSION = 1;
const STORE_NAME = "documents";

export class DocumentPersistenceService {
  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  static async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ IndexedDB initialized");
        resolve();
      };
    });
  }

  /**
   * Save document to IndexedDB
   */
  static async saveDocument(
    groupId: string,
    documentId: string,
    name: string,
    fileBlob: Blob,
    fileHash: string,
    fileSize: number,
    fileType: string
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const document: PersistedDocument = {
        id: documentId,
        groupId,
        name,
        fileSize,
        fileHash,
        uploadedAt: new Date().toISOString(),
        fileType,
        fileBlob
      };

      const request = store.put(document);

      request.onsuccess = () => {
        console.log(`✅ Document saved: ${name}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save document: ${name}`));
      };
    });
  }

  /**
   * Get document from IndexedDB
   */
  static async getDocument(documentId: string): Promise<PersistedDocument | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(documentId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve document"));
      };
    });
  }

  /**
   * Get all documents for a group
   */
  static async getGroupDocuments(groupId: string): Promise<PersistedDocument[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const documents = (request.result || []).filter(
          (doc) => doc.groupId === groupId
        );
        resolve(documents);
      };

      request.onerror = () => {
        reject(new Error("Failed to retrieve documents"));
      };
    });
  }

  /**
   * Delete document from IndexedDB
   */
  static async deleteDocument(documentId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onsuccess = () => {
        console.log(`✅ Document deleted: ${documentId}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to delete document"));
      };
    });
  }

  /**
   * Delete all documents for a group
   */
  static async deleteGroupDocuments(groupId: string): Promise<void> {
    const documents = await this.getGroupDocuments(groupId);
    for (const doc of documents) {
      await this.deleteDocument(doc.id);
    }
  }

  /**
   * Clear entire database
   */
  static async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("✅ Database cleared");
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to clear database"));
      };
    });
  }

  /**
   * Get storage usage
   */
  static async getStorageStats(): Promise<{ used: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}
