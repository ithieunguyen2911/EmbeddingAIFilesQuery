import { GeminiService } from "./GeminiService";
import { VectorStore, VectorEntry } from "./VectorStore";
import { DocumentProcessor } from "./DocumentProcessor";

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
    const text = await this.docProcessor.extractText(file);
    const chunks = this.docProcessor.chunkText(text);

    // Embed chunks in batches
    const embeddings = await this.gemini.embedBatch(chunks);

    const entries: VectorEntry[] = chunks.map((chunk, i) => ({
      text: chunk,
      embedding: embeddings[i],
      metadata: { fileName: file.name, chunkIndex: i },
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
  async query(userQuery: string): Promise<string> {
    // 1. Embed user query
    const queryEmbedding = await this.gemini.embed(userQuery);

    // 2. Search for similar chunks
    const similarEntries = this.vectorStore.search(queryEmbedding, 5);

    if (similarEntries.length === 0) {
      return "I'm sorry, I don't have any document context to answer from.";
    }

    // 3. Combine context
    const context = similarEntries.map((e) => e.text).join("\n\n---\n\n");

    // 4. Generate response
    return this.gemini.generateResponse(userQuery, context);
  }
}
