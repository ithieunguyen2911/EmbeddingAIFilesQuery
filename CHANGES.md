# 📋 Thay đổi & Tính năng mới

## Version: Project Management & Vector Storage System

### 🎯 Tính năng chính được thêm

#### 1. **Project Management System**
- Tạo/quản lý multiple projects
- Group tài liệu theo projects
- Mỗi project có metadata (tên, mô tả, thời gian tạo)
- Persistent storage in localStorage

**Lợi ích:**
- Tổ chức documents theo dự án
- Quản lý multiple document sets
- Dễ dàng chuyển đổi giữa projects

#### 2. **Persistent Vector Storage**
- Lưu embeddings vào IndexedDB (browser's persistent storage)
- Tự động load vectors khi cần
- Không mất dữ liệu khi đóng browser

**Lợi ích:**
- ⚡ Faster loading after first process
- 💾 Offline document querying
- 📦 No need for server storage

#### 3. **Smart Caching Strategy**
```
Priority: IndexedDB (Persistence) > localStorage (Cache) > Generate new
```

### 📁 Cấu trúc thư mục mới

```
src/
├── services/
│   ├── ProjectManager.ts        ← NEW: Project management
│   ├── PersistenceService.ts    ← NEW: Vector persistence
│   ├── VectorStore.ts           ← UPDATED: Project support
│   ├── ChatEngine.ts            ← UPDATED: Integrated features
│   ├── CacheService.ts
│   ├── DocumentProcessor.ts
│   └── GeminiService.ts
├── components/
│   └── ProjectManagerUI.tsx      ← NEW: UI component for projects
└── ...
```

### 🔄 Luồng dữ liệu cập nhật

#### Trước (Single Document)
```
Upload → Process → Embed → Search → Query
```

#### Giờ (Multi-Project)
```
1. Select/Create Project
   ↓
2. Upload Files to Project
   ├─ Per file:
   │  ├─ Check Persistence (IndexedDB)
   │  ├─ Check Cache (localStorage)
   │  └─ Process if needed
   ↓
3. Query across all project files
   └─ Search in combined vectors
```

### 📝 API Changes

#### ChatEngine - Methods thêm mới

```typescript
// Project Management
createProject(name, description?): Project
getAllProjects(): Project[]
getProject(projectId): Project | undefined
getCurrentProject(): Project | null
setCurrentProject(projectId): boolean
updateProject(projectId, updates): boolean
deleteProject(projectId): Promise<boolean>

// File Management
getProjectFiles(projectId): ProjectFile[]
loadProjectFile(projectId, fileHash): Promise<boolean>
removeProjectFile(projectId, fileHash): Promise<boolean>

// Storage
getProjectStorageStats(): Promise<{filesCount, totalSize} | null>

// Existing methods (Updated)
processFile(file)                    ← Now requires project context
clearContext()                       ← Clears current project context
query(userQuery)                     ← Searches across project files
```

#### VectorStore - Methods thêm mới

```typescript
setCurrentProject(projectId): void
addEntries(entries, fileHash?): void
loadProjectFileEntries(projectId, fileHash, entries): void
getProjectFileEntries(projectId, fileHash): VectorEntry[]
getProjectEntries(projectId): VectorEntry[]
clearProjectFile(projectId, fileHash): void
clearProject(projectId): void
```

### 🗄️ Storage Structure

#### localStorage (Project Metadata)
```json
{
  "projects_metadata": {
    "projects": [
      {
        "id": "project_1711260000000_abc123",
        "name": "Department Files",
        "description": "Q&A sobre documentos del departamento",
        "files": [
          {
            "fileName": "doc1.pdf",
            "fileHash": "hash123",
            "uploadedAt": "2024-03-24T10:00:00Z",
            "fileSize": 2048576
          }
        ],
        "createdAt": "2024-03-24T10:00:00Z",
        "updatedAt": "2024-03-24T10:00:00Z"
      }
    ],
    "currentProjectId": "project_1711260000000_abc123"
  }
}
```

#### IndexedDB (Vector Embeddings)
```
Database: EmbeddingStorage
ObjectStore: vectors
Key Format: {projectId}_{fileHash}

Content:
{
  "id": "project_123_fileHash456",
  "projectId": "project_123",
  "fileHash": "fileHash456",
  "entries": [
    {
      "text": "chunk text...",
      "embedding": [0.1, 0.2, ...],
      "metadata": {
        "fileName": "doc.pdf",
        "fileHash": "fileHash456",
        "chunkIndex": 0,
        "pageNumber": 1,
        "image": "data:image/jpeg;base64,..."
      }
    },
    ...
  ],
  "savedAt": "2024-03-24T10:00:00Z"
}
```

### 🧪 Usage Example

```typescript
import { ChatEngine } from './services/ChatEngine';

const chatEngine = new ChatEngine();

// 1. Create project
const project = chatEngine.createProject(
  "Customer Docs",
  "Q&A for customer files"
);

// 2. Set as current
chatEngine.setCurrentProject(project.id);

// 3. Upload files
const file = document.getElementById('fileInput').files[0];
await chatEngine.processFile(file);

// 4. Query
const response = await chatEngine.query("What is the company policy?");
console.log(response.answer);
console.log(response.sources);

// 5. Manage project
const stats = await chatEngine.getProjectStorageStats();
console.log(`Storage: ${stats.filesCount} files, ${stats.totalSize} bytes`);

// 6. Switch projects
chatEngine.setCurrentProject(otherProjectId);

// 7. Cleanup
await chatEngine.deleteProject(projectId);
```

### ⚠️ Breaking Changes

1. **processFile() now requires project context**
   ```typescript
   // Before
   await chatEngine.processFile(file);
   
   // Now
   chatEngine.createProject("My Project");
   await chatEngine.processFile(file);
   ```

2. **VectorStore initialization unchanged, but behavior different**
   - Internal storage structure changed
   - Search now uses project-specific vectors

### 🚀 Performance Improvements

- ✅ Reuse embeddings across browser sessions
- ✅ Faster subsequent file loads (no re-embedding)
- ✅ Better memory management with project isolation
- ✅ Reduced API calls (cached embeddings)

### 📊 Storage Estimates

| Scenario | Size | Notes |
|----------|------|-------|
| Single PDF (500 pages) | ~5-10MB | 3KB per chunk × 1000+ chunks |
| 10 PDFs | ~50-100MB | Good for most browsers |
| 50 PDFs | ~250-500MB | May hit browser limits |

> IndexedDB limit: Usually 50MB - 1GB (varies by browser)
> Use export feature for backup if exceeding limits

### 🔒 Data Privacy

- All data stored locally (no server)
- Embeddings not shared with third parties
- Only Gemini API calls for embedding generation
- IndexedDB is isolated per domain

### 🐛 Debugging

```typescript
// Check all projects
const projects = chatEngine.getAllProjects();
console.log(projects);

// Check current project context
const current = chatEngine.getCurrentProject();
console.log(current);

// Check storage stats
const stats = await chatEngine.getProjectStorageStats();
console.log(stats);
```

### 📚 Related Files

- `PROJECT_FEATURES_GUIDE.md` - Detailed feature documentation
- `src/services/ProjectManager.ts` - Project management logic
- `src/services/PersistenceService.ts` - IndexedDB operations
- `src/components/ProjectManagerUI.tsx` - UI component
- `src/services/ChatEngine.ts` - Main integration

### ✅ Testing Checklist

- [ ] Create multiple projects
- [ ] Add files to different projects
- [ ] Switch between projects
- [ ] Query in different projects
- [ ] Delete projects and verify cleanup
- [ ] Check localStorage after page reload
- [ ] Check IndexedDB storage usage
- [ ] Test with large files (>50MB)
- [ ] Test offline functionality

### 🔮 Future Improvements

- Cloud synchronization
- Project sharing/collaboration
- Incremental vector updates
- Automatic backup/export
- Project templates
- Advanced search filters
- Vector compression
