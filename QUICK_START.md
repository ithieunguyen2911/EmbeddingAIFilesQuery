# 🚀 Quick Start - Project Management

## In 5 Minutes

### Step 1: Create a Project
```typescript
const chatEngine = new ChatEngine();
const project = chatEngine.createProject("My Project");
```

### Step 2: Upload Documents
```typescript
// Select a file
const file = document.getElementById('fileInput').files[0];

// Process (auto-saves to IndexedDB)
await chatEngine.processFile(file);
```

### Step 3: Query Documents
```typescript
const response = await chatEngine.query("Your question here");
console.log(response.answer);
```

### Step 4: Add More Files (Same Project)
```typescript
const file2 = ...; // Another file
await chatEngine.processFile(file2);

// Query now searches both files
const response = await chatEngine.query("Another question");
```

## Common Tasks

### Switch Projects
```typescript
const projects = chatEngine.getAllProjects();
chatEngine.setCurrentProject(projects[0].id);
```

### Check Storage Usage
```typescript
const stats = await chatEngine.getProjectStorageStats();
console.log(`${stats.filesCount} files, ${stats.totalSize} bytes`);
```

### Delete a File
```typescript
await chatEngine.removeProjectFile(projectId, fileHash);
```

### Delete a Project (& all data)
```typescript
await chatEngine.deleteProject(projectId);
```

## UI Component

Add to your React component:

```tsx
import ProjectManagerUI from './components/ProjectManagerUI';

export function App() {
  const chatEngineRef = useRef(new ChatEngine());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  return (
    <div className="flex">
      {/* Main content */}
      <div className="flex-1">
        {/* Your chat interface */}
      </div>
      
      {/* Project sidebar */}
      <ProjectManagerUI
        chatEngine={chatEngineRef.current}
        onProjectChange={setCurrentProjectId}
        currentProjectId={currentProjectId}
      />
    </div>
  );
}
```

## File Processing Flow

1. **Upload** → File selected
2. **Hash** → Calculate unique file hash
3. **Check Storage** → Look in IndexedDB
4. **Check Cache** → Look in localStorage
5. **Process** → Extract text from PDF/file (if not cached)
6. **Embed** → Call Gemini API (if not cached)
7. **Save** → Store in IndexedDB + localStorage
8. **Index** → Add to vector store

## Storage Details

### Where data is stored

| Data | Location | Persistence |
|------|----------|-------------|
| Project list | localStorage | ✅ Yes |
| Vector embeddings | IndexedDB | ✅ Yes |
| Embedding cache | localStorage | ✅ Yes |

### Capacity

- **IndexedDB**: 50-1000MB (browser dependent)
- **localStorage**: 5-10MB
- Good for: 10-50 PDFs

## Tips & Tricks

### 1. Organize by Department/Topic
```typescript
chatEngine.createProject("HR Policies");
chatEngine.createProject("Financial Reports");
chatEngine.createProject("Technical Docs");
```

### 2. Use Descriptions
```typescript
chatEngine.createProject(
  "Q3 Planning",
  "All files for Q3 planning meeting"
);
```

### 3. Bulk Upload
```typescript
for (const file of fileList) {
  if (!chatEngine.getCurrentProject()) {
    chatEngine.createProject('Bulk Upload');
  }
  await chatEngine.processFile(file);
  console.log(`Processed ${file.name}`);
}
```

### 4. Check Before Deleting
```typescript
const stats = await chatEngine.getProjectStorageStats();
if (confirm(`Delete ${stats.filesCount} files?`)) {
  await chatEngine.deleteProject(projectId);
}
```

## Troubleshooting

### Q: Files not loading after page refresh?
**A:** Check if project/file exists:
```typescript
const projects = chatEngine.getAllProjects();
if (projects.length > 0) {
  chatEngine.setCurrentProject(projects[0].id);
}
```

### Q: Query returns "no document context"?
**A:** Make sure project is selected:
```typescript
chatEngine.setCurrentProject(projectId); // Add this first
const response = await chatEngine.query("...");
```

### Q: Memory/Storage running out?
**A:** Delete old projects:
```typescript
const projects = chatEngine.getAllProjects();
projects.forEach(p => {
  if (p.name.includes('Old')) {
    chatEngine.deleteProject(p.id);
  }
});
```

### Q: API key issues?
**A:** Make sure `.env.local` has:
```
GEMINI_API_KEY=your_key_here
```

## What's Different from Before

| Before | Now |
|--------|-----|
| Single document at a time | Multiple projects |
| Lost after page refresh | Persists with IndexedDB |
| Re-embedded on reload | Cached & reused |
| No organization | Group by project |
| Manual caching | Automatic caching |

## Full Documentation

See:
- `PROJECT_FEATURES_GUIDE.md` - Detailed features
- `CHANGES.md` - Complete changelog
- `src/services/ProjectManager.ts` - Implementation

## Next Steps

1. ✅ Create first project
2. ✅ Upload test document
3. ✅ Try a query
4. ✅ Create second project
5. ✅ Compare results across projects
6. ✅ Check IndexedDB via DevTools
