import { DocumentChunk } from "./DocumentParserWithMetadata";
import { GeminiService } from "./GeminiService";
import { CitationService, ChatResponseWithCitations } from "./CitationService";

export class HighlightExplainService {
  private static geminiService = GeminiService.getInstance();

  /**
   * Explain highlighted text with context from document
   */
  static async explainHighlight(
    selectedText: string,
    documentChunks: DocumentChunk[],
    surroundingContext?: string
  ): Promise<ChatResponseWithCitations> {
    try {
      // Find the most relevant chunks for this text
      const relevantChunks = this.findRelevantChunks(
        selectedText,
        documentChunks
      );

      // Build explanation prompt
      const explanationPrompt = this.buildExplanationPrompt(
        selectedText,
        relevantChunks,
        surroundingContext
      );

      // Get explanation from Gemini
      const explanation = await this.geminiService.generateContent(
        explanationPrompt
      );

      // Return with citations
      return CitationService.enrichResponseWithCitations(
        explanation,
        relevantChunks
      );
    } catch (error) {
      throw new Error(
        `Failed to explain highlight: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate related questions for highlighted text
   */
  static async generateRelatedQuestions(
    selectedText: string,
    documentChunks: DocumentChunk[]
  ): Promise<string[]> {
    try {
      const prompt = `
Dựa trên đoạn text sau:
"${selectedText}"

Tạo 3 câu hỏi liên quan mà reader có thể muốn hỏi để hiểu rõ hơn.

Định dạng: 
- Mỗi câu hỏi một dòng
- Không dấu bullet
- Là câu hỏi thực tế, có ích
      `;

      const response = await this.geminiService.generateContent(prompt);
      return response.split("\n").filter((q) => q.trim().length > 0);
    } catch (error) {
      console.error("Failed to generate related questions:", error);
      return [];
    }
  }

  /**
   * Find relevant chunks for highlighted text
   */
  private static findRelevantChunks(
    selectedText: string,
    documentChunks: DocumentChunk[]
  ): DocumentChunk[] {
    // Find chunks that contain the selected text or similar content
    const relevantChunks = documentChunks.filter((chunk) => {
      const textLower = selectedText.toLowerCase();
      const chunkLower = chunk.content.toLowerCase();

      // Exact match
      if (chunkLower.includes(textLower)) return true;

      // Similar content (same keywords)
      const selectedWords = textLower.split(/\s+/);
      const matchCount = selectedWords.filter((word) =>
        chunkLower.includes(word)
      ).length;

      return matchCount >= Math.max(2, selectedWords.length / 2);
    });

    // Return top 3 relevant chunks
    return relevantChunks.slice(0, 3);
  }

  /**
   * Build explanation prompt
   */
  private static buildExplanationPrompt(
    selectedText: string,
    relevantChunks: DocumentChunk[],
    context?: string
  ): string {
    const chunkContext = relevantChunks
      .map((c) => `${c.documentName}:\n${c.content.substring(0, 300)}`)
      .join("\n\n");

    return `
User đã highlight đoạn text này:
"${selectedText}"

${context ? `Surrounding context: ${context}\n` : ""}

Relevant context from documents:
${chunkContext}

Hãy giải thích chi tiết:
1. Ý nghĩa chính của đoạn text này
2. Tại sao nó quan trọng trong bối cảnh
3. Mối liên hệ với các khái niệm khác
4. Ứng dụng thực tế nếu có
5. Các khái niệm liên quan

Lưu ý:
- Giải thích cho người không chuyên
- Sử dụng ví dụ nếu cần
- Trích dẫn trực tiếp từ các tài liệu được cung cấp
    `;
  }
}
