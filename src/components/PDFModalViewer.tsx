import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface PDFModalViewerProps {
  isOpen: boolean;
  documentPath?: string | File;
  initialPage?: number;
  documentName?: string;
  onClose: () => void;
}

export const PDFModalViewer: React.FC<PDFModalViewerProps> = ({
  isOpen,
  documentPath,
  initialPage = 1,
  documentName = "Document",
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && documentPath) {
      setIsLoading(true);

      // Create URL for PDF
      if (typeof documentPath === "string") {
        setPdfUrl(documentPath);
      } else {
        const blob = new Blob([documentPath], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }

      // Load PDF metadata using iframe or fetch
      const loadPDFMetadata = async () => {
        try {
          // Try to get page count from PDF
          const pdfjs = await import("pdfjs-dist");
          const pdf = await pdfjs.getDocument(
            typeof documentPath === "string"
              ? documentPath
              : await documentPath.arrayBuffer()
          ).promise;
          setTotalPages(pdf.numPages);
          setCurrentPage(Math.min(initialPage, pdf.numPages));
        } catch (error) {
          console.error("Error loading PDF metadata:", error);
          setTotalPages(1);
        }
        setIsLoading(false);
      };

      loadPDFMetadata();
    }

    return () => {
      if (pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, documentPath, initialPage]);

  if (!isOpen) return null;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    const newZoom = direction === "in" ? zoom + 10 : Math.max(50, zoom - 10);
    setZoom(newZoom);
  };

  const handleDownload = () => {
    if (typeof documentPath !== "string" && documentPath) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(documentPath);
      link.download = documentPath.name;
      link.click();
    } else if (typeof documentPath === "string") {
      const link = document.createElement("a");
      link.href = documentPath;
      link.download = documentName;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl flex flex-col max-w-4xl max-h-[90vh] w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800 truncate">
              📄 {documentName}
            </h2>
            {totalPages > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Trang {currentPage} / {totalPages}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom("out")}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut size={18} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-600 w-12 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => handleZoom("in")}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Zoom In"
            >
              <ZoomIn size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-blue-100 rounded transition text-blue-600"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded transition text-red-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 mt-3">Đang tải PDF...</p>
            </div>
          ) : pdfUrl ? (
            <div className="flex items-center justify-center">
              <iframe
                src={`${pdfUrl}#page=${currentPage}`}
                title="PDF Viewer"
                style={{
                  width: "100%",
                  height: "100%",
                  zoom: `${zoom}%`,
                  border: "none"
                }}
                className="rounded"
              />
            </div>
          ) : (
            <p className="text-gray-600">Không thể tải PDF</p>
          )}
        </div>

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Trang:</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) =>
                  setCurrentPage(Math.min(Math.max(1, parseInt(e.target.value) || 1), totalPages))
                }
                className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm"
              />
              <span className="text-xs text-gray-600">/ {totalPages}</span>
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
