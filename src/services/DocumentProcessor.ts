import * as pdfjsLib from 'pdfjs-dist';

// Set worker for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export class DocumentProcessor {
  private chunkSize: number = 1000;
  private chunkOverlap: number = 200;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Reads a file and extracts its text content.
   */
  async extractText(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      const { text } = await this.extractFromPdf(file);
      return text;
    } else {
      return this.extractFromText(file);
    }
  }

  /**
   * Extracts text from a text-based file.
   */
  private async extractFromText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Extracts text and page images from a PDF file using pdfjs-dist.
   */
  private async extractFromPdf(file: File): Promise<{ text: string; pages: { text: string; image: string; pageNumber: number }[] }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const pages: { text: string; image: string; pageNumber: number }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract text
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';

      // Extract image (render to canvas)
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        pages.push({
          text: pageText,
          image: imageData,
          pageNumber: i
        });
      }
    }

    return { text: fullText, pages };
  }

  /**
   * Main entry point for processing a file.
   */
  async process(file: File): Promise<{ chunks: { text: string; pageNumber?: number; image?: string }[] }> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      const { pages } = await this.extractFromPdf(file);
      const chunks: { text: string; pageNumber?: number; image?: string }[] = [];
      
      for (const page of pages) {
        const pageChunks = this.chunkText(page.text);
        for (const chunkText of pageChunks) {
          chunks.push({
            text: chunkText,
            pageNumber: page.pageNumber,
            image: page.image
          });
        }
      }
      return { chunks };
    } else {
      const text = await this.extractFromText(file);
      const chunks = this.chunkText(text).map(t => ({ text: t }));
      return { chunks };
    }
  }

  /**
   * Chunks text into smaller pieces for embedding.
   */
  chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;
      
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + this.chunkSize / 2) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - this.chunkOverlap;
      
      if (start < 0) start = 0;
      if (start >= end) start = end + 1;
    }

    return chunks.filter(c => c.length > 0);
  }
}
