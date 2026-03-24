# 🧪 Testing Guide

## Unit Testing Examples

### Test ProjectManager

```typescript
import { ProjectManager } from '../services/ProjectManager';

describe('ProjectManager', () => {
  let manager: ProjectManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new ProjectManager();
  });

  test('should create a new project', () => {
    const project = manager.createProject('Test Project', 'Description');
    expect(project.name).toBe('Test Project');
    expect(project.id).toBeDefined();
  });

  test('should get all projects', () => {
    manager.createProject('Project 1');
    manager.createProject('Project 2');
    const projects = manager.getAllProjects();
    expect(projects).toHaveLength(2);
  });

  test('should add file to project', () => {
    const project = manager.createProject('Test');
    const file = {
      fileName: 'test.pdf',
      fileHash: 'hash123',
      uploadedAt: new Date(),
      fileSize: 1024,
    };
    manager.addFileToProject(project.id, file);
    const files = manager.getProjectFiles(project.id);
    expect(files).toHaveLength(1);
  });

  test('should remove file from project', () => {
    const project = manager.createProject('Test');
    const file = {
      fileName: 'test.pdf',
      fileHash: 'hash123',
      uploadedAt: new Date(),
      fileSize: 1024,
    };
    manager.addFileToProject(project.id, file);
    manager.removeFileFromProject(project.id, 'hash123');
    const files = manager.getProjectFiles(project.id);
    expect(files).toHaveLength(0);
  });

  test('should delete project', () => {
    const project = manager.createProject('Test');
    manager.deleteProject(project.id);
    const projects = manager.getAllProjects();
    expect(projects).toHaveLength(0);
  });

  test('should persist to localStorage', () => {
    const project = manager.createProject('Test', 'Description');
    const persist = JSON.parse(localStorage.getItem('projects_metadata') || '{}');
    expect(persist.projects).toBeDefined();
    expect(persist.projects[0].name).toBe('Test');
  });
});
```

### Test PersistenceService

```typescript
import { PersistenceService } from '../services/PersistenceService';
import { VectorEntry } from '../services/VectorStore';

describe('PersistenceService', () => {
  let service: PersistenceService;

  beforeEach(async () => {
    indexedDB.deleteDatabase('EmbeddingStorage');
    service = new PersistenceService();
    // Wait for DB init
    await new Promise(r => setTimeout(r, 100));
  });

  test('should save and load vectors', async () => {
    const entries: VectorEntry[] = [
      { text: 'test', embedding: [0.1, 0.2] },
    ];
    
    await service.saveVectors('proj1', 'file1', entries);
    const loaded = await service.loadVectors('proj1', 'file1');
    
    expect(loaded).toBeDefined();
    expect(loaded?.[0].text).toBe('test');
  });

  test('should return null for non-existent vectors', async () => {
    const loaded = await service.loadVectors('proj1', 'nonexistent');
    expect(loaded).toBeNull();
  });

  test('should get project storage stats', async () => {
    const entries: VectorEntry[] = [
      { text: 'test1', embedding: [0.1, 0.2] },
      { text: 'test2', embedding: [0.3, 0.4] },
    ];
    
    await service.saveVectors('proj1', 'file1', entries);
    const stats = await service.getProjectStorageStats('proj1');
    
    expect(stats.filesCount).toBe(1);
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  test('should delete vectors', async () => {
    const entries: VectorEntry[] = [
      { text: 'test', embedding: [0.1, 0.2] },
    ];
    
    await service.saveVectors('proj1', 'file1', entries);
    await service.deleteVectors('proj1', 'file1');
    const loaded = await service.loadVectors('proj1', 'file1');
    
    expect(loaded).toBeNull();
  });
});
```

### Test VectorStore

```typescript
import { VectorStore } from '../services/VectorStore';

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  test('should add entries for project', () => {
    store.setCurrentProject('proj1');
    store.addEntries(
      [{ text: 'test', embedding: [0.1, 0.2], metadata: {} }],
      'file1'
    );
    
    const entries = store.getProjectFileEntries('proj1', 'file1');
    expect(entries).toHaveLength(1);
  });

  test('should get all project entries', () => {
    store.setCurrentProject('proj1');
    store.addEntries([{ text: 'test1', embedding: [0.1], metadata: {} }], 'file1');
    store.addEntries([{ text: 'test2', embedding: [0.2], metadata: {} }], 'file2');
    
    const entries = store.getProjectEntries('proj1');
    expect(entries).toHaveLength(2);
  });

  test('should clear project file', () => {
    store.setCurrentProject('proj1');
    store.addEntries([{ text: 'test', embedding: [0.1], metadata: {} }], 'file1');
    store.clearProjectFile('proj1', 'file1');
    
    const entries = store.getProjectFileEntries('proj1', 'file1');
    expect(entries).toHaveLength(0);
  });

  test('should search across project vectors', () => {
    store.setCurrentProject('proj1');
    store.addEntries(
      [
        { text: 'hello world', embedding: [0.1, 0.2], metadata: {} },
        { text: 'goodbye world', embedding: [0.1, 0.3], metadata: {} },
      ],
      'file1'
    );
    
    const results = store.search([0.1, 0.21], 1);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('hello world');
  });
});
```

## Integration Testing

