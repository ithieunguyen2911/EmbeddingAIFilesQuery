import { GeminiService } from "./GeminiService";
import { VectorStore, VectorEntry } from "./VectorStore";
import { DocumentProcessor } from "./DocumentProcessor";
import { CacheService } from "./CacheService";
import { ProjectManager, Project, ProjectFile } from "./ProjectManager";
import { PersistenceService } from "./PersistenceService";
import { LocalStorageManager } from "./LocalStorageManager";
import { Citation } from "./CitationService";

export interface ChatResponse {
  answer: string;
  sources: { text: string; pageNumber?: number; image?: string }[];
  citations?: Citation[];
}

export class ChatEngine {
  private gemini: GeminiService;
  private vectorStore: VectorStore;
  private docProcessor: DocumentProcessor;
  private cacheService: CacheService;
  private projectManager: ProjectManager;
  private persistenceService: PersistenceService;
  private localStorageManager: LocalStorageManager;
  private currentFileHash: string = '';
  private currentProjectId: string | null = null;

  // Singleton instance
  private static instance: ChatEngine | null = null;

  constructor() {
    this.gemini = new GeminiService();
    this.vectorStore = new VectorStore();
    this.docProcessor = new DocumentProcessor();
    this.cacheService = new CacheService();
    this.projectManager = new ProjectManager();
    this.persistenceService = new PersistenceService();
    this.localStorageManager = new LocalStorageManager(this.cacheService);
  }

  /**
   * Get singleton instance of ChatEngine
   */
  static getInstance(): ChatEngine {
    if (!ChatEngine.instance) {
      ChatEngine.instance = new ChatEngine();
    }
    return ChatEngine.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    ChatEngine.instance = null;
  }

  // ============== PROJECT MANAGEMENT ==============

  /**
   * Creates a new project.
   */
  createProject(name: string, description?: string): Project {
    const project = this.projectManager.createProject(name, description);
    this.currentProjectId = project.id;
    this.vectorStore.setCurrentProject(project.id);
    return project;
  }

  /**
   * Gets all projects.
   */
  getAllProjects(): Project[] {
    return this.projectManager.getAllProjects();
  }

  /**
   * Gets a specific project.
   */
  getProject(projectId: string): Project | undefined {
    return this.projectManager.getProject(projectId);
  }

  /**
   * Sets the current project context.
   */
  setCurrentProject(projectId: string): boolean {
    if (this.projectManager.setCurrentProject(projectId)) {
      this.currentProjectId = projectId;
      this.vectorStore.setCurrentProject(projectId);
      return true;
    }
    return false;
  }

  /**
   * Gets the current project.
   */
  getCurrentProject(): Project | null {
    return this.projectManager.getCurrentProject();
  }

  /**
   * Deletes a project and its associated vectors.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    // Delete all vectors for this project
    await this.persistenceService.deleteProjectVectors(projectId);
    
    // Delete the project itself
    const deleted = this.projectManager.deleteProject(projectId);
    
    if (deleted && this.currentProjectId === projectId) {
      this.currentProjectId = null;
      this.vectorStore.clear();
    }
    
    return deleted;
  }

  /**
   * Updates project metadata.
   */
  updateProject(projectId: string, updates: { name?: string; description?: string }): boolean {
    return this.projectManager.updateProject(projectId, updates);
  }

