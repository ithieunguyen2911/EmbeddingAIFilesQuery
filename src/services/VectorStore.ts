export interface VectorEntry {
  text: string;
  embedding: number[];
  metadata?: any;
}

export interface ProjectVectorData {
  projectId: string;
  fileHash: string;
  entries: VectorEntry[];
}

export class VectorStore {
  private entries: VectorEntry[] = [];
  private projectEntries: Map<string, Map<string, VectorEntry[]>> = new Map(); // projectId -> fileHash -> entries
  private currentProjectId: string | null = null;

  constructor() {}

  /**
   * Sets the current project context.
   */
  setCurrentProject(projectId: string) {
    this.currentProjectId = projectId;
    if (!this.projectEntries.has(projectId)) {
      this.projectEntries.set(projectId, new Map());
    }
  }

  /**
   * Adds entries to the current project/file.
   */
  addEntries(entries: VectorEntry[], fileHash?: string) {
    if (this.currentProjectId && fileHash) {
      // Add to project-specific storage
      const projectMap = this.projectEntries.get(this.currentProjectId)!;
      projectMap.set(fileHash, entries);
    }
    // Also keep in memory for quick access
    this.entries.push(...entries);
  }

  /**
   * Loads entries from a specific project file.
   */
  loadProjectFileEntries(projectId: string, fileHash: string, entries: VectorEntry[]) {
    this.setCurrentProject(projectId);
    if (!this.projectEntries.has(projectId)) {
      this.projectEntries.set(projectId, new Map());
    }
    this.projectEntries.get(projectId)!.set(fileHash, entries);
    this.entries.push(...entries);
  }

  /**
   * Gets entries for a specific project file.
   */
  getProjectFileEntries(projectId: string, fileHash: string): VectorEntry[] {
    const projectMap = this.projectEntries.get(projectId);
    return projectMap ? projectMap.get(fileHash) || [] : [];
  }

  /**
   * Gets all entries for a project.
   */
  getProjectEntries(projectId: string): VectorEntry[] {
    const projectMap = this.projectEntries.get(projectId);
    if (!projectMap) return [];
    
    const allEntries: VectorEntry[] = [];
    projectMap.forEach(entries => {
      allEntries.push(...entries);
    });
    return allEntries;
  }

  /**
   * Clears entries for a specific project file.
   */
  clearProjectFile(projectId: string, fileHash: string) {
    const projectMap = this.projectEntries.get(projectId);
    if (projectMap) {
      projectMap.delete(fileHash);
    }
    // Also clear from memory entries if it's the current context
    if (this.currentProjectId === projectId && fileHash === this.entries[0]?.metadata?.fileHash) {
      this.entries = [];
    }
  }

  /**
   * Clears all entries for a project.
   */
  clearProject(projectId: string) {
    this.projectEntries.delete(projectId);
    if (this.currentProjectId === projectId) {
      this.entries = [];
      this.currentProjectId = null;
    }
  }

  /**
   * Clears the store.
   */
  clear() {
    this.entries = [];
    this.currentProjectId = null;
  }

  /**
   * Performs a similarity search across all entries in scope.
   */
  search(queryEmbedding: number[], topK: number = 5): VectorEntry[] {
    // Use all entries (could be from current project or global)
    const entriesToSearch = this.entries.length > 0 ? this.entries : this.getCurrentProjectEntries();
    
    const scores = entriesToSearch.map((entry) => ({
      entry,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((s) => s.entry);
  }

  /**
   * Gets current project entries for search.
   */
  private getCurrentProjectEntries(): VectorEntry[] {
    if (!this.currentProjectId) return [];
    return this.getProjectEntries(this.currentProjectId);
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
