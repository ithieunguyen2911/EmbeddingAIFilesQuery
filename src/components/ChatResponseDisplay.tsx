import React, { useState } from "react";
import { ChevronDown, Copy, Highlighter, CheckCircle, AlertCircle, Lightbulb, BookOpen, TrendingUp, Zap, FileText, ExternalLink } from "lucide-react";
import { ChatResponse, Citation } from "../types/workspace";

interface ChatResponseDisplayProps {
  response: ChatResponse;
  onHighlight?: (text: string) => void;
  onOpenPDF?: (documentId: string, pageNumber?: number) => void;
}

/**
 * Highlight important phrases and keywords in text
 */
const highlightKeyPhrases = (text: string): React.ReactNode => {
  // Important keywords that should be highlighted
  const keywords = [
    'quan trọng',
    'chính',
    'key',
    'cần',
    'phải',
    'lưu ý',
    'đặc biệt',
    'tuyệt vời',
    'xuất sắc',
    'giải pháp',
    'vấn đề',
    'kết luận',
    'khuyến nghị',
    'kết quả',
    'hệ số',
    'tỷ lệ',
    'tối ưu',
    'tối đa',
    'tối thiểu'
  ];

  let result = text;
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  
  // Replace important phrases with highlighted span
  const parts = text.split(keywordRegex);
  
  return parts.map((part, idx) => {
    if (keywords.some(kw => kw.toLowerCase() === part.toLowerCase())) {
      return (
        <mark key={idx} className="bg-yellow-200 font-semibold px-1 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
};

/**
 * Extract bullet points from text
 */
const extractBulletPoints = (text: string): string[] => {
  return text
    .split('\n')
    .filter(line => line.match(/^[\s]*[-•*]\s+/))
    .map(line => line.replace(/^[\s]*[-•*]\s+/, '').trim());
};

/**
 * Render inline formatting: **bold**, *italic*, `code`, and keyword highlights
 */
const renderInlineFormatting = (text: string): React.ReactNode => {
  // Split by bold (**text**), italic (*text*), and code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={idx} className="italic text-slate-700">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-slate-200 text-pink-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return highlightKeyPhrases(part);
  });
};

/**
 * Render full markdown-like formatted answer with headings, lists, blockquotes, etc.
 */
const FormattedAnswer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { text: string; ordered: boolean; num?: string }[] = [];
  let blockquoteLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const isOrdered = listItems[0].ordered;
    const Tag = isOrdered ? 'ol' : 'ul';
    elements.push(
      <Tag key={`list-${elements.length}`} className={`my-2 space-y-1.5 ${isOrdered ? 'list-decimal' : 'list-none'} pl-4`}>
        {listItems.map((item, i) => (
          <li key={i} className="text-gray-800 leading-relaxed flex gap-2">
            {!isOrdered && <span className="text-blue-500 font-bold mt-0.5">•</span>}
            <span className="flex-1">{renderInlineFormatting(item.text)}</span>
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return;
    elements.push(
      <blockquote key={`bq-${elements.length}`} className="my-3 pl-4 border-l-4 border-blue-300 bg-blue-50 rounded-r-lg py-3 pr-3 italic text-gray-700">
        {blockquoteLines.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed">{renderInlineFormatting(line)}</p>
        ))}
      </blockquote>
    );
    blockquoteLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      flushBlockquote();
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      blockquoteLines.push(trimmed.slice(2));
      continue;
    } else {
      flushBlockquote();
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-slate-900 mt-4 mb-2 flex items-center gap-2 border-b border-slate-200 pb-1">
          {renderInlineFormatting(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-900 mt-4 mb-2">
          {renderInlineFormatting(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    // Ordered list (1. 2. 3.)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (orderedMatch) {
      listItems.push({ text: orderedMatch[2], ordered: true, num: orderedMatch[1] });
      continue;
    }

    // Unordered list (- or * or •)
    const unorderedMatch = trimmed.match(/^[-•*]\s+(.+)/);
    if (unorderedMatch) {
      listItems.push({ text: unorderedMatch[1], ordered: false });
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-gray-800 leading-relaxed my-1.5 text-justify">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();
  flushBlockquote();

  return <div className="space-y-1">{elements}</div>;
};

export const ChatResponseDisplay: React.FC<ChatResponseDisplayProps> = ({
  response,
  onHighlight,
  onOpenPDF
}) => {
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(
    new Set()
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleCitation = (index: number) => {
    const newSet = new Set(expandedCitations);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedCitations(newSet);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const bulletPoints = extractBulletPoints(response.answer);

  return (
    <div className="space-y-6">
      {/* Key Highlights Section */}
      {bulletPoints.length > 0 && (
        <div className="highlights-section bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900">💡 Những điểm chính:</h3>
          </div>
          <ul className="space-y-2">
            {bulletPoints.slice(0, 5).map((point, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-amber-800">
                <span className="text-amber-600 font-bold">•</span>
                <span>{highlightKeyPhrases(point)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Answer */}
      <div className="answer-section bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-5 shadow-sm border border-blue-200 hover:border-blue-300 transition">
        <div
          className="prose prose-sm max-w-none select-text"
          onMouseUp={() => {
            const selection = window.getSelection();
            if (selection && selection.toString()) {
              onHighlight?.(selection.toString());
            }
          }}
        >
          <FormattedAnswer text={response.answer} />
        </div>
      </div>

      {/* Citations Section */}
      {response.citations && response.citations.length > 0 && (
        <div className="citations-section bg-gradient-to-b from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">
              📚 Trích dẫn nguồn ({response.citations.length})
            </h3>
          </div>

          <div className="space-y-2">
            {response.citations.map((citation, idx) => (
              <CitationItem
                key={idx}
                citation={citation}
                index={idx}
                isExpanded={expandedCitations.has(idx)}
                isCopied={copiedIndex === idx}
                onToggle={() => toggleCitation(idx)}
                onCopy={() => copyToClipboard(citation.text, idx)}
                onOpenPDF={() => onOpenPDF?.(citation.documentId, citation.pageNumber)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sources Summary */}
      {response.sources && response.sources.length > 0 && (
        <div className="sources-section border-t pt-3">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-700">
              📄 Từ các tài liệu:
            </span>{" "}
            <span className="text-gray-700">
              {response.sources.join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* Related Questions */}
      {response.relatedQuestions && response.relatedQuestions.length > 0 && (
        <div className="related-questions-section pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            💡 Câu hỏi liên quan:
          </p>
          <div className="space-y-2">
            {response.relatedQuestions.map((q, idx) => (
              <button
                key={idx}
                className="w-full text-left text-sm p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-md hover:bg-purple-100 transition duration-200"
                onClick={() => {
                  // Trigger new query
                  const event = new CustomEvent("ask-question", {
                    detail: { question: q }
                  });
                  window.dispatchEvent(event);
                }}
              >
                <span className="text-purple-600">→</span> {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface CitationItemProps {
  citation: Citation;
  index: number;
  isExpanded: boolean;
  isCopied: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onOpenPDF: () => void;
}

const CitationItem: React.FC<CitationItemProps> = ({
  citation,
  index,
  isExpanded,
  isCopied,
  onToggle,
  onCopy,
  onOpenPDF
}) => {
  return (
    <div
      className="citation-item bg-white border-l-4 border-blue-400 rounded-r-lg p-4 cursor-pointer hover:shadow-md transition"
      onClick={onToggle}
    >
      {/* Citation Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
            <span className="text-sm font-semibold text-blue-900">
              Trang <span className="text-base text-blue-700">{citation.pageNumber}</span>
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-sm text-blue-700 font-medium">
              {citation.documentName}
            </span>
          </div>
          {citation.sectionTitle && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} className="text-blue-600" />
              <p className="text-xs text-blue-600 italic">
                {citation.sectionTitle}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
            {(citation.confidence * 100).toFixed(0)}%
          </span>
          <ChevronDown
            size={18}
            className={`text-blue-400 transition ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Citation Text (Expandable) */}
      {isExpanded && (
        <div className="mt-4 p-3 bg-blue-50 border-l-2 border-blue-300 rounded-lg space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="text-blue-600 font-semibold italic">"</span>
            {highlightKeyPhrases(citation.text)}
            <span className="text-blue-600 font-semibold italic">..."</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className={`text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition ${
                isCopied
                  ? "bg-green-200 text-green-700"
                  : "bg-blue-200 text-blue-700 hover:bg-blue-300"
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle size={14} /> Đã copy
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPDF();
              }}
              className="text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink size={14} /> Mở PDF
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded font-medium flex items-center gap-1.5 transition"
            >
              <Highlighter size={14} /> Highlight
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
