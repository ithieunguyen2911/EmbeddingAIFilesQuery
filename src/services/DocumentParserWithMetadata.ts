import * as pdfjsLib from "pdfjs-dist";

export interface DocumentChunk {
  content: string;
  pageNumber: number;
  sectionTitle?: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
}

export class DocumentParserWithMetadata {
  /**
   * Parse PDF and extract text with page numbers
   */
  static async parsePDFWithPages(file: File): Promise<DocumentChunk[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
      const chunks: DocumentChunk[] = [];
      let chunkIndex = 0;

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => {
            return typeof item.str === "string" ? item.str : "";
          })
          .join(" ");

        if (!pageText.trim()) continue;

        // Split by sections if headers detected
        const sections = this.extractSections(pageText);
        for (const section of sections) {
          chunks.push({
            content: section.text,
            pageNumber: pageNum,
            sectionTitle: section.title,
            documentId: file.name,
            documentName: file.name.replace(/\.[^.]+$/, ""),
            chunkIndex: chunkIndex++
          });
        }
      }
      return chunks;
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Parse text file
   */
  static async parseTextFile(file: File): Promise<DocumentChunk[]> {
    try {
      const text = await file.text();
      const chunks: DocumentChunk[] = [];

      // Split by headings or paragraphs
      const sections = this.extractSections(text);
      sections.forEach((section, idx) => {
        chunks.push({
          content: section.text,
          pageNumber: 1,
          sectionTitle: section.title,
          documentId: file.name,
          documentName: file.name.replace(/\.[^.]+$/, ""),
          chunkIndex: idx
        });
      });

      return chunks;
    } catch (error) {
      console.error("Error parsing text file:", error);
      throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Extract sections from text content
   */
  private static extractSections(
    text: string
  ): { title?: string; text: string }[] {
    // Split by common headers (##, ###, etc.) or double newlines
    const headerRegex = /^#{1,6}\s+(.+)$/gm;
    const parts = text.split(headerRegex);
    const sections = [];

    for (let i = 0; i < parts.length; i += 2) {
      const title = parts[i]?.trim();
      const content = parts[i + 1]?.trim() || "";

      if (content && content.length > 20) {
        // Only include substantial content
        sections.push({
          title: title && title.length > 0 ? title : undefined,
          text: content
        });
      }
    }

    return sections.length > 0 ? sections : [{ text }];
  }

  /**
   * Parse file based on type
   */
  static async parseFile(file: File): Promise<DocumentChunk[]> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "pdf") {
      return this.parsePDFWithPages(file);
    } else if (["txt", "md", "markdown"].includes(extension || "")) {
      return this.parseTextFile(file);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
  }
}