  /**
   * Processes a file and prepares it for querying with caching.
   */
  async processFile(file: File): Promise<void> {
    try {
      // Auto-create default project if none exists
      if (!this.currentProjectId) {
        const existingProjects = this.projectManager.getAllProjects();
        if (existingProjects.length === 0) {
          this.createProject('Default Project', 'Default project for documents');
        } else {
          this.setCurrentProject(existingProjects[0].id);
        }
      }

      // Calculate file hash
      this.currentFileHash = await this.cacheService.calculateFileHash(file);
      
      // Check local storage cache first
      if (this.localStorageManager.isDocumentCached(this.currentFileHash)) {
        console.log(`♻️ Document found in cache: ${file.name}`);
        const cachedMetadata = this.localStorageManager.getCachedDocumentMetadata(this.currentFileHash);
        if (cachedMetadata) {
          console.log(`  ⏱️ Previously processed on: ${new Date(cachedMetadata.processedAt).toLocaleString()}`);
          console.log(`  📊 Chunks: ${cachedMetadata.chunks}`);
        }
      }
      
      // Try to load from persistence first
      const persistedEntries = await this.persistenceService.loadVectors(this.currentProjectId!, this.currentFileHash);
      if (persistedEntries) {
        console.log('✅ Loading vectors from IndexedDB storage...');
        this.vectorStore.loadProjectFileEntries(this.currentProjectId!, this.currentFileHash, persistedEntries);
        return;
      }
      
      // Check cache 
      const cachedEntries = this.cacheService.getCachedEntries(this.currentFileHash);
      if (cachedEntries) {
        console.log('✅ Loading from memory cache...');
        this.vectorStore.addEntries(cachedEntries, this.currentFileHash);
        // Save to persistence for future use
        await this.persistenceService.saveVectors(this.currentProjectId!, this.currentFileHash, cachedEntries);
        return;
      }

      // If not cached, process the file
      console.log('🔄 Processing file and creating embeddings...');
      const { chunks } = await this.docProcessor.process(file);

      if (!chunks || chunks.length === 0) {
        throw new Error('No text chunks could be extracted from the file.');
      }

      // Embed chunks in batches
      const texts = chunks.map(c => c.text);
      const embeddings = await this.gemini.embedBatch(texts);

      if (!embeddings || embeddings.length === 0) {
        throw new Error('Failed to generate embeddings for the document.');
      }

      const entries: VectorEntry[] = chunks.map((chunk, i) => ({
        text: chunk.text,
        embedding: embeddings[i],
        metadata: { 
          fileName: file.name, 
          fileHash: this.currentFileHash,
          chunkIndex: i,
          pageNumber: chunk.pageNumber,
          image: chunk.image
        },
      }));

      this.vectorStore.addEntries(entries, this.currentFileHash);
      
      // Save to cache for future use
      this.cacheService.saveEntries(this.currentFileHash, file.name, entries);

      // Save to persistence storage (IndexedDB)
      await this.persistenceService.saveVectors(this.currentProjectId!, this.currentFileHash, entries);

      // Save to local storage cache
      await this.localStorageManager.saveDocumentCache(
        file.name,
        this.currentFileHash,
        file.size,
        entries,
        {
          totalPages: chunks.length,
          pageImages: chunks.filter(c => c.image).map(c => c.image!)
        }
      );

      // Add to project
      const projectFile: ProjectFile = {
        fileName: file.name,
        fileHash: this.currentFileHash,
        uploadedAt: new Date(),
        fileSize: file.size,
      };
      this.projectManager.addFileToProject(this.currentProjectId!, projectFile);

      console.log(`✅ File processed successfully: ${file.name}`);
    } catch (error) {
      console.error('Error in processFile:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while processing the file.');
    }
  }

