import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;
  private embeddingModel = "gemini-embedding-2-preview";
  private chatModel = "gemini-3-flash-preview";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  /**
   * Generates an embedding for a given text.
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: this.embeddingModel,
      contents: [text],
    });
    return result.embeddings[0].values;
  }

  /**
   * Generates embeddings for multiple texts in batch.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.ai.models.embedContent({
      model: this.embeddingModel,
      contents: texts,
    });
    return result.embeddings.map((e) => e.values);
  }

  /**
   * Generates a response based on a query and context.
   */
  async generateResponse(query: string, context: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.chatModel,
      contents: [
        {
          text: `You are a helpful assistant. Use the provided context to answer the user's question accurately. If the answer is not in the context, say you don't know based on the document.
          
Context:
${context}

Question:
${query}`,
        },
      ],
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  }
}
