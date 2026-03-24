import { DocumentChunk } from "./DocumentParserWithMetadata";
import { CitationService, ChatResponseWithCitations } from "./CitationService";
import { GeminiService } from "./GeminiService";

export class MultiDocumentReasoningService {
  private static geminiService = GeminiService.getInstance();

  /**
   * Compare multiple documents
   */
  static async compareDocuments(
    query: string,
    documentChunks: DocumentChunk[][]
  ): Promise<ChatResponseWithCitations> {
    try {
      // Group chunks by document
      const contextByDoc = new Map<string, DocumentChunk[]>();
      documentChunks.flat().forEach((chunk) => {
        if (!contextByDoc.has(chunk.documentName)) {
          contextByDoc.set(chunk.documentName, []);
        }
        contextByDoc.get(chunk.documentName)!.push(chunk);
      });

      // Build comparison prompt
      const comparisonPrompt = this.buildComparisonPrompt(query, contextByDoc);

      // Get AI analysis
      const response = await this.geminiService.generateContent(
        comparisonPrompt
      );

      // Collect relevant chunks for citations
      const citationChunks = documentChunks.flat().slice(0, 5);

      // Emphasize comparison in response
      const enrichedResponse =
        `**So sánh các tài liệu:**\n\n${response}\n\n` +
        `\n\n**Trích dẫn từ các tài liệu:**\n${CitationService.formatCitations(citationChunks)}`;

      return CitationService.enrichResponseWithCitations(
        enrichedResponse,
        citationChunks
      );
    } catch (error) {
      throw new Error(
        `Failed to compare documents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Find connections between documents
   */
  static async findConnections(
    topic: string,
    documentChunks: DocumentChunk[][]
  ): Promise<ChatResponseWithCitations> {
    try {
      const contextByDoc = new Map<string, DocumentChunk[]>();
      documentChunks.flat().forEach((chunk) => {
        if (!contextByDoc.has(chunk.documentName)) {
          contextByDoc.set(chunk.documentName, []);
        }
        contextByDoc.get(chunk.documentName)!.push(chunk);
      });

      const prompt = `
Tìm các kết nối giữa các tài liệu sau về chủ đề: "${topic}"

${Array.from(contextByDoc.entries())
  .map(
    ([docName, chunks]) =>
      `**${docName}:**\n${chunks.map((c) => c.content).join("\n")}`
  )
  .join("\n\n")}

Hãy:
1. Xác định các điểm tương đồng giữa các tài liệu
2. Chỉ ra các khác biệt chính
3. Tìm các kết nối hoặc các bổ sung lẫn nhau
4. Đưa ra tổng hợp có cấu trúc
      `;

      const response = await this.geminiService.generateContent(prompt);
      const citationChunks = documentChunks.flat().slice(0, 5);

      return CitationService.enrichResponseWithCitations(
        response,
        citationChunks
      );
    } catch (error) {
      throw new Error(
        `Failed to find connections: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static buildComparisonPrompt(
    query: string,
    contextByDoc: Map<string, DocumentChunk[]>
  ): string {
    let prompt = `So sánh các tài liệu sau về: "${query}"\n\n`;

    for (const [docName, chunks] of contextByDoc) {
      prompt += `## ${docName}\n`;
      prompt += chunks
        .map((c) => `- ${c.content.substring(0, 200)}...`)
        .join("\n");
      prompt += "\n\n";
    }

    prompt += `
Hãy cung cấp một so sánh chi tiết:
1. Những điểm giống nhau
2. Những điểm khác nhau
3. Ưu điểm của mỗi tài liệu
4. Khuyến nghị khi nào sử dụng từng tài liệu
    `;

    return prompt;
  }
}
