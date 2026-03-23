import { GeminiService } from "./GeminiService";
import { VectorStore, VectorEntry } from "./VectorStore";
import { DocumentProcessor } from "./DocumentProcessor";

export interface ChatResponse {
  answer: string;
  sources: { text: string; pageNumber?: number; image?: string }[];
}

export class ChatEngine {
  private gemini: GeminiService;
  private vectorStore: VectorStore;
  private docProcessor: DocumentProcessor;

  constructor() {
    this.gemini = new GeminiService();
    this.vectorStore = new VectorStore();
    this.docProcessor = new DocumentProcessor();
  }

  /**
   * Processes a file and prepares it for querying.
   */
  async processFile(file: File): Promise<void> {
    const { chunks } = await this.docProcessor.process(file);

    // Embed chunks in batches
    const texts = chunks.map(c => c.text);
    const embeddings = await this.gemini.embedBatch(texts);

    const entries: VectorEntry[] = chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: embeddings[i],
      metadata: { 
        fileName: file.name, 
        chunkIndex: i,
        pageNumber: chunk.pageNumber,
        image: chunk.image
      },
    }));

    this.vectorStore.addEntries(entries);
  }

  /**
   * Clears the current document context.
   */
  clearContext() {
    this.vectorStore.clear();
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

    return {
      answer,
      sources: similarEntries.map(e => ({
        text: e.text,
        pageNumber: e.metadata?.pageNumber,
        image: e.metadata?.image
      }))
    };
  }
}
