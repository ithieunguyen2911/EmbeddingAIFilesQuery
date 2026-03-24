import { DocumentChunk } from "./DocumentParserWithMetadata";
import { GeminiService } from "./GeminiService";
import { CitationService } from "./CitationService";

export type SummaryLength = "short" | "medium" | "long";

export class SmartSummarizationService {
  private static geminiService = GeminiService.getInstance();

  /**
   * Summarize document chunks
   */
  static async summarizeChunks(
    chunks: DocumentChunk[],
    length: SummaryLength = "medium"
  ): Promise<string> {
    try {
      const fullText = chunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((c) => c.content)
        .join("\n");

      return this.generateSummary(fullText, length);
    } catch (error) {
      throw new Error(
        `Failed to summarize: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Summarize specific section
   */
  static async summarizeSection(
    chunks: DocumentChunk[],
    sectionTitle?: string,
    length: SummaryLength = "medium"
  ): Promise<string> {
    try {
      const sectionChunks = sectionTitle
        ? chunks.filter((c) => c.sectionTitle === sectionTitle)
        : chunks;

      if (sectionChunks.length === 0) {
        return "Không tìm thấy section này trong tài liệu.";
      }

      const sectionText = sectionChunks
        .map((c) => c.content)
        .join("\n");

      const summary = await this.generateSummary(sectionText, length);

      // Add section reference
      const sectionRef = sectionTitle ? `**Section: ${sectionTitle}**\n\n` : "";
      return sectionRef + summary;
    } catch (error) {
      throw new Error(
        `Failed to summarize section: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Extract key points from document
   */
  static async extractKeyPoints(
    chunks: DocumentChunk[],
    count: number = 5
  ): Promise<string> {
    try {
      const fullText = chunks
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((c) => c.content)
        .join("\n");

      const prompt = `
Trích xuất ${count} điểm chính từ đoạn văn bản sau:

${fullText}

Định dạng:
- Mỗi điểm chính một dòng
- Sắp xếp theo độ quan trọng (quan trọng nhất trước)
- Ngắn gọn, dễ hiểu
- Không lặp lại
      `;

      return await this.geminiService.generateContent(prompt);
    } catch (error) {
      throw new Error(
        `Failed to extract key points: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Summarize by topic across chunks
   */
  static async summarizeByTopic(
    topic: string,
    chunks: DocumentChunk[],
    length: SummaryLength = "medium"
  ): Promise<string> {
    try {
      // Find chunks most relevant to topic
      const relevantChunks = chunks.filter((c) =>
        c.content.toLowerCase().includes(topic.toLowerCase())
      );

      if (relevantChunks.length === 0) {
        return `Không tìm thấy thông tin về "${topic}" trong tài liệu.`;
      }

      const topicText = relevantChunks
        .map((c) => c.content)
        .join("\n");

      const prompt = `
Tóm tắt phần sau về chủ đề "${topic}":

${topicText}

Tóm tắt phải:
- Tập trung vào "${topic}"
- Bao gồm tất cả thông tin liên quan
- Dễ hiểu cho người không chuyên
      `;

      return await this.geminiService.generateContent(prompt);
    } catch (error) {
      throw new Error(
        `Failed to summarize by topic: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate summary with specified length
   */
  private static async generateSummary(
    text: string,
    length: SummaryLength
  ): Promise<string> {
    const lengthGuide: Record<SummaryLength, string> = {
      short: "200-300 từ",
      medium: "400-600 từ",
      long: "800-1200 từ"
    };

    const prompt = `
Tóm tắt đoạn văn bản sau trong khoảng ${lengthGuide[length]}:

${text}

Yêu cầu:
- Bao gồm các điểm chính
- Giữ lại chi tiết quan trọng
- Viết dễ hiểu
- Không thêm thông tin không có trong text gốc
    `;

    return await this.geminiService.generateContent(prompt);
  }
}
