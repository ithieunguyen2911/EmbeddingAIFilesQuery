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
   * Ensures the response is grounded in the provided document.
   */
  async generateResponse(query: string, context: string, images: string[] = []): Promise<string> {
    const parts: any[] = [
      {
        text: `You are a helpful assistant that ONLY answers questions based on the provided document content.
Always respond in Vietnamese unless the user explicitly asks in another language.

IMPORTANT RULES:
1. Only use information from the provided context and images
2. Do NOT use external knowledge
3. If the answer is not in the document, clearly state: "Thông tin này không có trong tài liệu được cung cấp."
4. When referring to specific locations, mention the page number or section
5. Be accurate and cite relevant parts of the document

FORMATTING RULES (MUST FOLLOW):
- Use **bold** for key terms, important names, numbers, and critical information
- Use bullet points (- ) for listing steps, items, or options
- Use numbered lists (1. 2. 3.) for sequential processes or ranked items
- Use headings with ### for major sections
- Add relevant emoji icons to section headings for visual clarity:
  📋 for procedures/steps, 📌 for important notes, ⚠️ for warnings,
  ✅ for completed/confirmed items, 📊 for data/statistics,
  🔑 for key points, 📄 for document references, 💡 for tips,
  🚢 for shipping/logistics, 📦 for containers/packages
- Highlight critical warnings or notes with: ⚠️ **Lưu ý:**
- End with a 🔑 **Tóm tắt:** section summarizing 2-3 key takeaways
- Keep paragraphs short (2-3 sentences max)
- Use > blockquotes for direct quotes from the document

Context Text:
${context}

Question:
${query}

Response (based ONLY on the document, formatted richly with bold/icons/structure as instructed):`,
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

  /**
   * Summarizes document content with source citations.
   */
  async summarizeDocument(
    content: string,
    images: string[] = [],
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<string> {
    const lengthGuide = {
      short: '100-150 words (brief overview)',
      medium: '200-300 words (comprehensive)',
      long: '500+ words (detailed with key points)',
    };

    const parts: any[] = [
      {
        text: `You are a document analysis expert. Summarize the provided document in ${lengthGuide[length]}.

REQUIREMENTS:
1. Capture the main ideas and key points
2. Include important details and findings
3. Organize by sections/topics when applicable
4. Mention page numbers when referring to specific information
5. Be objective and concise
6. Highlight critical information

Document Content:
${content}

Please provide a comprehensive summary:`,
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
    return response.text || "Could not generate summary.";
  }

  /**
   * Compares multiple documents and identifies similarities/differences.
   */
  async compareDocuments(
    documents: Array<{ name: string; content: string }>,
    focusArea?: string
  ): Promise<string> {
    const focusText = focusArea ? `Focus on comparing: ${focusArea}` : '';

    const documentsList = documents
      .map((doc, idx) => `Document ${idx + 1} (${doc.name}):\n${doc.content}`)
      .join('\n\n---\n\n');

    const parts: any[] = [
      {
        text: `You are a document comparison expert. Compare the following ${documents.length} documents and identify key similarities, differences, and insights.

${focusText}

ANALYSIS SHOULD INCLUDE:
1. Main similarities between documents
2. Key differences and contrasts
3. Conflicting information (if any)
4. Complementary information
5. Document-specific strengths/gaps
6. Overall assessment of coverage

Documents to Compare:
${documentsList}

Please provide a detailed comparison:`,
      },
    ];

    const response = await this.ai.models.generateContent({
      model: this.chatModel,
      contents: [{ parts }],
    });
    return response.text || "Could not generate comparison.";
  }

  /**
   * Extracts and formats citations from the document.
   */
  async formatCitations(
    selectedText: string,
    documentName: string,
    pageNumber?: number
  ): Promise<string> {
    const citationFormats = {
      APA: `${documentName}${pageNumber ? ` (p. ${pageNumber})` : ''}`,
      MLA: `"${selectedText}" (${documentName}${pageNumber ? `, p. ${pageNumber}` : ''})`,
      Chicago: `${documentName}, ${pageNumber ? `p. ${pageNumber}` : 'n.p.'}`,
    };

    return `Citation Formats:
APA: ${citationFormats.APA}
MLA: ${citationFormats.MLA}
Chicago: ${citationFormats.Chicago}

Original Text:
"${selectedText}"`;
  }

  /**
   * Explains specific concepts from the document.
   */
  async explainConcept(
    context: string,
    concept: string,
    images: string[] = []
  ): Promise<string> {
    const parts: any[] = [
      {
        text: `Based on the provided document, explain the following concept in detail:

Concept: ${concept}

Document Context:
${context}

Please provide:
1. Definition/Overview of the concept
2. How it's used in the document
3. Key examples from the document
4. Related concepts mentioned
5. Significance/Importance

Explanation:`,
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
    return response.text || "Could not explain the concept.";
  }
}
