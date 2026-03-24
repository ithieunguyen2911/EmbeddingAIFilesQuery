/**
 * Workspace & Group Management Types
 * Defines all TypeScript interfaces for the NotebookLM-style UI redesign
 */

export interface Document {
  id: string;
  groupId: string;
  name: string;
  fileSize: number;
  fileHash: string;
  uploadedAt: string;
  fileType: string;
  metadata?: {
    pages?: number;
    uploadedBy?: string;
    [key: string]: any;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documents: Document[];
  metadata?: {
    [key: string]: any;
  };
}

export interface GroupContextState {
  groups: Group[];
  currentGroupId: string | null;
  loading: boolean;
  error: string | null;
}

export type GroupAction =
  | { type: 'SET_GROUPS'; payload: Group[] }
  | { type: 'CREATE_GROUP'; payload: Group }
  | { type: 'UPDATE_GROUP'; payload: Group }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'SET_CURRENT_GROUP'; payload: string }
  | { type: 'ADD_DOCUMENT'; payload: { groupId: string; document: Document } }
  | { type: 'UPDATE_DOCUMENT'; payload: { groupId: string; document: Document } }
  | { type: 'DELETE_DOCUMENT'; payload: { groupId: string; documentId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface Citation {
  text: string;
  documentName: string;
  documentId: string;
  pageNumber: number;
  sectionTitle?: string;
  confidence: number;
}

export interface ChatResponse {
  answer: string;
  citations?: Citation[];
  sources?: string[];
  relatedQuestions?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'summary' | 'comparison' | 'explanation' | 'keypoints' | 'chat';
  };
  data?: ChatResponse; // Optional: full chat response with citations
}
