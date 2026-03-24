import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, FileText, Lightbulb, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatEngine } from '../services/ChatEngine';
import { Document, Message, ChatResponse } from '../types/workspace';
import { SmartSummarizationService } from '../services/SmartSummarizationService';
import { MultiDocumentReasoningService } from '../services/MultiDocumentReasoningService';
import {DocumentParserWithMetadata, DocumentChunk} from '../services/DocumentParserWithMetadata';
import { DocumentPersistenceService } from '../services/DocumentPersistenceService';
import MessageItem from './MessageItem';
import { ChatResponseDisplay } from './ChatResponseDisplay';
import { PDFModalViewer } from './PDFModalViewer';

interface ChatPanelProps {
  groupId: string;
  documents: Document[];
}

interface PDFViewerState {
  isOpen: boolean;
  documentPath?: string;
  documentName?: string;
  pageNumber?: number;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ groupId, documents }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<PDFViewerState>({ isOpen: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle opening PDF from citation - opens in new browser tab
  const handleOpenPDF = async (documentId: string, pageNumber?: number) => {
    const doc = documents.find(d => d.name === documentId || d.id === documentId);
    if (!doc) {
      console.warn('Document not found:', documentId);
      return;
    }

    try {
      const persisted = await DocumentPersistenceService.getDocument(doc.id);
      if (persisted?.fileBlob) {
        const blobUrl = URL.createObjectURL(persisted.fileBlob);
        const pageFragment = pageNumber ? `#page=${pageNumber}` : '';
        window.open(blobUrl + pageFragment, '_blank');
      } else {
        console.warn('No persisted blob found for document:', doc.name);
      }
    } catch (error) {
      console.error('Failed to open PDF:', error);
    }
  };

  // Submit message for Q&A
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || documents.length === 0) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      metadata: { type: 'chat' }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Querying:', input);
      const chatEngine = ChatEngine.getInstance();
      const response = await chatEngine.query(input);
      console.log('Response received with citations:', response.citations?.length || 0);
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        metadata: { type: 'chat' },
        data: response // Store full response with citations
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error querying:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${errorMsg}. Please check the console for details.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Summarize document
  const handleSummarize = async (length: 'short' | 'medium' | 'long' = 'medium') => {
    if (documents.length === 0) return;
    setIsLoading(true);
    try {
      console.log('Summarizing document...');
      const chatEngine = ChatEngine.getInstance();
      const summary = await chatEngine.summarizeDocument(length);
      console.log('Summary received');
      const message: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: summary,
        timestamp: new Date(),
        metadata: { type: 'summary' }
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error summarizing:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Error summarizing: ${errorMsg}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract key points
  const handleKeyPoints = async () => {
    if (documents.length === 0) return;
    setIsLoading(true);
    try {
      console.log('Extracting key points...');
      const chatEngine = ChatEngine.getInstance();
      const keyPoints = await chatEngine.extractKeyPoints();
      console.log('Key points received');
      const message: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: keyPoints,
        timestamp: new Date(),
        metadata: { type: 'keypoints' }
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error extracting key points:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Error extracting key points: ${errorMsg}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Compare documents
  const handleCompare = async () => {
    if (documents.length < 2) {
      alert('Please upload at least 2 documents to compare');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Comparing documents...');
      const chatEngine = ChatEngine.getInstance();
      const fileHashes = documents.map(d => d.fileHash);
      const comparison = await chatEngine.compareDocuments(fileHashes);
      console.log('Comparison received');
      const message: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: comparison,
        timestamp: new Date(),
        metadata: { type: 'comparison' }
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error comparing documents:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Error comparing documents: ${errorMsg}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center text-center"
          >
            <Zap size={48} className="text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome to {documents[0]?.name || 'Your Workspace'}
            </h2>
            <p className="text-slate-600 max-w-md">
              Ask questions about your documents, get summaries, compare documents, or extract key insights.
            </p>

            {/* Quick action cards */}
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => handleSummarize('medium')}
                disabled={isLoading || documents.length === 0}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Lightbulb size={20} className="text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-blue-900">Summarize</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleKeyPoints}
                disabled={isLoading || documents.length === 0}
                className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <FileText size={20} className="text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-purple-900">Key Points</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleCompare}
                disabled={isLoading || documents.length < 2}
                className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <BarChart3 size={20} className="text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-900">Compare</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setInput('What are the main topics covered?')}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Zap size={20} className="text-orange-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-orange-900">Ask</p>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div>
            {messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                onOpenPDF={handleOpenPDF}
              />
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg max-w-xs"
              >
                <div className="animate-spin">⚙️</div>
                <span className="text-sm text-slate-700">AI is thinking...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-6 bg-slate-50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question about your documents..."
            disabled={isLoading || documents.length === 0}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim() || documents.length === 0}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
          >
            <Send size={20} />
          </motion.button>
        </div>

        {documents.length === 0 && (
          <p className="text-xs text-slate-500 mt-3">📤 Upload documents to start asking questions</p>
        )}
      </div>

      {/* PDF Modal Viewer */}
      <PDFModalViewer
        isOpen={pdfViewer.isOpen}
        documentPath={pdfViewer.documentPath}
        documentName={pdfViewer.documentName}
        initialPage={pdfViewer.pageNumber || 1}
        onClose={() => {
          // Revoke blob URL to free memory
          if (pdfViewer.documentPath?.startsWith('blob:')) {
            URL.revokeObjectURL(pdfViewer.documentPath);
          }
          setPdfViewer({ isOpen: false });
        }}
      />
    </div>
  );
};

export default ChatPanel;
