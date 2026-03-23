export interface VectorEntry {
  text: string;
  embedding: number[];
  metadata?: any;
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  constructor() {}

  /**
   * Adds entries to the store.
   */
  addEntries(entries: VectorEntry[]) {
    this.entries.push(...entries);
  }

  /**
   * Clears the store.
   */
  clear() {
    this.entries = [];
  }

  /**
   * Performs a similarity search.
   */
  search(queryEmbedding: number[], topK: number = 5): VectorEntry[] {
    const scores = this.entries.map((entry) => ({
      entry,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((s) => s.entry);
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
