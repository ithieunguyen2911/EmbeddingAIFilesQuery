import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Document } from '../types/workspace';
import { formatBytes } from '../utils/format';

interface DocumentSidebarProps {
  documents: Document[];
  onFileUpload: (files: File[]) => void;
  isProcessing: boolean;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  documents,
  onFileUpload,
  isProcessing
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      console.log('Files dropped:', files.length);
      onFileUpload(files);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv']
    }
  });

  const supportedFormats = ['PDF', 'TXT', 'Markdown', 'CSV'];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Upload Area */}
      <div className="p-4 border-b border-slate-200">
        <div
          {...getRootProps()}
          className={`p-4 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          <div className="flex flex-col items-center gap-2 text-sm">
            <Upload size={20} className={isDragActive ? 'text-blue-500' : 'text-slate-400'} />
            <div className="text-center">
              <p className="font-medium text-slate-900">
                {isDragActive ? 'Drop files here' : 'Drop files to upload'}
              </p>
              <p className="text-xs text-slate-500">or click to select</p>
            </div>
          </div>
        </div>

        {/* Supported formats info */}
        <p className="text-xs text-slate-500 mt-3 text-center">
          Supports: {supportedFormats.join(', ')}
        </p>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No documents yet</p>
            <p className="text-xs text-slate-400">Upload documents to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedDocId === doc.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {formatBytes(doc.fileSize)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="p-4 border-t border-slate-200 bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="animate-spin">⚙️</div>
            <span>Processing documents...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSidebar;
