import { DocumentChunk } from "./DocumentParserWithMetadata";

export interface Citation {
  text: string;
  documentName: string;
  documentId: string;
  pageNumber: number;
  sectionTitle?: string;
  confidence: number;
}

export interface ChatResponseWithCitations {
  answer: string;
  citations: Citation[];
  sources: string[];
  relatedQuestions?: string[];
}

export class CitationService {
  /**
   * Extract citations from retrieved chunks
   * Format: "Theo trang X của tài liệu Y: "...đoạn trích dẫn...""
   */
  static formatCitations(chunks: DocumentChunk[]): string {
    if (!chunks || chunks.length === 0) return "";

    return chunks
      .slice(0, 5) // Limit to 5 citations
      .map((chunk, idx) => {
        const docName = chunk.documentName;
        const pageRef = chunk.pageNumber ? `trang ${chunk.pageNumber}` : "tài liệu";
        const section = chunk.sectionTitle? ` (${chunk.sectionTitle})` : "";

        // Get first 150 chars of content
        const excerpt = chunk.content.substring(0, 150).trim();

        return `**${idx + 1}. Theo ${pageRef} của \`${docName}\`${section}:**\n> "${excerpt}..."`;
      })
      .join("\n\n");
  }

  /**
   * Enrich AI response with citations from chunks
   */
  static enrichResponseWithCitations(
    response: string,
    chunks: DocumentChunk[]
  ): ChatResponseWithCitations {
    const citations: Citation[] = chunks.map((chunk) => ({
      text: chunk.content.substring(0, 200),
      documentName: chunk.documentName,
      documentId: chunk.documentId,
      pageNumber: chunk.pageNumber,
      sectionTitle: chunk.sectionTitle,
      confidence: 0.95
    }));

    // Get unique sources
    const sources = [...new Set(chunks.map((c) => c.documentName))];

    return {
      answer: response,
      citations,
      sources
    };
  }

  /**
   * Format citation for inline display
   * E.g., in the middle of response text [📄 source, page 12]
   */
  static formatInlineCitation(citation: Citation): string {
    return `[📄 ${citation.documentName}, trang ${citation.pageNumber}]`;
  }

  /**
   * Extract relevant quotes from chunks as citations
   */
  static extractRelevantQuotes(chunks: DocumentChunk[], query: string): Citation[] {
    return chunks
      .map((chunk) => {
        // Try to find relevant sentence in the chunk
        const sentences = chunk.content.split(/[.!?]+/);
        const relevantSentence = sentences.find((s) =>
          s.toLowerCase().includes(query.toLowerCase())
        ) || sentences[0];

        return {
          text: (relevantSentence || chunk.content).trim().substring(0, 250),
          documentName: chunk.documentName,
          documentId: chunk.documentId,
          pageNumber: chunk.pageNumber,
          sectionTitle: chunk.sectionTitle,
          confidence: relevantSentence ? 0.95 : 0.75
        };
      })
      .filter((c) => c.confidence >= 0.75)
      .slice(0, 3); // Top 3 citations
  }
}
