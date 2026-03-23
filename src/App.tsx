import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Send, 
  Trash2, 
  Loader2, 
  MessageSquare, 
  FileCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { ChatEngine } from './services/ChatEngine';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const chatEngineRef = useRef<ChatEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEngineRef.current = new ChatEngine();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setCurrentFile(file);
    
    try {
      if (chatEngineRef.current) {
        chatEngineRef.current.clearContext();
        await chatEngineRef.current.processFile(file);
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Successfully processed **${file.name}**. I've also captured page images, so I can "see" charts and diagrams!`,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process the file. Please make sure it is a valid text or PDF file.');
      setCurrentFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
    }
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing || !currentFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      if (chatEngineRef.current) {
        const result = await chatEngineRef.current.query(input);
        
        // Extract unique images from sources
        const uniqueImages = Array.from(new Set(result.sources.map(s => s.image).filter(Boolean))) as string[];

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
          images: uniqueImages
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error querying:', err);
      setError('Something went wrong while querying the document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentFile(null);
    if (chatEngineRef.current) {
      chatEngineRef.current.clearContext();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1A1A1A] rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Gemini File Query</h1>
            <p className="text-xs text-[#666666] font-medium uppercase tracking-widest">Powered by Gemini Embeddings 2</p>
          </div>
        </div>
        
        {currentFile && (
          <button 
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#FF4444] hover:bg-[#FFF0F0] rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Session
          </button>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar / File Upload */}
        <div className={cn(
          "w-80 border-r border-[#E5E5E5] bg-[#F9F9F9] p-6 flex flex-col gap-6 transition-all duration-300",
          !currentFile ? "w-full items-center justify-center bg-white" : "hidden md:flex"
        )}>
          {!currentFile ? (
            <div className="max-w-md w-full text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-light tracking-tight text-[#1A1A1A]">
                  Upload a document to <span className="italic font-serif">begin</span>
                </h2>
                <p className="text-[#666666]">
                  Interact with your PDFs, Markdown, and Text files using the power of Gemini RAG.
                </p>
              </div>

              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer group",
                  isDragActive ? "border-[#1A1A1A] bg-[#F5F5F5]" : "border-[#E5E5E5] hover:border-[#1A1A1A] hover:bg-white"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-[#F5F5F5] rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-[#1A1A1A]" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Drop your file here</p>
                    <p className="text-sm text-[#666666]">PDF, TXT, MD, CSV (Max 10MB)</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-[#FFF0F0] text-[#FF4444] rounded-2xl text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#999999]">Active Document</h3>
                <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl flex items-center gap-3 shadow-sm">
                  <div className="p-2 bg-[#F5F5F5] rounded-lg">
                    <FileCheck className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{currentFile.name}</p>
                    <p className="text-xs text-[#666666]">{(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#999999]">Capabilities</h3>
                <ul className="space-y-3">
                  {['Semantic Search', 'Contextual Q&A', 'Summarization', 'Data Extraction'].map((cap) => (
                    <li key={cap} className="flex items-center gap-3 text-sm text-[#444444]">
                      <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-2xl text-white space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Status</p>
                <p className="text-sm font-medium">Ready for queries</p>
              </div>
            </>
          )}
        </div>

        {/* Chat Area */}
        {currentFile && (
          <div className="flex-1 flex flex-col bg-white relative">
            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-5 py-3 rounded-2xl text-sm leading-relaxed",
                      m.role === 'user' 
                        ? "bg-[#1A1A1A] text-white rounded-tr-none" 
                        : "bg-[#F5F5F5] text-[#1A1A1A] rounded-tl-none border border-[#E5E5E5]"
                    )}>
                      <div className="prose prose-sm max-w-none prose-headings:text-[#1A1A1A] prose-a:text-[#1A1A1A]">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      
                      {m.images && m.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          {m.images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img 
                                src={img} 
                                alt={`Source page ${idx + 1}`} 
                                className="rounded-lg border border-[#E5E5E5] max-h-64 object-contain bg-white"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                Source Page
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[#999999] mt-1 uppercase tracking-tighter">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-[#999999]"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-widest">Gemini is thinking...</span>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-[#E5E5E5] bg-white">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your document..."
                  disabled={isProcessing}
                  className="w-full pl-6 pr-14 py-4 bg-[#F9F9F9] border border-[#E5E5E5] rounded-full text-sm focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="absolute right-2 p-2.5 bg-[#1A1A1A] text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay for Initial Upload */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#F5F5F5] border-t-[#1A1A1A] rounded-full animate-spin" />
              <FileText className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#1A1A1A]" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-medium tracking-tight">Analyzing Document</h3>
              <p className="text-sm text-[#666666]">Generating embeddings with Gemini Embedding 2...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
