import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '../types/workspace';
import { ChatResponseDisplay } from './ChatResponseDisplay';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  onOpenPDF?: (documentId: string, pageNumber?: number) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLast, onOpenPDF }) => {
  const isAssistant = message.role === 'assistant';

  // Show ChatResponseDisplay if we have citations data
  if (isAssistant && message.data?.citations && message.data.citations.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <div className="flex gap-4 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div className="flex-1">
            <ChatResponseDisplay 
              response={message.data}
              onOpenPDF={onOpenPDF}
            />
          </div>
        </div>
        <div className="text-xs text-slate-400 pl-12">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>
    );
  }

  // Standard message display
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex gap-4 mb-4 ${isAssistant ? '' : 'justify-end'}`}
    >
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
      )}

      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isAssistant
            ? 'bg-slate-100 text-slate-900'
            : 'bg-blue-600 text-white'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Message type badge */}
        {message.metadata?.type && isAssistant && (
          <div className="mt-2 pt-2 border-t border-slate-300">
            <span className="text-xs font-medium text-slate-600 capitalize">
              📊 {message.metadata.type}
            </span>
          </div>
        )}

        <div className="text-xs text-slate-500 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">U</span>
        </div>
      )}
    </motion.div>
  );
};

export default MessageItem;
