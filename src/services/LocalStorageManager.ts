import { VectorEntry } from './VectorStore';
import { CacheService } from './CacheService';

export interface CachedDocument {
  fileName: string;
  fileHash: string;
  fileSize: number;
  uploadedAt: Date;
  processedAt: Date;
  chunks: number;
  entries: VectorEntry[];
  metadata: {
    pageImages?: string[];
    totalPages?: number;
  };
}

export class LocalStorageManager {
  private cacheService: CacheService;
  private storageLocation: string;
  private readonly CACHE_INDEX_KEY = 'document_cache_index';

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.storageLocation = process.env.REACT_APP_STORAGE_LOCATION || 
                           (typeof window !== 'undefined' ? localStorage.getItem('storage_location') || '/tmp' : '/tmp');
  }

  /**
   * Update storage location from .env
   */
  setStorageLocation(location: string): void {
    this.storageLocation = location;
    if (typeof window !== 'undefined') {
      localStorage.setItem('storage_location', location);
    }
  }

  /**
   * Get storage location
   */
  getStorageLocation(): string {
    return this.storageLocation;
  }

  /**
   * Save processed document to local storage cache
   * Note: This saves metadata in IndexedDB + localStorage for client-side persistence
   */
  async saveDocumentCache(
    fileName: string,
    fileHash: string,
    fileSize: number,
    entries: VectorEntry[],
    metadata?: { pageImages?: string[], totalPages?: number }
  ): Promise<void> {
    try {
      const cachedDoc: CachedDocument = {
        fileName,
        fileHash,
        fileSize,
        uploadedAt: new Date(),
        processedAt: new Date(),
        chunks: entries.length,
        entries,
        metadata: metadata || {}
      };

      // Save to browser cache
      this.cacheService.saveEntries(fileHash, fileName, entries);

      // Save metadata to localStorage
      this.saveMetadataToLocalStorage(cachedDoc);

      console.log(`✅ Document cached: ${fileName} (${entries.length} chunks)`);
    } catch (error) {
      console.error('Error saving document cache:', error);
    }
  }

  /**
   * Save metadata to browser localStorage
   */
  private saveMetadataToLocalStorage(cachedDoc: CachedDocument): void {
    if (typeof window === 'undefined') return;

    try {
      const index = this.getMetadataIndex();
      
      // Add or update document metadata
      const existingIndex = index.findIndex(d => d.fileHash === cachedDoc.fileHash);
      if (existingIndex >= 0) {
        index[existingIndex] = {
          fileName: cachedDoc.fileName,
          fileHash: cachedDoc.fileHash,
          fileSize: cachedDoc.fileSize,
          uploadedAt: cachedDoc.uploadedAt.toISOString(),
          processedAt: cachedDoc.processedAt.toISOString(),
          chunks: cachedDoc.chunks
        };
      } else {
        index.push({
          fileName: cachedDoc.fileName,
          fileHash: cachedDoc.fileHash,
          fileSize: cachedDoc.fileSize,
          uploadedAt: cachedDoc.uploadedAt.toISOString(),
          processedAt: cachedDoc.processedAt.toISOString(),
          chunks: cachedDoc.chunks
        });
      }

      // Keep only recent 20 documents
      if (index.length > 20) {
        index.shift();
      }

      localStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
      console.log(`📝 Metadata saved: ${index.length} documents in cache`);
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  }

  /**
   * Get cache metadata index from localStorage
   */
  private getMetadataIndex(): Array<{
    fileName: string;
    fileHash: string;
    fileSize: number;
    uploadedAt: string;
    processedAt: string;
    chunks: number;
  }> {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.CACHE_INDEX_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading metadata index:', error);
      return [];
    }
  }

  /**
   * Check if document is already cached
   */
  isDocumentCached(fileHash: string): boolean {
    const index = this.getMetadataIndex();
    return index.some(d => d.fileHash === fileHash);
  }

  /**
   * Get cached document metadata
   */
  getCachedDocumentMetadata(fileHash: string) {
    const index = this.getMetadataIndex();
    return index.find(d => d.fileHash === fileHash);
  }

  /**
   * Get all cached documents
   */
  getAllCachedDocuments() {
    return this.getMetadataIndex();
  }

  /**
   * Clear old cache (older than X days)
   */
  clearOldCache(daysOld: number = 30): void {
    if (typeof window === 'undefined') return;

    try {
      const index = this.getMetadataIndex();
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - daysOld * 24 * 60 * 60 * 1000);

      const filtered = index.filter(doc => {
        const docDate = new Date(doc.processedAt);
        return docDate > cutoffDate;
      });

      if (filtered.length < index.length) {
        localStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(filtered));
        console.log(`🧹 Cleared ${index.length - filtered.length} old documents`);
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const index = this.getMetadataIndex();
    return {
      totalDocuments: index.length,
      totalChunks: index.reduce((sum, doc) => sum + doc.chunks, 0),
      totalSize: index.reduce((sum, doc) => sum + doc.fileSize, 0),
      documents: index
    };
  }

  /**
   * Export cache data (for backup)
   */
  exportCacheData(): Blob {
    const stats = this.getCacheStats();
    const data = {
      exportDate: new Date().toISOString(),
      storageLocation: this.storageLocation,
      statistics: {
        totalDocuments: stats.totalDocuments,
        totalChunks: stats.totalChunks,
        totalSize: stats.totalSize
      },
      documents: stats.documents
    };

    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  /**
   * Log cache info to console
   */
  logCacheInfo(): void {
    const stats = this.getCacheStats();
    console.log('📊 Document Cache Statistics:');
    console.log(`  📁 Cached Documents: ${stats.totalDocuments}`);
    console.log(`  📄 Total Chunks: ${stats.totalChunks}`);
    console.log(`  💾 Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  📍 Storage Location: ${this.storageLocation}`);
    console.log('  Documents:', stats.documents);
  }
}
