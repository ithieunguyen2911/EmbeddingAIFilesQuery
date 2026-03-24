import { VectorEntry } from "./VectorStore";

interface CachedDocument {
  fileHash: string;
  fileName: string;
  entries: VectorEntry[];
  timestamp: number;
}

export class CacheService {
  private readonly STORAGE_KEY = 'embedding_cache';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Calculate file hash using SHA-256
   */
  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get cached embeddings for a file
   */
  getCachedEntries(fileHash: string): VectorEntry[] | null {
    try {
      const cache = this.getCache();
      const cached = cache.find(c => c.fileHash === fileHash);
      
      if (cached) {
        console.log(`Cache hit for file: ${cached.fileName}`);
        return cached.entries;
      }
      return null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Save embeddings to cache
   */
  saveEntries(fileHash: string, fileName: string, entries: VectorEntry[]): void {
    try {
      const cache = this.getCache();
      
      // Remove existing entry for this file
      const filteredCache = cache.filter(c => c.fileHash !== fileHash);
      
      // Add new entry
      const newEntry: CachedDocument = {
        fileHash,
        fileName,
        entries,
        timestamp: Date.now()
      };
      
      filteredCache.push(newEntry);
      
      // Check cache size and remove oldest entries if needed
      let totalSize = JSON.stringify(filteredCache).length;
      while (totalSize > this.MAX_CACHE_SIZE && filteredCache.length > 1) {
        filteredCache.sort((a, b) => a.timestamp - b.timestamp);
        filteredCache.shift();
        totalSize = JSON.stringify(filteredCache).length;
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredCache));
      console.log(`Cached embeddings for: ${fileName}`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Get all cached entries
   */
  private getCache(): CachedDocument[] {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error parsing cache:', error);
      return [];
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; size: string } {
    try {
      const cache = this.getCache();
      const sizeInBytes = JSON.stringify(cache).length;
      const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
      return { count: cache.length, size: `${sizeInMB} MB` };
    } catch (error) {
      return { count: 0, size: '0 MB' };
    }
  }
}
