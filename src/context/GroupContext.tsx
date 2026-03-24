import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { Group, GroupContextState, GroupAction, Document } from '../types/workspace';
import { DocumentPersistenceService } from '../services/DocumentPersistenceService';

const initialState: GroupContextState = {
  groups: [],
  currentGroupId: null,
  loading: false,
  error: null,
};

// Reducer function for managing group state
const groupReducer = (state: GroupContextState, action: GroupAction): GroupContextState => {
  switch (action.type) {
    case 'SET_GROUPS':
      return { ...state, groups: action.payload };

    case 'CREATE_GROUP':
      return {
        ...state,
        groups: [...state.groups, action.payload],
        currentGroupId: action.payload.id
      };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(g => g.id === action.payload.id ? action.payload : g)
      };

    case 'DELETE_GROUP':
      const remaining = state.groups.filter(g => g.id !== action.payload);
      return {
        ...state,
        groups: remaining,
        currentGroupId: state.currentGroupId === action.payload
          ? (remaining.length > 0 ? remaining[0].id : null)
          : state.currentGroupId
      };

    case 'SET_CURRENT_GROUP':
      return { ...state, currentGroupId: action.payload };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.payload.groupId
            ? { ...g, documents: [...g.documents, action.payload.document] }
            : g
        )
      };

    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.payload.groupId
            ? {
                ...g,
                documents: g.documents.map(d =>
                  d.id === action.payload.document.id ? action.payload.document : d
                )
              }
            : g
        )
      };

    case 'DELETE_DOCUMENT':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.payload.groupId
            ? { ...g, documents: g.documents.filter(d => d.id !== action.payload.documentId) }
            : g
        )
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
};

// Context creation
export const GroupContext = createContext<{
  state: GroupContextState;
  dispatch: React.Dispatch<GroupAction>;
}>({
  state: initialState,
  dispatch: () => {}
});

// Provider component
interface GroupProviderProps {
  children: ReactNode;
}

// Track document IDs for detecting deletions
let previousDocumentIds: Map<string, Set<string>> = new Map();

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(groupReducer, initialState);

  // Initialize DocumentPersistenceService
  useEffect(() => {
    const initializePersistence = async () => {
      try {
        await DocumentPersistenceService.init();
        console.log('DocumentPersistenceService initialized');
      } catch (error) {
        console.error('Failed to initialize DocumentPersistenceService:', error);
      }
    };

    initializePersistence();
  }, []);

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const savedGroups = localStorage.getItem('workspace_groups');
        console.log('Loading groups from localStorage:', savedGroups);

        if (savedGroups) {
          let parsed: Group[] = JSON.parse(savedGroups);
          console.log('Parsed groups from localStorage:', parsed);
          
          // Restore persisted documents into groups
          console.log('Restoring persisted documents from IndexedDB...');
          for (let group of parsed) {
            try {
              const persistedDocs = await DocumentPersistenceService.getGroupDocuments(group.id);
              console.log(`Found ${persistedDocs.length} persisted documents for group ${group.id}`);
              
              if (persistedDocs.length > 0) {
                // Convert PersistedDocument to Document (strip out blobs, keep metadata)
                const docIds = new Set(group.documents.map(d => d.id));
                const restoredDocs: Document[] = persistedDocs
                  .filter(pd => !docIds.has(pd.id))
                  .map(pd => ({
                    id: pd.id,
                    groupId: pd.groupId,
                    name: pd.name,
                    fileSize: pd.fileSize,
                    fileHash: pd.fileHash,
                    uploadedAt: pd.uploadedAt,
                    fileType: pd.fileType,
                    metadata: pd.metadata
                  }));
                
                group.documents = [...group.documents, ...restoredDocs];
                console.log(`Group ${group.id} now has ${group.documents.length} documents (including ${restoredDocs.length} restored)`);
              }
            } catch (error) {
              console.error(`Error restoring documents for group ${group.id}:`, error);
            }
          }
          
          dispatch({ type: 'SET_GROUPS', payload: parsed });

          // Auto-load last opened group
          const lastGroupId = localStorage.getItem('last_group_id');
          if (lastGroupId && parsed.some(g => g.id === lastGroupId)) {
            dispatch({ type: 'SET_CURRENT_GROUP', payload: lastGroupId });
          } else if (parsed.length > 0) {
            dispatch({ type: 'SET_CURRENT_GROUP', payload: parsed[0].id });
          }
        }
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Failed to load groups:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load groups' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadGroups();
  }, []);

  // Persist groups to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('workspace_groups', JSON.stringify(state.groups));
    } catch (error) {
      console.error('Failed to save groups:', error);
    }
  }, [state.groups]);

  // Persist current group ID
  useEffect(() => {
    if (state.currentGroupId) {
      try {
        localStorage.setItem('last_group_id', state.currentGroupId);
      } catch (error) {
        console.error('Failed to save current group ID:', error);
      }
    }
  }, [state.currentGroupId]);

  // Handle document deletion persistence
  useEffect(() => {
    const handleDocumentDeletions = async () => {
      try {
        for (const group of state.groups) {
          const currentDocIds = new Set(group.documents.map(d => d.id));
          const previousIds = previousDocumentIds.get(group.id) || new Set();

          // Find deleted documents
          for (const docId of previousIds) {
            if (!currentDocIds.has(docId)) {
              console.log(`Document deleted from group ${group.id}: ${docId}, removing from IndexedDB...`);
              try {
                await DocumentPersistenceService.deleteDocument(docId);
                console.log(`Document deleted from IndexedDB: ${docId}`);
              } catch (error) {
                console.error(`Failed to delete document ${docId} from IndexedDB:`, error);
              }
            }
          }

          // Update tracking
          previousDocumentIds.set(group.id, currentDocIds);
        }
      } catch (error) {
        console.error('Error handling document deletions:', error);
      }
    };

    handleDocumentDeletions();
  }, [state.groups]);

  return (
    <GroupContext.Provider value={{ state, dispatch }}>
      {children}
    </GroupContext.Provider>
  );
};

// Custom hook for using the context
export const useGroupContext = () => {
  const context = React.useContext(GroupContext);
  if (!context) {
    throw new Error('useGroupContext must be used within GroupProvider');
  }
  return context;
};