```typescript
import { ChatEngine } from '../services/ChatEngine';

describe('ChatEngine - Project Integration', () => {
  let engine: ChatEngine;

  beforeEach(async () => {
    localStorage.clear();
    indexedDB.deleteDatabase('EmbeddingStorage');
    engine = new ChatEngine();
    await new Promise(r => setTimeout(r, 100));
  });

  test('should create and manage projects', () => {
    const p1 = engine.createProject('Project 1');
    const p2 = engine.createProject('Project 2');
    
    const projects = engine.getAllProjects();
    expect(projects).toHaveLength(2);
  });

  test('should switch between projects', () => {
    const p1 = engine.createProject('P1');
    const p2 = engine.createProject('P2');
    
    engine.setCurrentProject(p1.id);
    expect(engine.getCurrentProject()?.name).toBe('P1');
    
    engine.setCurrentProject(p2.id);
    expect(engine.getCurrentProject()?.name).toBe('P2');
  });

  test('should require project for processFile', async () => {
    const mockFile = new File(['test'], 'test.txt');
    
    // Should throw without project
    expect(async () => {
      await engine.processFile(mockFile);
    }).rejects.toThrow();
  });

  test('should process file in project context', async () => {
    const project = engine.createProject('Test');
    engine.setCurrentProject(project.id);
    
    const mockFile = new File(['test content'], 'test.txt');
    await engine.processFile(mockFile);
    
    const files = engine.getProjectFiles(project.id);
    expect(files.length).toBeGreaterThan(0);
  });
});
```

## Manual Testing Checklist

### Project Management
- [ ] Create project with name only
- [ ] Create project with description
- [ ] View project list
- [ ] Update project name
- [ ] Update project description
- [ ] Switch between projects
- [ ] Delete project

### File Management
- [ ] Upload single file to project
- [ ] Upload multiple files to project
- [ ] View files in project
- [ ] Remove file from project
- [ ] Files indexed correctly for search

### Storage & Persistence
- [ ] Close browser → reopen → project list intact
- [ ] Close browser → reopen → can query documents
- [ ] Check localStorage has project metadata
- [ ] Check IndexedDB has vector data
- [ ] Storage stats accurate

### Querying
- [ ] Query single file in project
- [ ] Query multiple files in project
- [ ] Query after switching projects
- [ ] Query returns correct file names in sources
- [ ] Page numbers preserved
- [ ] Images included in results

### Edge Cases
- [ ] Create project without name → error
- [ ] Delete non-existent project → handle
- [ ] Process file without project → error
- [ ] Query without documents → graceful message
- [ ] Very large files (>50MB) → handle
- [ ] Special characters in file names → preserve

### Performance
- [ ] Processing first file: ~5-10 seconds
- [ ] Querying small project: <100ms
- [ ] Querying large project (50 files): <500ms
- [ ] Switching projects: instant
- [ ] Opening app with data: <1 second

## E2E Testing Example

```typescript
// Using Cypress or Playwright
describe('Project Management E2E', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearIndexedDB();
    cy.visit('/');
  });

  it('complete workflow', () => {
    // Create project
    cy.findByRole('button', { name: /create/i }).click();
    cy.findByPlaceholderText(/project name/i).type('My Project');
    cy.findByRole('button', { name: /create/i }).click();
    cy.contains('My Project').should('be.visible');

    // Upload file
    cy.findByTestId('file-input').attachFile('sample.pdf');
    cy.contains('Processing').should('be.visible');
    cy.contains('Processing', { timeout: 30000 }).should('not.exist');
    cy.contains('sample.pdf').should('be.visible');

    // Query
    cy.findByPlaceholderText(/ask a question/i).type('What is in this document?');
    cy.findByRole('button', { name: /send/i }).click();
    cy.contains(/i think|the document/i).should('be.visible');

    // Check storage
    cy.window().then(win => {
      const metadata = JSON.parse(
        win.localStorage.getItem('projects_metadata') || '{}'
      );
      expect(metadata.projects).toHaveLength(1);
      expect(metadata.projects[0].files).toHaveLength(1);
    });

    // Create second project
    cy.findByRole('button', { name: /create project/i }).click();
    cy.findByPlaceholderText(/project name/i).type('Project 2');
    cy.contains('Project 2').should('be.visible');

    // Verify separate storage
    cy.window().then(win => {
      const metadata = JSON.parse(
        win.localStorage.getItem('projects_metadata') || '{}'
      );
      expect(metadata.projects).toHaveLength(2);
      expect(metadata.projects[1].files).toHaveLength(0);
    });
  });
});
```

## Test Data

### Sample Files

1. **Short text file** (1KB)
   ```
   This is a sample document.
   It contains some text content.
   Used for testing file processing.
   ```

2. **Long document** (100KB+)
   - Multiple pages
   - Different formatting
   - Images and tables

3. **PDF file**
   - Multiple pages
   - Images
   - For testing PDF processing

## Debugging Tools

### Check localStorage
```javascript
// In browser console
JSON.parse(localStorage.getItem('projects_metadata'))
```

### Check IndexedDB
```javascript
// In DevTools → Application → IndexedDB → EmbeddingStorage
// View 'vectors' objectStore
```

### Check VectorStore state
```javascript
// In React component
console.log(chatEngine.getAllProjects());
console.log(chatEngine.getCurrentProject());
await chatEngine.getProjectStorageStats();
```

### Check service logs
```typescript
// Add to services
console.log('Processing:', file.name);
console.log('Saving vectors:', projectId, fileHash);
console.log('Query results:', results);
```

## Performance Testing

```typescript
// Measure processing time
console.time('processFile');
await chatEngine.processFile(file);
console.timeEnd('processFile');

// Measure query time
console.time('query');
const response = await chatEngine.query('test');
console.timeEnd('query');

// Check memory usage
console.memory.usedJSHeapSize
```

## Continuous Testing

### Before Deployment
1. Run all unit tests
2. Run integration tests
3. Manual smoke test complete workflow
4. Check storage persistence
5. Test with different file sizes
6. Verify no console errors

### Regression Testing
- Every time services are updated
- Every time storage structure changes
- Before releases
