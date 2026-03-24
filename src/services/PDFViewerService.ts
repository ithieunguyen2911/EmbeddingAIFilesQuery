/**
 * PDF Viewer Service
 * Opens PDF documents in a modal or new window
 */

export class PDFViewerService {
  /**
   * Open PDF file
   * Supports both local files and URLs
   */
  static openPDF(
    documentPath: string | File,
    pageNumber?: number,
    inNewWindow: boolean = false
  ): void {
    try {
      if (inNewWindow) {
        // Open in new window/tab
        if (typeof documentPath === "string") {
          window.open(documentPath, "_blank", "width=1200,height=800");
        } else {
          // For File objects, create a blob URL
          const blobUrl = URL.createObjectURL(documentPath);
          const url = pageNumber
            ? `${blobUrl}#page=${pageNumber}`
            : blobUrl;
          window.open(url, "_blank");
        }
      } else {
        // Trigger download
        this.downloadPDF(documentPath);
      }
    } catch (error) {
      console.error("Error opening PDF:", error);
      alert(`Không thể mở PDF: ${error instanceof Error ? error.message : "Lỗi không xác định"}`);
    }
  }

  /**
   * Download PDF file
   */
  static downloadPDF(documentPath: string | File): void {
    try {
      const link = document.createElement("a");

      if (typeof documentPath === "string") {
        link.href = documentPath;
      } else {
        link.href = URL.createObjectURL(documentPath);
        link.download = documentPath.name;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      if (typeof documentPath !== "string") {
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Không thể tải xuống PDF");
    }
  }

  /**
   * Open PDF in viewer modal
   */
  static openInModal(documentPath: string | File, pageNumber?: number): void {
    // This will trigger a custom event that parent component can listen to
    const event = new CustomEvent("open-pdf-modal", {
      detail: {
        document: documentPath,
        pageNumber
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get PDF preview thumbnail
   * Returns a data URL of the first page
   */
  static async getPDFPreview(file: File): Promise<string> {
    try {
      const pdfDoc = await import("pdfjs-dist").then((mod) => 
        mod.getDocument(file.arrayBuffer()).promise
      );

      if (pdfDoc.numPages === 0) {
        throw new Error("PDF has no pages");
      }

      const page = await pdfDoc.getPage(1);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      return canvas.toDataURL();
    } catch (error) {
      console.error("Error getting PDF preview:", error);
      return "";
    }
  }
}
