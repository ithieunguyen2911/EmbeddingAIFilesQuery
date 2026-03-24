# Project Management & Vector Storage Features

## Overview

Hai tính năng mới đã được thêm vào project:

1. **Project Management** - Group tài liệu theo projects
2. **Persistent Vector Storage** - Lưu vector embeddings vào IndexedDB

## Architecture

### New Services

#### 1. ProjectManager.ts
Quản lý projects và grouping documents.

```typescript
// Cấu trúc Project
interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];          // Danh sách files trong project
  createdAt: Date;
  updatedAt: Date;
}

// Cấu trúc ProjectFile
interface ProjectFile {
  fileName: string;
  fileHash: string;              // Hash của file để tracking
  uploadedAt: Date;
  fileSize: number;
}
```

**Capabilities:**
- ✅ Tạo và quản lý projects
- ✅ Thêm/xóa files từ projects
- ✅ Persistent storage (localStorage)
- ✅ Metadata tracking

#### 2. PersistenceService.ts
Lưu vector embeddings vào IndexedDB (browser's persistent storage).

```typescript
// Storage Structure
// Database: EmbeddingStorage
// ObjectStore: vectors
// Key: ${projectId}_${fileHash}
```

**Capabilities:**
- ✅ Lưu embeddings vào IndexedDB
- ✅ Load embeddings từ bộ nhớ
- ✅ Export vectors as JSON
- ✅ Storage statistics

#### 3. Updated VectorStore.ts
Extended để support project-based storage.

**New Methods:**
- `setCurrentProject(projectId)` - Set project context
- `addEntries(entries, fileHash)` - Add entries for a file
- `getProjectFileEntries(projectId, fileHash)` - Get file-specific entries
- `getProjectEntries(projectId)` - Get all project entries
- `clearProjectFile(projectId, fileHash)` - Clear specific file
- `clearProject(projectId)` - Clear entire project

#### 4. Extended ChatEngine.ts
Fully integrated project management.

## Usage Examples

### 1. Tạo Project và Upload Files

```typescript
const chatEngine = new ChatEngine();

// Tạo project mới
const project = chatEngine.createProject(
  "Department Files",
  "Quản lý documents của phòng ban"
);

// Set project hiện tại
chatEngine.setCurrentProject(project.id);

// Upload file
const file = ... // File từ user
await chatEngine.processFile(file);
```

### 2. Quản lý Multiple Projects

```typescript
// Get all projects
const projects = chatEngine.getAllProjects();

// Switch to different project
chatEngine.setCurrentProject(projects[0].id);

// Get current project
const current = chatEngine.getCurrentProject();
console.log(`Working on: ${current.name}`);

// Get all files trong project
const files = chatEngine.getProjectFiles(project.id);
```

### 3. Load/Remove Files

```typescript
// Load a specific file từ project
const loaded = await chatEngine.loadProjectFile(projectId, fileHash);

// Remove file từ project
await chatEngine.removeProjectFile(projectId, fileHash);

// Get storage stats
const stats = await chatEngine.getProjectStorageStats();
console.log(`Files: ${stats.filesCount}, Size: ${stats.totalSize} bytes`);
```

### 4. Query Across Project

```typescript
// Tất cả embeddings của project được load
const response = await chatEngine.query("Hãy giải thích...");

console.log(response.answer);
console.log(response.sources); // Từ all files trong project
```

### 5. Delete Project & Cleanup

```typescript
// Xóa project (cũng xóa all vectors)
await chatEngine.deleteProject(projectId);
```

## Data Flow

### Processing New File in Project

```
User uploads file
    ↓
Calculate file hash
    ↓
Check IndexedDB (persistence)
    ├─ Found → Load vectors → Done
    └─ Not found
        ↓
        Check localStorage (cache)
        ├─ Found → Save to IndexedDB
        └─ Not found
            ↓
            Process file (extract text)
            ↓
            Generate embeddings (Gemini)
            ↓
            Save to IndexedDB
            ↓
            Save to localStorage cache
            ↓
            Add to project metadata
```

## Storage Locations

### 1. Project Metadata
- **Location:** localStorage
- **Key:** `projects_metadata`
- **Content:** Project list, file list, timestamps
- **Persistence:** Across browser sessions

### 2. Vector Embeddings
- **Location:** IndexedDB (EmbeddingStorage)
- **Store:** vectors
- **Key:** `{projectId}_{fileHash}`
- **Content:** Full vector embeddings
- **Persistence:** Across browser sessions

### 3. Embedding Cache
- **Location:** localStorage (from CacheService)
- **Purpose:** Fast reload of embeddings
- **Content:** Cached embeddings by file hash

## Performance Considerations

### Memory Usage
- Embeddings trong memory (quick search)
- Large projects: Consider loading files on-demand

### Storage Limits
- IndexedDB: Typically 50MB+ (varies by browser)
- Calculate with: Embedding size = 768 floats × 4 bytes = 3KB per chunk
- Example: 10 PDFs × 1000 chunks = 30MB

## Troubleshooting

### Lost Data After Browser Clear
- Clear browser cache/cookies sẽ xóa IndexedDB
- Suggest: Periodic export of vectors

### Performance Drops with Large Projects
- Clear unused projects
- Use `getProjectStorageStats()` để check usage
- Consider archiving old projects

## Future Enhancements

- [ ] Export projects as backup
- [ ] Import projects from backup
- [ ] Per-file search (not whole project)
- [ ] Project collaboration
- [ ] Automatic cleanup of old vectors
- [ ] Cloud synchronization

## API Reference

### ProjectManager
```typescript
createProject(name, description): Project
getAllProjects(): Project[]
getProject(id): Project | undefined
getCurrentProject(): Project | null
setCurrentProject(id): boolean
deleteProject(id): boolean
updateProject(id, updates): boolean
addFileToProject(id, file): boolean
removeFileFromProject(id, hash): boolean
getProjectFiles(id): ProjectFile[]
```

### PersistenceService
```typescript
saveVectors(projectId, fileHash, entries): Promise<boolean>
loadVectors(projectId, fileHash): Promise<VectorEntry[] | null>
getProjectVectors(projectId): Promise<Map<string, VectorEntry[]>>
deleteVectors(projectId, fileHash): Promise<boolean>
deleteProjectVectors(projectId): Promise<boolean>
getProjectStorageStats(projectId): Promise<{filesCount, totalSize}>
exportProjectVectors(projectId): Promise<string>
```

### ChatEngine (New Project Methods)
```typescript
createProject(name, description): Project
getAllProjects(): Project[]
getProject(id): Project | undefined
getCurrentProject(): Project | null
setCurrentProject(id): boolean
updateProject(id, updates): boolean
deleteProject(id): Promise<boolean>
getProjectFiles(id): ProjectFile[]
loadProjectFile(projectId, fileHash): Promise<boolean>
removeProjectFile(projectId, fileHash): Promise<boolean>
getProjectStorageStats(): Promise<{filesCount, totalSize} | null>
```
