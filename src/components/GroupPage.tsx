import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGroupContext } from '../context/GroupContext';
import { ChatEngine } from '../services/ChatEngine';
import { DocumentProcessor } from '../services/DocumentProcessor';
import { DocumentPersistenceService } from '../services/DocumentPersistenceService';
import { Document } from '../types/workspace';
import DocumentSidebar from './DocumentSidebar';
import ChatPanel from './ChatPanel';

export const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useGroupContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current group
  const currentGroup = state.groups.find(g => g.id === groupId);

  // Set current group in context
  useEffect(() => {
    if (groupId) {
      dispatch({ type: 'SET_CURRENT_GROUP', payload: groupId });
    }
  }, [groupId, dispatch]);

  // Restore embeddings for existing documents on mount/group change
  useEffect(() => {
    if (!currentGroup || currentGroup.documents.length === 0) return;

    const restoreEmbeddings = async () => {
      const chatEngine = ChatEngine.getInstance();

      // Ensure a project context exists
      const projects = chatEngine.getAllProjects();
      if (projects.length === 0) {
        chatEngine.createProject('Default Project', 'Default project for documents');
      } else if (!chatEngine.getCurrentProject()) {
        chatEngine.setCurrentProject(projects[0].id);
      }

      const projectId = chatEngine.getCurrentProject()?.id;
      if (!projectId) return;

      console.log(`🔄 Restoring embeddings for ${currentGroup.documents.length} document(s)...`);
      let restored = 0;

      for (const doc of currentGroup.documents) {
        const fileHash = doc.fileHash;
        if (!fileHash) continue;

        // Try loading vectors from IndexedDB cache
        const loaded = await chatEngine.loadProjectFile(projectId, fileHash);
        if (loaded) {
          console.log(`✅ Restored embeddings from cache: ${doc.name}`);
          restored++;
          continue;
        }

        // If vectors not in cache, try to re-process from persisted blob
        try {
          const persisted = await DocumentPersistenceService.getDocument(doc.id);
          if (persisted?.fileBlob) {
            console.log(`🔄 Re-processing persisted blob: ${doc.name}`);
            const file = new File([persisted.fileBlob], doc.name, { type: doc.fileType });
            await chatEngine.processFile(file);
            console.log(`✅ Re-processed and embedded: ${doc.name}`);
            restored++;
          } else {
            console.warn(`⚠️ No cached vectors or blob found for: ${doc.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to restore embeddings for ${doc.name}:`, error);
        }
      }

      console.log(`📊 Embeddings restored: ${restored}/${currentGroup.documents.length}`);
    };

    restoreEmbeddings();
  }, [currentGroup?.id, currentGroup?.documents.length]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!currentGroup || !files || files.length === 0) {
      console.error('No files or no group');
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`Starting upload of ${files.length} file(s)`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, file.name);

        try {
          // Extract content from file
          const { text: content } = await DocumentProcessor.extractContent(file);
          console.log(`Extracted content from ${file.name}:`, content.substring(0, 100) + '...');

          // Hash the file
          const fileHash = await DocumentProcessor.hashFile(file);
          console.log(`File hash for ${file.name}:`, fileHash);

          // Create document record
          const newDocument: Document = {
            id: `doc_${Date.now()}_${i}`,
            groupId: currentGroup.id,
            name: file.name,
            fileSize: file.size,
            fileHash,
            uploadedAt: new Date().toISOString(),
            fileType: file.type,
            metadata: {
              uploadedBy: 'user'
            }
          };

          // Add to group
          dispatch({
            type: 'ADD_DOCUMENT',
            payload: {
              groupId: currentGroup.id,
              document: newDocument
            }
          });
          console.log(`Document added to group:`, newDocument.name);

          // Persist document blob to IndexedDB for offline access
          try {
            console.log(`Persisting document blob to IndexedDB...`);
            await DocumentPersistenceService.saveDocument(
              newDocument.id,
              currentGroup.id,
              newDocument.name,
              file,
              {
                size: newDocument.fileSize,
                type: newDocument.fileType,
                uploadedAt: newDocument.uploadedAt,
                fileHash: newDocument.fileHash
              }
            );
            console.log(`Document blob persisted to IndexedDB:`, newDocument.name);
          } catch (persistError) {
            console.warn(`Failed to persist document blob to IndexedDB:`, persistError);
            // Don't throw - persistence is not critical to upload success
          }

          // Process with ChatEngine (embeddings) - this will save to cache
          console.log(`Processing with ChatEngine for embeddings...`);
          const chatEngine = ChatEngine.getInstance();
          await chatEngine.processFile(file);
          console.log(`ChatEngine processing complete for ${file.name}`);
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          throw fileError;
        }
      }
      console.log('All files uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch({
        type: 'SET_ERROR',
        payload: `Failed to upload file: ${errorMessage}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentGroup) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Group not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            title="Back to dashboard"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{currentGroup.name}</h1>
            {currentGroup.description && (
              <p className="text-sm text-slate-600">{currentGroup.description}</p>
            )}
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 hover:bg-slate-100 rounded transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Sidebar */}
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:flex w-72 border-r border-slate-200 bg-white overflow-hidden"
          >
            <DocumentSidebar
              documents={currentGroup.documents || []}
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
            />
          </motion.div>
        )}

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="lg:hidden absolute left-0 top-0 w-72 h-full bg-white border-r border-slate-200 z-50"
          >
            <DocumentSidebar
              documents={currentGroup.documents || []}
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
            />
          </motion.div>
        )}

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            groupId={currentGroup.id}
            documents={currentGroup.documents || []}
          />
        </div>
      </div>
    </div>
  );
};
