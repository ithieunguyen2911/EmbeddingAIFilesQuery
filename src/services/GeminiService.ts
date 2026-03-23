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
   * Generates a response based on a query and context, potentially including images.
   */
  async generateResponse(query: string, context: string, images: string[] = []): Promise<string> {
    const parts: any[] = [
      {
        text: `You are a helpful assistant. Use the provided context (text and images) to answer the user's question accurately. 
        If the answer is not in the context, say you don't know based on the document.
        If you refer to something in an image, mention which image or page it is from.
          
Context Text:
${context}

Question:
${query}`,
      },
    ];

    // Add images to the parts
    for (const base64Image of images) {
      const data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          data,
          mimeType,
        },
      });
    }

    const response = await this.ai.models.generateContent({
      model: this.chatModel,
      contents: [{ parts }],
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  }
}