  /**
   * Processes and adds a file to the current project (without clearing context).
   */
  async processFileToProject(file: File): Promise<void> {
    try {
      // Ensure a project exists
      if (!this.currentProjectId) {
        const existingProjects = this.projectManager.getAllProjects();
        if (existingProjects.length === 0) {
          this.createProject('Default Project', 'Default project for documents');
        } else {
          this.setCurrentProject(existingProjects[0].id);
        }
      }

      // Calculate file hash
      const fileHash = await this.cacheService.calculateFileHash(file);
      
      // Check local storage cache first
      if (this.localStorageManager.isDocumentCached(fileHash)) {
        console.log(`♻️ Document found in cache: ${file.name}`);
        const cachedMetadata = this.localStorageManager.getCachedDocumentMetadata(fileHash);
        if (cachedMetadata) {
          console.log(`  ⏱️ Previously processed on: ${new Date(cachedMetadata.processedAt).toLocaleString()}`);
          console.log(`  📊 Chunks: ${cachedMetadata.chunks}`);
        }
      }
      
      // Try to load from persistence first
      const persistedEntries = await this.persistenceService.loadVectors(this.currentProjectId!, fileHash);
      if (persistedEntries) {
        console.log(`✅ File already processed: ${file.name}`);
        this.vectorStore.loadProjectFileEntries(this.currentProjectId!, fileHash, persistedEntries);
        // Ensure file is in project metadata
        const projectFile: ProjectFile = {
          fileName: file.name,
          fileHash: fileHash,
          uploadedAt: new Date(),
          fileSize: file.size,
        };
        if (!this.projectManager.getProjectFiles(this.currentProjectId!).some(f => f.fileHash === fileHash)) {
          this.projectManager.addFileToProject(this.currentProjectId!, projectFile);
        }
        return;
      }
      
      // Check cache 
      const cachedEntries = this.cacheService.getCachedEntries(fileHash);
      if (cachedEntries) {
        console.log(`✅ Loading ${file.name} from memory cache...`);
        this.vectorStore.addEntries(cachedEntries, fileHash);
        // Save to persistence for future use
        await this.persistenceService.saveVectors(this.currentProjectId!, fileHash, cachedEntries);
      } else {
        // If not cached, process the file
        console.log(`🔄 Processing new file: ${file.name}...`);
        const { chunks } = await this.docProcessor.process(file);

        if (!chunks || chunks.length === 0) {
          throw new Error('No text chunks could be extracted from the file.');
        }

        // Embed chunks in batches
        const texts = chunks.map(c => c.text);
        const embeddings = await this.gemini.embedBatch(texts);

        if (!embeddings || embeddings.length === 0) {
          throw new Error('Failed to generate embeddings for the document.');
        }

        const entries: VectorEntry[] = chunks.map((chunk, i) => ({
          text: chunk.text,
          embedding: embeddings[i],
          metadata: { 
            fileName: file.name, 
            fileHash: fileHash,
            chunkIndex: i,
            pageNumber: chunk.pageNumber,
            image: chunk.image
          },
        }));

        this.vectorStore.addEntries(entries, fileHash);
        
        // Save to cache for future use
        this.cacheService.saveEntries(fileHash, file.name, entries);

        // Save to persistence storage (IndexedDB)
        await this.persistenceService.saveVectors(this.currentProjectId!, fileHash, entries);

        // Save to local storage cache
        await this.localStorageManager.saveDocumentCache(
          file.name,
          fileHash,
          file.size,
          entries,
          {
            totalPages: chunks.length,
            pageImages: chunks.filter(c => c.image).map(c => c.image!)
          }
        );
      }

      // Add to project
      const projectFile: ProjectFile = {
        fileName: file.name,
        fileHash: fileHash,
        uploadedAt: new Date(),
        fileSize: file.size,
      };
      // Only add if not already in project
      if (!this.projectManager.getProjectFiles(this.currentProjectId!).some(f => f.fileHash === fileHash)) {
        this.projectManager.addFileToProject(this.currentProjectId!, projectFile);
      }

      console.log(`✅ File added to project: ${file.name}`);
    } catch (error) {
      console.error('Error in processFileToProject:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while adding file to project.');
    }
  }
  async loadProjectFile(projectId: string, fileHash: string): Promise<boolean> {
    try {
      const entries = await this.persistenceService.loadVectors(projectId, fileHash);
      if (entries) {
        this.currentProjectId = projectId;
        this.currentFileHash = fileHash;
        this.vectorStore.loadProjectFileEntries(projectId, fileHash, entries);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading project file:', error);
      return false;
    }
  }

  /**
   * Removes a file from project.
   */
  async removeProjectFile(projectId: string, fileHash: string): Promise<boolean> {
    const removed = this.projectManager.removeFileFromProject(projectId, fileHash);
    if (removed) {
      this.vectorStore.clearProjectFile(projectId, fileHash);
      await this.persistenceService.deleteVectors(projectId, fileHash);
    }
    return removed;
  }

  /**
   * Gets all files in a project.
   */
  getProjectFiles(projectId: string): ProjectFile[] {
    return this.projectManager.getProjectFiles(projectId);
  }

  /**
   * Gets storage statistics for current project.
   */
  async getProjectStorageStats(): Promise<{ filesCount: number; totalSize: number } | null> {
    if (!this.currentProjectId) return null;
    return this.persistenceService.getProjectStorageStats(this.currentProjectId);
  }

  /**
   * Clears the current document context.
   */
  clearContext() {
    this.vectorStore.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.localStorageManager.getCacheStats();
  }

  /**
   * Log cache information to console
   */
  logCacheInfo(): void {
    this.localStorageManager.logCacheInfo();
  }

  /**
   * Check if a document is cached
   */
  isDocumentCached(fileHash: string): boolean {
    return this.localStorageManager.isDocumentCached(fileHash);
  }

  /**
   * Get all cached documents
   */
  getAllCachedDocuments() {
    return this.localStorageManager.getAllCachedDocuments();
  }

  /**
   * Clear old cache entries
   */
  clearOldCache(daysOld: number = 30): void {
    this.localStorageManager.clearOldCache(daysOld);
  }

  /**
   * Export cache data for backup
   */
  exportCacheData(): Blob {
    return this.localStorageManager.exportCacheData();
  }

  /**
   * Queries the processed document.
   */
  async query(userQuery: string): Promise<ChatResponse> {
    // 1. Embed user query
    const queryEmbedding = await this.gemini.embed(userQuery);

    // 2. Search for similar chunks
    const similarEntries = this.vectorStore.search(queryEmbedding, 5);

    if (similarEntries.length === 0) {
      return { answer: "I'm sorry, I don't have any document context to answer from.", sources: [] };
    }

    // 3. Combine context and collect images
    const context = similarEntries.map((e) => e.text).join("\n\n---\n\n");
    
    // Get unique images from the top relevant pages
    const uniqueImages = Array.from(new Set(similarEntries.map(e => e.metadata?.image).filter(Boolean))) as string[];
    
    // 4. Generate response with multi-modal context
    const answer = await this.gemini.generateResponse(userQuery, context, uniqueImages);

    // 5. Extract citations from similar entries
    const citations: Citation[] = similarEntries.slice(0, 3).map((entry, idx) => ({
      text: entry.text.substring(0, 200),
      documentName: entry.metadata?.fileName || `Document ${idx + 1}`,
      documentId: entry.metadata?.fileName || `doc_${idx}`,
      pageNumber: entry.metadata?.pageNumber || 1,
      confidence: 0.95
    }));

    return {
      answer,
      sources: similarEntries.map(e => ({
        text: e.text,
        pageNumber: e.metadata?.pageNumber,
        image: e.metadata?.image
      })),
      citations
    };
  }

  /**
   * Summarizes the current document.
   */
  async summarizeDocument(length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> {
    if (!this.currentProjectId) {
      throw new Error('No project selected.');
    }

    // Get all entries for current project
    const allEntries = this.vectorStore.getProjectEntries(this.currentProjectId);
    
    if (allEntries.length === 0) {
      return 'No document content available to summarize.';
    }

    // Combine all text content
    const fullContent = allEntries.map(e => e.text).join('\n\n');
    
    // Get unique images
    const uniqueImages = Array.from(new Set(allEntries.map(e => e.metadata?.image).filter(Boolean))) as string[];

    return this.gemini.summarizeDocument(fullContent, uniqueImages, length);
  }

  /**
   * Compares multiple files/documents in the project.
   */
  async compareDocuments(fileHashes: string[], focusArea?: string): Promise<string> {
    if (!this.currentProjectId) {
      throw new Error('No project selected.');
    }

    if (fileHashes.length < 2) {
      throw new Error('At least 2 files required for comparison.');
    }

    const documents = fileHashes.map(fileHash => {
      const entries = this.vectorStore.getProjectFileEntries(this.currentProjectId!, fileHash);
      const fileName = entries[0]?.metadata?.fileName || `File_${fileHash}`;
      const content = entries.map(e => e.text).join('\n\n');
      
      return {
        name: fileName,
        content
      };
    });

    return this.gemini.compareDocuments(documents, focusArea);
  }

  /**
   * Extracts a concept explanation from the document.
   */
  async explainConcept(concept: string): Promise<string> {
    if (!this.currentProjectId) {
      throw new Error('No project selected.');
    }

    // Get all entries for current project
    const allEntries = this.vectorStore.getProjectEntries(this.currentProjectId);
    
    if (allEntries.length === 0) {
      return 'No document content available.';
    }

    // Combine content
    const fullContent = allEntries.map(e => e.text).join('\n\n');
    const uniqueImages = Array.from(new Set(allEntries.map(e => e.metadata?.image).filter(Boolean))) as string[];

    return this.gemini.explainConcept(fullContent, concept, uniqueImages);
  }

  /**
   * Gets citation formatted text.
   */
  formatCitation(
    selectedText: string,
    documentName: string,
    pageNumber?: number
  ): Promise<string> {
    return this.gemini.formatCitations(selectedText, documentName, pageNumber);
  }

  /**
   * Extracts key points from current document.
   */
  async extractKeyPoints(): Promise<string[]> {
    if (!this.currentProjectId) {
      throw new Error('No project selected.');
    }

    // Get top chunks (by relevance, but we'll just take diverse chunks)
    const allEntries = this.vectorStore.getProjectEntries(this.currentProjectId);
    
    if (allEntries.length === 0) {
      return [];
    }

    // Sample diverse chunks and extract key points
    const step = Math.max(1, Math.floor(allEntries.length / 5));
    const sampledChunks = allEntries
      .filter((_, i) => i % step === 0)
      .slice(0, 5)
      .map(e => e.text);

    // Use Gemini to extract key points
    const response = await this.gemini.generateResponse(
      'Extract and list the 5-7 most important key points from this document. Format as a numbered list.',
      sampledChunks.join('\n\n')
    );

    // Parse response into array
    return response.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * Validates answer is grounded in document.
   */
  async validateGrounding(question: string, answer: string): Promise<{ isGrounded: boolean; confidence: number; explanation: string }> {
    if (!this.currentProjectId) {
      throw new Error('No project selected.');
    }

    const allEntries = this.vectorStore.getProjectEntries(this.currentProjectId);
    
    if (allEntries.length === 0) {
      return { isGrounded: false, confidence: 0, explanation: 'No document available to ground answer.' };
    }

    const documentContent = allEntries.map(e => e.text).join('\n\n');
    
    const response = await this.gemini.generateResponse(
      `Analyze if this answer is grounded in the provided document. 
      Question: ${question}
      Answer: ${answer}
      
      Respond with:
      1. Is Grounded: YES or NO
      2. Confidence: 0-100%
      3. Explanation: Why or why not`,
      documentContent
    );

    // Parse response
    const isGrounded = response.toUpperCase().includes('YES');
    const confidenceMatch = response.match(/(\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

    return {
      isGrounded,
      confidence: confidence / 100,
      explanation: response
    };
  }
}
